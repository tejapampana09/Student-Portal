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
      "https://www.googleapis.com/auth/classroom.student-submissions.me.readonly",
      "https://www.googleapis.com/auth/classroom.announcements.readonly",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
    state,
  });
}

export interface ClassroomAssignment {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  description?: string;
  state: string; // PUBLISHED
  dueDate?: string;
  dueTime?: string;
  dueFormatted: string;
  maxPoints?: number;
  alternateLink?: string;
  submissionState?: "TURNED_IN" | "RETURNED" | "ASSIGNED" | "SUBMITTED";
  assignedGrade?: number;
  isOverdue?: boolean;
}

export interface ClassroomAnnouncement {
  id: string;
  courseId: string;
  courseName: string;
  text: string;
  alternateLink?: string;
  creationTime: string;
}

export interface ClassroomCourseItem {
  id: string;
  name: string;
  section?: string;
  room?: string;
  enrollmentCode?: string;
  alternateLink?: string;
  descriptionHeading?: string;
  teacherName?: string;
  assignments: ClassroomAssignment[];
  announcements: ClassroomAnnouncement[];
}

export async function fetchFullGoogleClassroomData(
  refreshToken: string
): Promise<{
  courses: ClassroomCourseItem[];
  allAssignments: ClassroomAssignment[];
  allAnnouncements: ClassroomAnnouncement[];
}> {
  const oauth2Client = getGoogleOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const classroom = google.classroom({ version: "v1", auth: oauth2Client });

  // 1. Fetch Active Courses
  const coursesRes = await classroom.courses.list({
    courseStates: ["ACTIVE"],
    pageSize: 30,
  });

  const rawCourses = coursesRes.data.courses || [];
  const courses: ClassroomCourseItem[] = [];
  const allAssignments: ClassroomAssignment[] = [];
  const allAnnouncements: ClassroomAnnouncement[] = [];

  const now = new Date();

  for (const c of rawCourses) {
    if (!c.id || !c.name) continue;

    const courseAssignments: ClassroomAssignment[] = [];
    const courseAnnouncements: ClassroomAnnouncement[] = [];

    // 2. Fetch CourseWork (Assignments) for each course
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

        // Try to fetch submission status
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
        };

        courseAssignments.push(assignmentItem);
        allAssignments.push(assignmentItem);
      }
    } catch (cwErr) {
      console.warn(`Could not fetch coursework for course ${c.id}:`, cwErr);
    }

    // 3. Fetch Announcements for each course
    try {
      const annRes = await classroom.courses.announcements.list({
        courseId: c.id,
        announcementStates: ["PUBLISHED"],
        pageSize: 10,
      });

      for (const ann of annRes.data.announcements || []) {
        if (!ann.id || !ann.text) continue;
        const annItem: ClassroomAnnouncement = {
          id: ann.id,
          courseId: c.id,
          courseName: c.name,
          text: ann.text,
          alternateLink: ann.alternateLink || undefined,
          creationTime: ann.creationTime || new Date().toISOString(),
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
    });
  }

  // Sort assignments: upcoming/overdue first
  allAssignments.sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  return { courses, allAssignments, allAnnouncements };
}
