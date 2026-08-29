import { google } from "googleapis";
import crypto from "crypto";

export function getGoogleOAuth2Client(redirectUri?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials are not configured in environment variables.");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generates Google Classroom OAuth URL requesting strictly Classroom scopes.
 */
export function getGoogleAuthUrl(redirectUri: string, state: string) {
  const oauth2Client = getGoogleOAuth2Client(redirectUri);
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: [
      "https://www.googleapis.com/auth/classroom.courses.readonly",
      "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
      "https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly",
      "https://www.googleapis.com/auth/classroom.student-submissions.me.readonly",
      "https://www.googleapis.com/auth/classroom.announcements.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
    state,
  });
}

export interface ClassroomMaterialAttachment {
  id: string;
  title: string;
  type: "PDF" | "DriveFile" | "Link" | "YouTube" | "Form";
  alternateLink: string;
  thumbnailUrl?: string;
  courseId: string;
  courseName: string;
  description?: string;
  uploadedAt: string;
}

export interface ClassroomAssignment {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  description?: string;
  state: string;
  dueDate?: string;
  dueTime?: string;
  dueFormatted: string;
  maxPoints?: number;
  alternateLink?: string;
  submissionState?: "TURNED_IN" | "RETURNED" | "ASSIGNED" | "SUBMITTED";
  assignedGrade?: number;
  isOverdue?: boolean;
  attachments?: ClassroomMaterialAttachment[];
}

export interface ClassroomAnnouncement {
  id: string;
  courseId: string;
  courseName: string;
  text: string;
  alternateLink?: string;
  creationTime: string;
  attachments?: ClassroomMaterialAttachment[];
}

export interface ClassroomCourseItem {
  id: string;
  name: string;
  section?: string;
  room?: string;
  enrollmentCode?: string;
  alternateLink?: string;
  descriptionHeading?: string;
  assignments: ClassroomAssignment[];
  announcements: ClassroomAnnouncement[];
  materials: ClassroomMaterialAttachment[];
}

interface CacheEntry {
  data: {
    courses: ClassroomCourseItem[];
    allAssignments: ClassroomAssignment[];
    allAnnouncements: ClassroomAnnouncement[];
    allMaterials: ClassroomMaterialAttachment[];
  };
  expiresAt: number;
}
const classroomCache = new Map<string, CacheEntry>();

function parseMaterialsList(
  materialsRaw: any[],
  courseId: string,
  courseName: string,
  uploadedAt: string
): ClassroomMaterialAttachment[] {
  const result: ClassroomMaterialAttachment[] = [];

  for (const m of materialsRaw || []) {
    if (m.driveFile?.driveFile) {
      const df = m.driveFile.driveFile;
      const isPdf = (df.title || "").toLowerCase().endsWith(".pdf") || (df.alternateLink || "").includes("pdf");
      result.push({
        id: df.id || `df-${Math.random()}`,
        title: df.title || "Drive Material",
        type: isPdf ? "PDF" : "DriveFile",
        alternateLink: df.alternateLink || `https://drive.google.com/file/d/${df.id}/view`,
        thumbnailUrl: df.thumbnailUrl || undefined,
        courseId,
        courseName,
        uploadedAt,
      });
    } else if (m.link) {
      result.push({
        id: `link-${Math.random()}`,
        title: m.link.title || m.link.url || "Resource Link",
        type: "Link",
        alternateLink: m.link.url,
        courseId,
        courseName,
        uploadedAt,
      });
    } else if (m.youtubeVideo) {
      result.push({
        id: m.youtubeVideo.id || `yt-${Math.random()}`,
        title: m.youtubeVideo.title || "Lecture Video",
        type: "YouTube",
        alternateLink: m.youtubeVideo.alternateLink || `https://youtube.com/watch?v=${m.youtubeVideo.id}`,
        thumbnailUrl: m.youtubeVideo.thumbnailUrl || undefined,
        courseId,
        courseName,
        uploadedAt,
      });
    }
  }

  return result;
}

