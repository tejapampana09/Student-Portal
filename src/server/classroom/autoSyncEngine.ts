import { google } from "googleapis";
import { getOAuth2Client } from "@/server/gmail/gmailService";
import { ClassroomCourse, ClassroomAssignment } from "@/server/classroom/classroomService";

export interface SyncedAcademicAssignment {
  id: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  title: string;
  description?: string;
  dueDate: string;
  dueTime: string;
  dueFormatted: string;
  alternateLink?: string;
  maxPoints?: number;
  type: "Assignment" | "Lab Task" | "Project" | "Quiz" | "CLA";
  status: "PENDING" | "COMPLETED";
  source: "GOOGLE_CLASSROOM" | "ACADEMIC_CURRICULUM";
}

export async function autoSyncAllClassroomAssignments(
  refreshToken: string | undefined,
  currentSemesterSubjects: Array<{ code: string; name?: string }> = []
): Promise<{ courses: ClassroomCourse[]; assignments: SyncedAcademicAssignment[] }> {
  let courses: ClassroomCourse[] = [];
  let assignments: SyncedAcademicAssignment[] = [];

  // 1. If Google account is connected, attempt live Google Classroom API sync
  if (refreshToken) {
    try {
      const oauth2Client = getOAuth2Client();
      oauth2Client.setCredentials({ refresh_token: refreshToken });
      const classroom = google.classroom({ version: "v1", auth: oauth2Client });

      const res = await classroom.courses.list({
        courseStates: ["ACTIVE"],
        pageSize: 50,
      });

      const rawCourses = res.data.courses || [];

      for (const c of rawCourses) {
        if (!c.id || !c.name) continue;

        // Smart matching to current semester subjects
        const cName = (c.name || "").toUpperCase();
        const cSection = (c.section || "").toUpperCase();

        const matchedSubject = currentSemesterSubjects.find((s) => {
          const sCode = (s.code || "").toUpperCase().replace(/\s+/g, "");
          const sName = (s.name || "").toUpperCase();
          return (
            (sCode && (cName.includes(sCode) || cSection.includes(sCode))) ||
            (sName && (cName.includes(sName.slice(0, 8)) || sName.includes(cName.slice(0, 8))))
          );
        });

        // Fetch coursework for this course
        let courseAssignments: ClassroomAssignment[] = [];
        try {
          const cwRes = await classroom.courses.courseWork.list({
            courseId: c.id,
            pageSize: 20,
          });

          for (const cw of cwRes.data.courseWork || []) {
            let dueFormatted = "No Due Date";
            let dueDateStr = new Date().toISOString().split("T")[0];
            let dueTimeStr = "23:59";

            if (cw.dueDate) {
              const { day, month, year } = cw.dueDate;
              dueFormatted = `${day}/${month}/${year}`;
              dueDateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              if (cw.dueTime) {
                const h = cw.dueTime.hours || 23;
                const m = String(cw.dueTime.minutes || 59).padStart(2, "0");
                dueFormatted += ` ${h}:${m}`;
                dueTimeStr = `${String(h).padStart(2, "0")}:${m}`;
              }
            }

            const isLab = (cw.title || "").toLowerCase().includes("lab");
            const isQuiz = (cw.title || "").toLowerCase().includes("quiz") || (cw.title || "").toLowerCase().includes("test");
            const isProject = (cw.title || "").toLowerCase().includes("project");

            const assignItem: SyncedAcademicAssignment = {
              id: cw.id || `gc-${Math.random()}`,
              courseId: c.id,
              courseName: c.name,
              courseCode: matchedSubject?.code || c.name.split(" ")[0] || "COURSE",
              title: cw.title || "Untitled Coursework",
              description: cw.description || "",
              dueDate: dueDateStr,
              dueTime: dueTimeStr,
              dueFormatted,
              alternateLink: cw.alternateLink || undefined,
              maxPoints: cw.maxPoints || 100,
              type: isLab ? "Lab Task" : isQuiz ? "Quiz" : isProject ? "Project" : "Assignment",
              status: "PENDING",
              source: "GOOGLE_CLASSROOM",
            };

            assignments.push(assignItem);
          }
        } catch (cwErr) {
          console.warn(`Could not fetch coursework for ${c.id}:`, cwErr);
        }

        courses.push({
          id: c.id,
          name: c.name,
          section: c.section || undefined,
          room: c.room || matchedSubject?.code || undefined,
          descriptionHeading: c.descriptionHeading || undefined,
          alternateLink: c.alternateLink || undefined,
          courseCode: matchedSubject?.code || c.name.split(" ")[0] || undefined,
          isCurrentSemester: true,
          assignments: [],
          announcements: [],
        });
      }
    } catch (err: any) {
      console.warn("Live Google Classroom API sync notice:", err?.message);
    }
  }

  // 2. Map all current semester registered subjects if not already in list
  if (currentSemesterSubjects.length > 0) {
    for (const sub of currentSemesterSubjects) {
      const alreadyExists = courses.some(
        (c) =>
          (c.courseCode && c.courseCode.toUpperCase() === sub.code.toUpperCase()) ||
          c.name.toUpperCase().includes(sub.code.toUpperCase())
      );

      if (!alreadyExists) {
        courses.push({
          id: `sub-${sub.code}`,
          name: sub.name ? `${sub.code} — ${sub.name}` : sub.code,
          section: "Current Semester Enrolled",
          room: "SRMAP Campus",
          descriptionHeading: `SRMAP Academic Course ${sub.code}`,
          alternateLink: "https://classroom.google.com",
          courseCode: sub.code,
          isCurrentSemester: true,
          assignments: [],
          announcements: [],
        });
      }
    }
  }

  return { courses, assignments };
}
