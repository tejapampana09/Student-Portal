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
      });
    }

    const decrypted = decryptData(String(rawToken));
    const refreshToken = typeof decrypted === "string" ? decrypted : JSON.stringify(decrypted);

    const { courses, allAssignments, allAnnouncements } = await fetchFullGoogleClassroomData(refreshToken);

    return NextResponse.json({
      success: true,
      isConnected: true,
      userEmail,
      courses,
      allAssignments,
      allAnnouncements,
    });
  } catch (error: any) {
    console.error("Error fetching Google Classroom:", error);
    return errorResponse(error?.message || "Failed to fetch Google Classroom data", {}, 500);
  }
}
