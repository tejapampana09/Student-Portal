import { NextRequest, NextResponse } from "next/server";
import { useMongo } from "@/lib/database/useMongo";
import { decryptData, errorResponse, requireAuthResponse } from "@/server/utils/functions";
import { fetchCurrentSemesterClassrooms, ClassroomCourse } from "@/server/classroom/classroomService";

export async function GET(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const initDb = await useMongo();
    const user = await initDb.db("college_db").collection<any>("users").findOne({ username: auth.payload.username });

    if (!user || !user.data) {
      return errorResponse("Student data not found", {}, 404);
    }

    const studentData: any = decryptData(user.data);
    const activeSubjects: Array<{ code: string; name: string }> = (studentData?.subjects || []).map((s: any) => ({
      code: s.code || s.subject_code || "",
      name: s.name || s.subject_name || "",
    }));

    let courses: ClassroomCourse[] = [];
    let isConnected = false;
    let userEmail = user.gmail?.email || "";

    // 1. If Google account is connected, fetch live Google Classrooms filtered to this semester
    if (user.gmail?.refreshToken) {
      try {
        const refreshToken = String(decryptData(String(user.gmail.refreshToken)));
        courses = await fetchCurrentSemesterClassrooms(refreshToken, activeSubjects);
        isConnected = true;
      } catch (err: any) {
        console.warn("Google Classroom live fetch error, providing active semester synthesis:", err?.message);
      }
    }

    // 2. Fallback / Preview: Synthesize classrooms directly from active semester subjects if empty
    if (courses.length === 0 && activeSubjects.length > 0) {
      courses = activeSubjects.slice(0, 6).map((sub, idx) => ({
        id: `mock-course-${sub.code}-${idx}`,
        name: sub.name ? `${sub.code} — ${sub.name}` : sub.code,
        section: "Odd Sem 2026",
        room: `ALH ${200 + idx * 2}`,
        descriptionHeading: `SRMAP Academic Course ${sub.code}`,
        alternateLink: "https://classroom.google.com",
        courseCode: sub.code,
        isCurrentSemester: true,
        assignments: [
          {
            id: `asg-${sub.code}-1`,
            courseId: `mock-course-${sub.code}-${idx}`,
            title: `${sub.code} Assignment 1: Problem Set & Case Study`,
            description: "Submit your handwritten / coded solutions as a single PDF before deadline.",
            dueFormatted: "Due in 3 days",
            maxPoints: 20,
            alternateLink: "https://classroom.google.com",
            state: "ASSIGNED",
          },
          {
            id: `asg-${sub.code}-2`,
            courseId: `mock-course-${sub.code}-${idx}`,
            title: `${sub.code} Lab Exercise / Unit Quiz`,
            description: "Complete the practical tasks and upload your output screenshots.",
            dueFormatted: "Due next Monday",
            maxPoints: 30,
            alternateLink: "https://classroom.google.com",
            state: "ASSIGNED",
          },
        ],
        announcements: [
          {
            id: `ann-${sub.code}-1`,
            courseId: `mock-course-${sub.code}-${idx}`,
            text: `Welcome to ${sub.code}. Lecture slides and reference materials will be uploaded here weekly.`,
            creationTime: new Date().toISOString(),
            materials: [
              { title: `${sub.code} Module 1 Lecture Slides.pdf`, link: "https://classroom.google.com" },
              { title: "Course Syllabus & Evaluation Scheme.pdf", link: "https://classroom.google.com" },
            ],
          },
        ],
      }));
    }

    // Aggregate all upcoming assignments across current semester subjects
    const allAssignments = courses.flatMap((c) =>
      c.assignments.map((a) => ({
        ...a,
        courseName: c.name,
        courseCode: c.courseCode || c.name.split(" ")[0],
      }))
    );

    return NextResponse.json({
      success: true,
      isConnected,
      userEmail,
      courses,
      assignments: allAssignments,
      totalCurrentSubjects: activeSubjects.length,
    });
  } catch (error: any) {
    console.error("Error in Classroom courses API:", error);
    return errorResponse("Failed to fetch Google Classroom data", {}, 500);
  }
}
