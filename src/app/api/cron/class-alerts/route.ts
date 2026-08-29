import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { useMongo } from "@/lib/database/useMongo";
import { decryptData } from "@/server/utils/functions";
import { ALL_DAYS, parseSubject, TIME_SLOTS } from "@/shared/utils/timetable";
import { sendWebPushNotification } from "@/server/notifications/webPushService";
import { getStriverProblemOfTheDay } from "@/server/career/striverA2ZData";
import { DateTime } from "luxon";

function safeCompare(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function parseHourMin(tStr: string): { h: number; m: number } {
  let [h, m] = tStr.split(":").map(Number);
  if (h < 8) h += 12; // 1:00 -> 13:00, etc.
  return { h, m: m || 0 };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const headerSecret = req.headers.get("x-cron-secret");
  const cronSecret = process.env.CRON_SECRET;

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
      pushSubscription: { $exists: true, $ne: null },
    }).toArray();

    const nowIST = DateTime.now().setZone("Asia/Kolkata");
    const currentDay = ALL_DAYS[nowIST.weekday % 7];
    const currentMinutes = nowIST.hour * 60 + nowIST.minute;

    let dispatched = 0;

    for (const u of users) {
      try {
        if (!u.data || !u.pushSubscription) continue;
        const studentData: any = decryptData(u.data);
        if (!studentData) continue;

        const studentName = studentData.profile?.studentName || studentData.name || u.username;
        const daySchedule = studentData.timetable?.find((t: any) => t.day === currentDay);

        if (daySchedule && Array.isArray(daySchedule.subjects)) {
          for (let slotIdx = 0; slotIdx < daySchedule.subjects.length; slotIdx++) {
            const slot = daySchedule.subjects[slotIdx];
            if (!slot || slot === "-") continue;

            const parsed = parseSubject(slot);
            if (!parsed || !parsed.code) continue;

            const timeRange = TIME_SLOTS[slotIdx] || "9:00-9:50";
            const [startStr] = timeRange.split("-");
            const startHM = parseHourMin(startStr);
            const classStartMins = startHM.h * 60 + startHM.m;

            // Check if class is starting in 5 to 15 minutes
            const diffMins = classStartMins - currentMinutes;
            if (diffMins >= 5 && diffMins <= 15) {
              const subObj = studentData.subjects?.find((s: any) => s.code === parsed.code);
              const subjectName = subObj?.name || parsed.code;
              const venue = parsed.venue || "Campus Classroom";

              const sent = await sendWebPushNotification(u.pushSubscription, {
                title: `⏰ Next Class in ${diffMins} mins: ${parsed.code}`,
                body: `📍 Venue: ${venue} | ${subjectName}. Tap to view classroom.`,
                url: "/timetable",
              });

              if (sent) dispatched++;
            }
          }
        }
      } catch (userErr) {
        console.error(`Error sending class alert for ${u.username}:`, userErr);
      }
    }

    return NextResponse.json({
      success: true,
      processed: users.length,
      dispatched,
    });
  } catch (error: any) {
    console.error("Error in class alerts cron:", error);
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
