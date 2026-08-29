import { NextRequest, NextResponse } from "next/server";
import { useMongo } from "@/lib/database/useMongo";
import { decryptData, errorResponse, requireAuthResponse } from "@/server/utils/functions";
import { autoSyncAllClassroomAssignments } from "@/server/classroom/autoSyncEngine";

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

    let refreshToken: string | undefined;
    if (user.gmail?.refreshToken) {
      try {
        refreshToken = String(decryptData(String(user.gmail.refreshToken)));
      } catch {}
    }

    const isConnected = !!(user.gmail?.email || user.gmail?.refreshToken);
    const userEmail = user.gmail?.email || "";

    const { courses, assignments } = await autoSyncAllClassroomAssignments(refreshToken, activeSubjects);

    return NextResponse.json({
      success: true,
      isConnected,
      userEmail,
      courses,
      assignments,
      totalCurrentSubjects: activeSubjects.length,
    });
  } catch (error: any) {
    console.error("Error in Classroom courses API:", error);
    return errorResponse("Failed to fetch Google Classroom data", {}, 500);
  }
}
