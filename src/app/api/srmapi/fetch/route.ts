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

        const validSession = isSessionValid(user.session_time);
        if (validSession && sessionId) {
            const result = await fetchFromWebsite(sessionId);
            if (!result) return errorResponse(INVALID_CREDENTIALS);

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

            // Background timetable indexer
            (async () => {
                try {
                    const settingsDb = initDb.db("college_db").collection("settings");
                    const appSettings = await settingsDb.findOne({ id: "app-settings" });
                    if (appSettings?.timetableCollection === false) return;
                    const emptyClassesDb = initDb.db("college_db").collection("empty_classes");
                    const emptyClassesData = fetchTimetable(result);
                    const dataHash = crypto.createHash("sha256").update(JSON.stringify(emptyClassesData)).digest("hex");
                    if (!(await emptyClassesDb.findOne({ hash: dataHash }))) await emptyClassesDb.insertOne({ hash: dataHash, data: emptyClassesData });
                } catch { }
            })();
            return NextResponse.json({ success: true, message: "Success!", data: result, source: "Srmap Portal" });
        }

        if ((!validSession && user.data) || (validSession && !sessionId)) {
            try {
                const data = decryptData(user.data);
                return NextResponse.json({ success: true, message: "Success!", data, student: { id: user.username }, source: "Database" });
            } catch {
                return errorResponse("Invalid session data!");
            }
        }

        if (validSession && !user.data && !sessionId) return errorResponse("Essential Data Missing!");
        return errorResponse("SRM session is not available. Please refresh your data.", {}, 409);
    } catch (err: any) {
        console.log("Error From /api/srmapi/fetch:- ", err);
        if (err?.message?.includes("SRM server is unreachable")) return errorResponse(err.message, {}, 503);
        return errorResponse(undefined, {}, 500);
    }
}
