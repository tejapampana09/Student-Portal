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
    let isConnected = !!(user.gmail?.email || user.gmail?.refreshToken || user.gmail?.accessToken);
    let userEmail = user.gmail?.email || "";

    // 1. If Google account is connected, fetch LIVE Google Classrooms filtered to this semester
    if (user.gmail?.refreshToken) {
      try {
        const refreshToken = String(decryptData(String(user.gmail.refreshToken)));
        courses = await fetchCurrentSemesterClassrooms(refreshToken, activeSubjects);
      } catch (err: any) {
        console.warn("Google Classroom live fetch error:", err?.message);
      }
    }

    // 2. If Google Classroom has no course API items or returns empty, map current semester subjects cleanly
    if (courses.length === 0 && activeSubjects.length > 0) {
      courses = activeSubjects.map((sub, idx) => ({
        id: `subject-course-${sub.code}-${idx}`,
        name: sub.name ? `${sub.code} — ${sub.name}` : sub.code,
        section: "Current Semester Enrolled",
        room: `Campus Section`,
        descriptionHeading: `SRMAP Academic Course ${sub.code}`,
        alternateLink: "https://classroom.google.com",
        courseCode: sub.code,
        isCurrentSemester: true,
        assignments: [],
        announcements: [],
      }));
    }

    // Aggregate active assignments
    const allAssignments = courses.flatMap((c) =>
      (c.assignments || []).map((a) => ({
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
