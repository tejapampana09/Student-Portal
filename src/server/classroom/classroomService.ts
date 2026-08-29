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
    pageSize: 30,
  });

  const rawCourses = coursesRes.data.courses || [];
  const nowDate = new Date();

  // Parallelize fetch across courses with Promise.allSettled
  const coursePromises = rawCourses.map(async (c): Promise<ClassroomCourseItem | null> => {
    if (!c.id || !c.name) return null;

    const courseAssignments: ClassroomAssignment[] = [];
    const courseAnnouncements: ClassroomAnnouncement[] = [];
    const courseMaterials: ClassroomMaterialAttachment[] = [];

    // Parallel fetch materials, coursework, announcements, AND studentSubmissions batch wildcard (courseWorkId: "-")
    const [matResSettled, cwResSettled, annResSettled, subResSettled] = await Promise.allSettled([
      classroom.courses.courseWorkMaterials.list({
        courseId: c.id,
        courseWorkMaterialStates: ["PUBLISHED"],
        pageSize: 25,
      }),
      classroom.courses.courseWork.list({
        courseId: c.id,
        courseWorkStates: ["PUBLISHED"],
        pageSize: 25,
      }),
      classroom.courses.announcements.list({
        courseId: c.id,
        announcementStates: ["PUBLISHED"],
        pageSize: 15,
      }),
      classroom.courses.courseWork.studentSubmissions.list({
        courseId: c.id,
        courseWorkId: "-", // Wildcard to fetch all submissions for this course in 1 batch
        userId: "me",
      }),
    ]);

    // Build submissions map for O(1) status lookup
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
          dueFormatted = dObj.toLocaleDateString("en-IN", { month: "short", day: "numeric" }) + ` ${dueTimeIso}`;

          if (dObj < nowDate) isPastDue = true;
        }

        const subInfo = submissionsMap.get(cw.id);
        const submissionState = subInfo?.state || "ASSIGNED";
        const assignedGrade = subInfo?.grade;

        // Accurate Overdue logic: ONLY overdue if NOT turned in and NOT returned!
        const isOverdue = isPastDue && submissionState !== "TURNED_IN" && submissionState !== "RETURNED";

        const cwAttachments = parseMaterialsList(cw.materials || [], c.id, c.name, cw.creationTime || nowDate.toISOString());
        for (const item of cwAttachments) {
          courseMaterials.push(item);
        }

        courseAssignments.push({
          id: cw.id,
          courseId: c.id,
          courseName: c.name,
          title: cw.title,
          description: cw.description || undefined,
          state: cw.state || "PUBLISHED",
          dueDate: dueDateIso,
          dueTime: dueTimeIso,
          dueFormatted,
          maxPoints: cw.maxPoints || undefined,
          alternateLink: cw.alternateLink || undefined,
          submissionState,
          assignedGrade,
          isOverdue,
          attachments: cwAttachments,
        });
      }
    }

    // 3. Announcements
    if (annResSettled.status === "fulfilled") {
      for (const ann of annResSettled.value.data.announcements || []) {
        if (!ann.id || !ann.text) continue;
        const annAttachments = parseMaterialsList(ann.materials || [], c.id, c.name, ann.creationTime || nowDate.toISOString());
        for (const item of annAttachments) {
          courseMaterials.push(item);
        }
        courseAnnouncements.push({
          id: ann.id,
          courseId: c.id,
          courseName: c.name,
          text: ann.text,
          alternateLink: ann.alternateLink || undefined,
          creationTime: ann.creationTime || nowDate.toISOString(),
          attachments: annAttachments,
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

  const settledCourses = await Promise.all(coursePromises);
  const courses = settledCourses.filter((c): c is ClassroomCourseItem => c !== null);

  const allAssignments: ClassroomAssignment[] = [];
  const allAnnouncements: ClassroomAnnouncement[] = [];
  const allMaterials: ClassroomMaterialAttachment[] = [];

  for (const c of courses) {
    allAssignments.push(...c.assignments);
    allAnnouncements.push(...c.announcements);
    allMaterials.push(...c.materials);
  }

  const payload = { courses, allAssignments, allAnnouncements, allMaterials };

  classroomCache.set(cacheKey, {
    data: payload,
    expiresAt: now + 5 * 60 * 1000,
  });

  return payload;
}
