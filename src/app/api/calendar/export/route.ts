import { NextRequest, NextResponse } from "next/server";
import { requireAuthResponse, decryptData } from "@/server/utils/functions";
import { useMongo } from "@/lib/database/useMongo";
import { generateICS } from "@/server/calendar/calendarService";

export async function GET(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const initDb = await useMongo();
    const user = await initDb.db("college_db").collection<any>("users").findOne({ username: auth.payload.username });

    if (!user || !user.data) {
      return NextResponse.json({ success: false, message: "User data not found" }, { status: 404 });
    }

    const studentData: any = decryptData(user.data);
    const studentName = studentData?.profile?.studentName || studentData?.name || auth.payload.username;
    const timetable = studentData?.timetable || [];
    const subjects = studentData?.subjects || [];

    const icsContent = generateICS(timetable, subjects, studentName);

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="srmap-academic-schedule-${auth.payload.username}.ics"`,
        "Cache-Control": "no-cache, no-store",
      },
    });
  } catch (error: any) {
    console.error("Error generating calendar ICS:", error);
    return NextResponse.json({ success: false, message: "Failed to generate calendar export" }, { status: 500 });
  }
}
