import { google } from "googleapis";
import { getOAuth2Client } from "@/server/gmail/gmailService";

export interface ClassroomCourse {
  id: string;
  name: string;
  section?: string;
  room?: string;
  descriptionHeading?: string;
  alternateLink?: string;
  courseCode?: string;
  isCurrentSemester: boolean;
  assignments: ClassroomAssignment[];
  announcements: ClassroomAnnouncement[];
}

export interface ClassroomAssignment {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  dueDate?: { year: number; month: number; day: number };
  dueTime?: { hours: number; minutes: number };
  dueFormatted?: string;
  maxPoints?: number;
  alternateLink?: string;
  state: "ASSIGNED" | "TURNED_IN" | "RETURNED" | "LATE" | "MISSING";
}

export interface ClassroomAnnouncement {
  id: string;
  courseId: string;
  text: string;
  creationTime: string;
  alternateLink?: string;
  materials?: Array<{ title: string; link: string }>;
}

export async function fetchCurrentSemesterClassrooms(
  refreshToken: string,
  currentSemesterSubjects: Array<{ code: string; name?: string }> = []
): Promise<ClassroomCourse[]> {
  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const classroom = google.classroom({ version: "v1", auth: oauth2Client });

    // 1. Fetch active courses
    const res = await classroom.courses.list({
      courseStates: ["ACTIVE"],
      pageSize: 30,
    });

    const rawCourses = res.data.courses || [];
    const normalizedSemesterCodes = (currentSemesterSubjects || []).map((s) =>
      s.code.replace(/\s+/g, "").toUpperCase()
    );

    const courses: ClassroomCourse[] = [];

    for (const c of rawCourses) {
      if (!c.id || !c.name) continue;

      // Extract possible course code from name/section (e.g., "CSE 301 - Data Structures")
      const courseNameUpper = c.name.toUpperCase();
      const sectionUpper = (c.section || "").toUpperCase();

      // Check if course belongs to the current semester
      const matchedSubject = currentSemesterSubjects.find((s) => {
        const cleanCode = s.code.replace(/\s+/g, "").toUpperCase();
        const codePattern = new RegExp(`\\b${cleanCode}\\b`, "i");
        const namePattern = s.name ? new RegExp(`\\b${s.name.slice(0, 8)}\\b`, "i") : null;

        return (
          codePattern.test(courseNameUpper) ||
          codePattern.test(sectionUpper) ||
          (namePattern && namePattern.test(courseNameUpper))
        );
      });

      // ONLY include courses matching this semester's subjects if subjects are provided
      const isCurrent = currentSemesterSubjects.length === 0 || !!matchedSubject;
      if (!isCurrent) continue;

      // 2. Fetch CourseWork / Assignments
      let assignments: ClassroomAssignment[] = [];
      try {
        const cwRes = await classroom.courses.courseWork.list({
          courseId: c.id,
          pageSize: 10,
        });

        assignments = (cwRes.data.courseWork || []).map((cw) => {
          let dueFormatted = "No Due Date";
          if (cw.dueDate) {
            const { day, month, year } = cw.dueDate;
            dueFormatted = `${day}/${month}/${year}`;
            if (cw.dueTime) {
              const h = cw.dueTime.hours || 23;
              const m = String(cw.dueTime.minutes || 59).padStart(2, "0");
              dueFormatted += ` ${h}:${m}`;
            }
          }

          return {
            id: cw.id || String(Math.random()),
            courseId: c.id!,
            title: cw.title || "Untitled Assignment",
            description: cw.description || "",
            dueDate: cw.dueDate ? { year: cw.dueDate.year || 2026, month: cw.dueDate.month || 1, day: cw.dueDate.day || 1 } : undefined,
            dueTime: cw.dueTime ? { hours: cw.dueTime.hours || 0, minutes: cw.dueTime.minutes || 0 } : undefined,
            dueFormatted,
            maxPoints: cw.maxPoints || 100,
            alternateLink: cw.alternateLink || undefined,
            state: "ASSIGNED",
          };
        });
      } catch (cwErr) {
        console.warn(`Could not fetch coursework for course ${c.id}:`, cwErr);
      }

      // 3. Fetch Announcements
      let announcements: ClassroomAnnouncement[] = [];
      try {
        const annRes = await classroom.courses.announcements.list({
          courseId: c.id,
          pageSize: 5,
        });

        announcements = (annRes.data.announcements || []).map((a) => ({
          id: a.id || String(Math.random()),
          courseId: c.id!,
          text: a.text || "",
          creationTime: a.creationTime || new Date().toISOString(),
          alternateLink: a.alternateLink || undefined,
          materials: (a.materials || []).map((m: any) => ({
            title: m.driveFile?.driveFile?.title || m.link?.title || "Class Material",
            link: m.driveFile?.driveFile?.alternateLink || m.link?.url || "#",
          })),
        }));
      } catch {}

      courses.push({
        id: c.id,
        name: c.name,
        section: c.section || undefined,
        room: c.room || matchedSubject?.code || undefined,
        descriptionHeading: c.descriptionHeading || undefined,
        alternateLink: c.alternateLink || undefined,
        courseCode: matchedSubject?.code || undefined,
        isCurrentSemester: true,
        assignments,
        announcements,
      });
    }

    return courses;
  } catch (error: any) {
    console.error("Error fetching Google Classroom courses:", error);
    throw error;
  }
}
