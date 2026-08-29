import { NextRequest, NextResponse } from "next/server";
import { useMongo } from "@/lib/database/useMongo";
import { decryptData, errorResponse, requireAuthResponse } from "@/server/utils/functions";
import { fetchFullGoogleClassroomData } from "@/server/classroom/classroomService";

export async function GET(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const initDb = await useMongo();
    const user = await initDb.db("college_db").collection<any>("users").findOne({ username: auth.payload.username });

    const rawToken = user?.google?.refreshToken || user?.gmail?.refreshToken;
    const userEmail = user?.google?.email || user?.gmail?.email || "";

    if (!user || !rawToken) {
      return NextResponse.json({
        success: true,
        isConnected: false,
        userEmail: "",
        courses: [],
        allAssignments: [],
        allAnnouncements: [],
        allMaterials: [],
      });
    }

    const decrypted = decryptData(String(rawToken));
    const refreshToken = typeof decrypted === "string" ? decrypted : JSON.stringify(decrypted);

    let activeSubjects: Array<{ code: string; name: string }> = [];
    if (user.data) {
      try {
        const studentData: any = decryptData(user.data);
        activeSubjects = (studentData?.subjects || []).map((s: any) => ({
          code: (s.code || s.subject_code || "").trim(),
          name: (s.name || s.subject_name || "").trim(),
        }));
      } catch {}
    }

    const {
      courses: allCourses,
      allAssignments: rawAssignments,
      allAnnouncements: rawAnnouncements,
      allMaterials: rawMaterials,
    } = await fetchFullGoogleClassroomData(refreshToken);

    let semesterCourses = allCourses;
    if (activeSubjects.length > 0) {
      semesterCourses = allCourses.filter((c) => {
        const cTarget = `${c.name} ${c.section || ""} ${c.descriptionHeading || ""}`.toUpperCase();
        return activeSubjects.some((sub) => {
          const sCode = sub.code.toUpperCase().replace(/\s+/g, "");
          const sName = sub.name.toUpperCase();
          const cleanCode = sCode.replace(/[^\w]/g, "");

          return (
            (cleanCode.length >= 3 && cTarget.includes(cleanCode)) ||
            (sCode.length >= 3 && cTarget.includes(sCode)) ||
            (sName.length >= 5 && cTarget.includes(sName.slice(0, 10))) ||
            (sName.length >= 5 && sName.split(" ").some((word) => word.length > 4 && cTarget.includes(word)))
          );
        });
      });

      if (semesterCourses.length === 0) {
        semesterCourses = allCourses;
      }
    }

    const validCourseIds = new Set(semesterCourses.map((c) => c.id));
    const allAssignments = rawAssignments.filter((a) => validCourseIds.has(a.courseId));
    const allAnnouncements = rawAnnouncements.filter((ann) => validCourseIds.has(ann.courseId));
    const allMaterials = rawMaterials.filter((mat) => validCourseIds.has(mat.courseId));

    return NextResponse.json({
      success: true,
      isConnected: true,
      userEmail,
      courses: semesterCourses,
      allCoursesCount: allCourses.length,
      allAssignments,
      allAnnouncements,
      allMaterials,
      totalCurrentSubjects: activeSubjects.length,
    });
  } catch (error: any) {
    console.error("Error fetching Google Classroom:", error);
    return errorResponse(error?.message || "Failed to fetch Google Classroom data", {}, 500);
  }
}