// Concurrency pool helper to prevent Google API rate-limiting
async function pMap<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      try {
        results[idx] = await fn(items[idx]);
      } catch (err) {
        results[idx] = null as unknown as R;
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function fetchFullGoogleClassroomData(
  refreshToken: string,
  bypassCache = false
): Promise<{
  courses: ClassroomCourseItem[];
  allAssignments: ClassroomAssignment[];
  allAnnouncements: ClassroomAnnouncement[];
  allMaterials: ClassroomMaterialAttachment[];
}> {
  const cacheKey = `cdata:${crypto.createHash("sha256").update(refreshToken).digest("hex")}`;
  const now = Date.now();

  if (!bypassCache) {
    const cached = classroomCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }
  }

  const oauth2Client = getGoogleOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const classroom = google.classroom({ version: "v1", auth: oauth2Client });

  const coursesRes = await classroom.courses.list({
    courseStates: ["ACTIVE"],
    pageSize: 20,
  });

  const rawCourses = coursesRes.data.courses || [];
  const nowDate = new Date();

  // Execute courses in controlled concurrent batches of 4 to prevent Google API rate limit throttling
  const processedCourses = await pMap(rawCourses, 4, async (c): Promise<ClassroomCourseItem | null> => {
    if (!c.id || !c.name) return null;

    const courseAssignments: ClassroomAssignment[] = [];
    const courseAnnouncements: ClassroomAnnouncement[] = [];
    const courseMaterials: ClassroomMaterialAttachment[] = [];

    // Parallel fetch materials, coursework, announcements, AND studentSubmissions batch wildcard in 1 batch
    const [matResSettled, cwResSettled, annResSettled, subResSettled] = await Promise.allSettled([
      classroom.courses.courseWorkMaterials.list({
        courseId: c.id,
        courseWorkMaterialStates: ["PUBLISHED"],
        pageSize: 20,
      }),
      classroom.courses.courseWork.list({
        courseId: c.id,
        courseWorkStates: ["PUBLISHED"],
        pageSize: 20,
      }),
      classroom.courses.announcements.list({
        courseId: c.id,
        announcementStates: ["PUBLISHED"],
        pageSize: 10,
      }),
      classroom.courses.courseWork.studentSubmissions.list({
        courseId: c.id,
        courseWorkId: "-",
        userId: "me",
      }),
    ]);

    // Submissions map
    const submissionsMap = new Map<string, { state: "TURNED_IN" | "RETURNED" | "ASSIGNED" | "SUBMITTED"; grade?: number }>();
    if (subResSettled.status === "fulfilled") {
      const subs = subResSettled.value.data.studentSubmissions || [];
      for (const s of subs) {
        if (!s.courseWorkId) continue;
        let sState: "TURNED_IN" | "RETURNED" | "ASSIGNED" | "SUBMITTED" = "ASSIGNED";
        if (s.state === "TURNED_IN") sState = "TURNED_IN";
        else if (s.state === "RETURNED") sState = "RETURNED";
        submissionsMap.set(s.courseWorkId, {
          state: sState,
          grade: s.assignedGrade || undefined,
        });
      }
    }

    // 1. Materials
    if (matResSettled.status === "fulfilled") {
      for (const cwm of matResSettled.value.data.courseWorkMaterial || []) {
        const parsed = parseMaterialsList(cwm.materials || [], c.id, c.name, cwm.creationTime || nowDate.toISOString());
        for (const item of parsed) {
          item.description = cwm.description || cwm.title || undefined;
          if (cwm.title && cwm.title !== item.title) {
            item.title = `${cwm.title} — ${item.title}`;
          }
          courseMaterials.push(item);
        }
      }
    }

    // 2. CourseWork
    if (cwResSettled.status === "fulfilled") {
      const cwList = cwResSettled.value.data.courseWork || [];
      for (const cw of cwList) {
        if (!cw.id || !cw.title) continue;

        let dueFormatted = "No Due Date";
        let dueDateIso = "";
        let dueTimeIso = "23:59";
        let isPastDue = false;

        if (cw.dueDate) {
          const { day, month, year } = cw.dueDate;
          const h = cw.dueTime?.hours || 23;
          const m = String(cw.dueTime?.minutes || 59).padStart(2, "0");

          const dObj = new Date(year || nowDate.getFullYear(), (month || 1) - 1, day || 1, h, parseInt(m));
          dueDateIso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          dueTimeIso = `${String(h).padStart(2, "0")}:${m}`;

          dueFormatted = dObj.toLocaleDateString("en-IN", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          if (dObj < nowDate) {
            isPastDue = true;
          }
        }

        const subInfo = submissionsMap.get(cw.id);
        const subState = subInfo?.state || "ASSIGNED";
        const isSubmitted = subState === "TURNED_IN" || subState === "RETURNED" || subState === "SUBMITTED";

        const assignmentMaterials = parseMaterialsList(cw.materials || [], c.id, c.name, cw.creationTime || nowDate.toISOString());

        courseAssignments.push({
          id: cw.id,
          courseId: c.id,
          courseName: c.name,
          title: cw.title,
          description: cw.description || undefined,
          state: cw.state || "PUBLISHED",
          dueDate: dueDateIso || undefined,
          dueTime: dueTimeIso || undefined,
          dueFormatted,
          maxPoints: cw.maxPoints || undefined,
          alternateLink: cw.alternateLink || undefined,
          submissionState: subState,
          assignedGrade: subInfo?.grade,
          isOverdue: isPastDue && !isSubmitted,
          attachments: assignmentMaterials,
        });
      }
    }

    // 3. Announcements
    if (annResSettled.status === "fulfilled") {
      const annList = annResSettled.value.data.announcements || [];
      for (const a of annList) {
        if (!a.id || !a.text) continue;
        const annMaterials = parseMaterialsList(a.materials || [], c.id, c.name, a.creationTime || nowDate.toISOString());
        courseAnnouncements.push({
          id: a.id,
          courseId: c.id,
          courseName: c.name,
          text: a.text,
          alternateLink: a.alternateLink || undefined,
          creationTime: a.creationTime || nowDate.toISOString(),
          attachments: annMaterials,
        });
      }
    }

    return {
      id: c.id,
      name: c.name,
      section: c.section || undefined,
      room: c.room || undefined,
      enrollmentCode: c.enrollmentCode || undefined,
      alternateLink: c.alternateLink || undefined,
      descriptionHeading: c.descriptionHeading || undefined,
      assignments: courseAssignments,
      announcements: courseAnnouncements,
      materials: courseMaterials,
    };
  });

  const validCourses = processedCourses.filter((c): c is ClassroomCourseItem => c !== null);

  const allAssignments: ClassroomAssignment[] = [];
  const allAnnouncements: ClassroomAnnouncement[] = [];
  const allMaterials: ClassroomMaterialAttachment[] = [];

  for (const c of validCourses) {
    allAssignments.push(...c.assignments);
    allAnnouncements.push(...c.announcements);
    allMaterials.push(...c.materials);
  }

  // Sort assignments: upcoming first, then overdue, then completed
  allAssignments.sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  // Sort announcements by newest first
  allAnnouncements.sort((a, b) => new Date(b.creationTime).getTime() - new Date(a.creationTime).getTime());

  // Sort materials by newest first
  allMaterials.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

  const data = {
    courses: validCourses,
    allAssignments,
    allAnnouncements,
    allMaterials,
  };

  classroomCache.set(cacheKey, { data, expiresAt: now + 15 * 60 * 1000 });
  return data;
}
