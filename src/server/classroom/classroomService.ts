import { google } from "googleapis";

export function getGoogleOAuth2Client(redirectUri?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials are not configured in environment variables.");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

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
      "https://www.googleapis.com/auth/gmail.readonly",
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
  refreshToken: string
): Promise<{
  courses: ClassroomCourseItem[];
  allAssignments: ClassroomAssignment[];
  allAnnouncements: ClassroomAnnouncement[];
  allMaterials: ClassroomMaterialAttachment[];
}> {
  const oauth2Client = getGoogleOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const classroom = google.classroom({ version: "v1", auth: oauth2Client });

  const coursesRes = await classroom.courses.list({
    courseStates: ["ACTIVE"],
    pageSize: 30,
  });

  const rawCourses = coursesRes.data.courses || [];
  const courses: ClassroomCourseItem[] = [];
  const allAssignments: ClassroomAssignment[] = [];
  const allAnnouncements: ClassroomAnnouncement[] = [];
  const allMaterials: ClassroomMaterialAttachment[] = [];

  const now = new Date();

  for (const c of rawCourses) {
    if (!c.id || !c.name) continue;

    const courseAssignments: ClassroomAssignment[] = [];
    const courseAnnouncements: ClassroomAnnouncement[] = [];
    const courseMaterials: ClassroomMaterialAttachment[] = [];

    // 1. Fetch CourseWork Materials (Official lecture slides & PDFs)
    try {
      const matRes = await classroom.courses.courseWorkMaterials.list({
        courseId: c.id,
        courseWorkMaterialStates: ["PUBLISHED"],
        pageSize: 20,
      });

      for (const cwm of matRes.data.courseWorkMaterial || []) {
        const parsed = parseMaterialsList(cwm.materials || [], c.id, c.name, cwm.creationTime || now.toISOString());
        for (const item of parsed) {
          item.description = cwm.description || cwm.title || undefined;
          if (cwm.title && cwm.title !== item.title) {
            item.title = `${cwm.title} — ${item.title}`;
          }
          courseMaterials.push(item);
          allMaterials.push(item);
        }
      }
    } catch {}

    // 2. Fetch CourseWork (Assignments & Lab Tasks with attachments)
    try {
      const cwRes = await classroom.courses.courseWork.list({
        courseId: c.id,
        courseWorkStates: ["PUBLISHED"],
        pageSize: 20,
      });

      for (const cw of cwRes.data.courseWork || []) {
        if (!cw.id || !cw.title) continue;

        let dueFormatted = "No Due Date";
        let dueDateIso = "";
        let dueTimeIso = "23:59";
        let isOverdue = false;

        if (cw.dueDate) {
          const { day, month, year } = cw.dueDate;
          const h = cw.dueTime?.hours || 23;
          const m = String(cw.dueTime?.minutes || 59).padStart(2, "0");

          const dObj = new Date(year || now.getFullYear(), (month || 1) - 1, day || 1, h, parseInt(m));
          dueDateIso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          dueTimeIso = `${String(h).padStart(2, "0")}:${m}`;
          dueFormatted = dObj.toLocaleDateString("en-IN", { month: "short", day: "numeric" }) + ` ${dueTimeIso}`;

          if (dObj < now) {
            isOverdue = true;
          }
        }

        let submissionState: "TURNED_IN" | "RETURNED" | "ASSIGNED" | "SUBMITTED" = "ASSIGNED";
        let assignedGrade: number | undefined;

        try {
          const subRes = await classroom.courses.courseWork.studentSubmissions.list({
            courseId: c.id,
            courseWorkId: cw.id,
            userId: "me",
          });
          const firstSub = (subRes.data.studentSubmissions || [])[0];
          if (firstSub) {
            if (firstSub.state === "TURNED_IN") submissionState = "TURNED_IN";
            else if (firstSub.state === "RETURNED") submissionState = "RETURNED";
            assignedGrade = firstSub.assignedGrade || undefined;
          }
        } catch {}

        const cwAttachments = parseMaterialsList(cw.materials || [], c.id, c.name, cw.creationTime || now.toISOString());
        for (const item of cwAttachments) {
          courseMaterials.push(item);
          allMaterials.push(item);
        }

        const assignmentItem: ClassroomAssignment = {
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
          isOverdue: isOverdue && submissionState !== "TURNED_IN" && submissionState !== "RETURNED",
          attachments: cwAttachments,
        };

        courseAssignments.push(assignmentItem);
        allAssignments.push(assignmentItem);
      }
    } catch {}

    // 3. Fetch Announcements with attachments
    try {
      const annRes = await classroom.courses.announcements.list({
        courseId: c.id,
        announcementStates: ["PUBLISHED"],
        pageSize: 15,
      });

      for (const ann of annRes.data.announcements || []) {
        if (!ann.id || !ann.text) continue;

        const annAttachments = parseMaterialsList(ann.materials || [], c.id, c.name, ann.creationTime || now.toISOString());
        for (const item of annAttachments) {
          courseMaterials.push(item);
          allMaterials.push(item);
        }

        const annItem: ClassroomAnnouncement = {
          id: ann.id,
          courseId: c.id,
          courseName: c.name,
          text: ann.text,
          alternateLink: ann.alternateLink || undefined,
          creationTime: ann.creationTime || now.toISOString(),
          attachments: annAttachments,
        };
        courseAnnouncements.push(annItem);
        allAnnouncements.push(annItem);
      }
    } catch {}

    courses.push({
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
    });
  }

  return { courses, allAssignments, allAnnouncements, allMaterials };
}
