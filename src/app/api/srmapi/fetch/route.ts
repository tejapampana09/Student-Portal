import * as crypto from "crypto";
import { DateTime } from "luxon";
import { useMongo } from "@/lib/database/useMongo";
import { NextResponse, NextRequest } from "next/server";
import { fetchFromWebsite } from "@/server/srmapi/fetchData";
import { fetchTimetable } from "@/server/srmapi/utils/extractTimetable";
import { getTime, isSessionValid } from "@/shared/utils/functions";
import { UNAUTHORIZED, INVALID_CREDENTIALS } from "@/shared/utils/messages";
import { encryptData, decryptData, errorResponse, requireAuthResponse } from "@/server/utils/functions";

export async function POST(req: NextRequest) {
    let body: any = {};
    try { body = await req.json(); } catch { }
    const { sessionId } = body;
    const auth = await requireAuthResponse(req);
    if (auth instanceof NextResponse) return auth;

    try {
        const initDb = await useMongo();
        const db = initDb.db("college_db").collection<any>("users");
        const time = getTime();
        const user = await db.findOne({ username: auth.payload.username });
        if (!user) return errorResponse(UNAUTHORIZED, { action: "logout" });

        // Auto-resolve active session from body OR stored DB session
        let activeSessionId = sessionId;
        if (!activeSessionId && user?.session_id) {
            try {
                const dec = decryptData(user.session_id);
                activeSessionId = typeof dec === "string" ? dec : JSON.stringify(dec);
            } catch {}
        }

        if (activeSessionId) {
            const result = await fetchFromWebsite(activeSessionId);
            if (result) {
                const today = DateTime.now().setZone("Asia/Kolkata").toFormat("dd-MM-yyyy");
                const hasTodayEntry = user.attendanceHistory?.some((h: any) => h.date === today);

                const updateOps: Promise<any>[] = [
                    db.updateOne({ username: auth.payload.username }, { $set: { data: encryptData(result), session_time: time } })
                ];

                if (!hasTodayEntry && result.attendance) {
                    updateOps.push(
                        db.updateOne({ username: auth.payload.username }, {
                            $push: { attendanceHistory: { $each: [{ date: today, data: encryptData(result.attendance) }], $slice: -10 } } as any
                        })
                    );
                }

                // Run database cache saves concurrently
                void Promise.all(updateOps).catch((err) => console.error("Error saving cached data:", err));

                // 🔔 Real-time Web Push Alert for Low Attendance
                if (user.pushSubscription && Array.isArray(result.attendance)) {
                    const lowSubjects = result.attendance.filter((a: any) => parseFloat(a.attendance_percentage || "0") < 75);
                    if (lowSubjects.length > 0) {
                        void (async () => {
                            try {
                                const { sendWebPushNotification } = await import("@/server/notifications/webPushService");
                                await sendWebPushNotification(user.pushSubscription, {
                                    title: `⚠️ Attendance Alert: ${lowSubjects.length} Subject(s) Below 75%`,
                                    body: `${lowSubjects.map((s: any) => `${s.subject_code || s.subject_name}: ${s.attendance_percentage}%`).join(", ")}. Tap to calculate safe bunks.`,
                                    url: "/attendance",
                                });
                            } catch (pushErr) {
                                console.error("Failed to dispatch low attendance push alert:", pushErr);
                            }
                        })();
                    }
                }

                // Background timetable indexer
                (async () => {
                    try {
                        const settingsDb = initDb.db("college_db").collection("settings");
                        const appSettings = await settingsDb.findOne({ id: "app-settings" });
                        if (appSettings?.timetableCollection === false) return;
                        const emptyClassesDb = initDb.db("college_db").collection("empty_classes");
                        const emptyClassesData = fetchTimetable(result);
                        const dataHash = crypto.createHash("sha256").update(JSON.stringify(emptyClassesData)).digest("hex");
                        const lastCollectedUser = await emptyClassesDb.findOne({ id: "last-collected-timetable" });
                        if (lastCollectedUser?.hash === dataHash) return;
                        await emptyClassesDb.updateOne(
                            { id: "last-collected-timetable" },
                            { $set: { hash: dataHash, data: emptyClassesData, time: DateTime.now().setZone("Asia/Kolkata").toISO() } },
                            { upsert: true }
                        );
                    } catch (timetableError) {
                        console.error("Timetable indexer error:", timetableError);
                    }
                })();

                return NextResponse.json({
                    success: true,
                    data: result,
                    message: "Data retrieved successfully",
                    hasCachedData: false,
                    sessionTime: time,
                });
            }
        }

        if (user?.data) {
            try {
                const cachedData = decryptData(user.data);
                return NextResponse.json({
                    success: true,
                    data: cachedData,
                    message: "Data retrieved successfully (Cached)",
                    hasCachedData: true,
                    sessionTime: user.session_time,
                });
            } catch (e) {
                console.error("Error decrypting user.data:", e);
            }
        }

        return errorResponse(INVALID_CREDENTIALS);
    } catch (err) {
        console.error("Error From /backendUtils/fetchData:- ", err);
        return errorResponse(undefined, {}, 500);
    }
}
