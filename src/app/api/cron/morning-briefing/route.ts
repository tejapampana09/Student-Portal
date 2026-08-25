import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { useMongo } from "@/lib/database/useMongo";
import { decryptData } from "@/server/utils/functions";
import { buildDailyBriefingMessage, sendWhatsAppTextMessage } from "@/server/notifications/whatsappService";
import { ALL_DAYS, parseSubject } from "@/shared/utils/timetable";
import academicCalendar from "@/static/academic_calendar.json";
import { DateTime } from "luxon";

function safeCompare(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const headerSecret = req.headers.get("x-cron-secret");
  const cronSecret = process.env.CRON_SECRET || process.env.ACCESS_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ success: false, message: "CRON_SECRET is not configured on server" }, { status: 500 });
  }

  const expectedBearer = `Bearer ${cronSecret}`;
  const isAuthorized = safeCompare(authHeader, expectedBearer) || safeCompare(headerSecret, cronSecret);

  if (!isAuthorized) {
    return NextResponse.json({ success: false, message: "Unauthorized cron trigger" }, { status: 401 });
  }

  try {
    const initDb = await useMongo();
    const users = await initDb.db("college_db").collection<any>("users").find({
      "whatsapp.enabled": true,
      "whatsapp.phone": { $exists: true, $ne: "" },
    }).toArray();

    const nowIST = DateTime.now().setZone("Asia/Kolkata");
    const currentDay = ALL_DAYS[nowIST.weekday % 7]; // Day name

    // Find next upcoming holiday
    const allHolidays = [
      ...(academicCalendar.oddSemesterHolidays || []),
      ...(academicCalendar.evenSemesterHolidays || []),
    ];
    const upcomingHolidays = allHolidays
      .map((h) => {
        const [d, m, y] = h.date.split(".").map(Number);
        const dt = DateTime.local(y, m, d, { zone: "Asia/Kolkata" }).startOf("day");
        return { ...h, dt, diffDays: Math.round(dt.diff(nowIST.startOf("day"), "days").days) };
      })
      .filter((h) => h.diffDays >= 0)
      .sort((a, b) => a.diffDays - b.diffDays);
    const nextHoliday = upcomingHolidays[0] || null;

    let dispatched = 0;

    for (const u of users) {
      try {
        if (!u.data) continue;
        const studentData: any = decryptData(u.data);
        if (!studentData) continue;

        const studentName = studentData.profile?.studentName || studentData.name || u.username;

        // Today's classes
        const daySchedule = studentData.timetable?.find((t: any) => t.day === currentDay);
        const todayClasses: any[] = [];
        if (daySchedule && Array.isArray(daySchedule.subjects)) {
          daySchedule.subjects.forEach((slot: string, idx: number) => {
            const parsed = parseSubject(slot);
            if (parsed) {
              const subObj = studentData.subjects?.find((s: any) => s.code === parsed.code);
              todayClasses.push({
                ...parsed,
                name: subObj?.name || parsed.code,
              });
            }
          });
        }

        // Low attendance (<75%)
        const lowAttendance = (studentData.attendance || []).filter((a: any) => {
          const pct = parseFloat(a.attendance_percentage || "0");
          return pct < 75;
        });

        // Recent emails
        let recentEmails: any[] = [];
        if (u.gmail?.refreshToken) {
          try {
            const { fetchStudentEmails } = await import("@/server/gmail/gmailService");
            const refreshToken = String(decryptData(String(u.gmail.refreshToken)));
            recentEmails = await fetchStudentEmails(refreshToken, 3);
          } catch {}
        }

        const message = buildDailyBriefingMessage(
          studentName,
          currentDay,
          todayClasses,
          lowAttendance,
          nextHoliday,
          recentEmails,
          u.courseraCourses
        );

        const sent = await sendWhatsAppTextMessage(u.whatsapp.phone, message);
        if (sent.success) dispatched++;
      } catch (userErr) {
        console.error(`Error processing morning briefing for ${u.username}:`, userErr);
      }
    }

    return NextResponse.json({
      success: true,
      processed: users.length,
      dispatched,
    });
  } catch (error: any) {
    console.error("Error in morning briefing cron:", error);
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
