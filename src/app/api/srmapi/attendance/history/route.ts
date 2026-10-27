import { NextRequest, NextResponse } from "next/server";
import { useMongo } from "@/lib/database/useMongo";
import { requireAuthResponse, errorResponse, decryptData, decryptLegacyData, encryptData } from "@/server/utils/functions";
import { UNAUTHORIZED } from "@/shared/utils/messages";
import { DateTime } from "luxon";

export async function GET(req: NextRequest) {
    const auth = await requireAuthResponse(req);
    if (auth instanceof NextResponse) return auth;
    try {
        if (!process.env.MONGO_URI) {
            return NextResponse.json({ success: true, history: [] });
        }
        let initDb: any;
        try {
            initDb = await useMongo();
        } catch {
            return NextResponse.json({ success: true, history: [] });
        }
        const db = initDb.db("college_db").collection("users");
        const user = await db.findOne({ username: auth.payload.username }, { projection: { attendanceHistory: 1 } });
        if (!user) return NextResponse.json({ success: true, history: [] });

        const today = DateTime.now().setZone("Asia/Kolkata").toFormat("dd-MM-yyyy");
        const sortedHistory = (user.attendanceHistory || [])
            .filter((h: any) => h.date !== today)
            .sort((a: any, b: any) => DateTime.fromFormat(b.date, "dd-MM-yyyy").toMillis() - DateTime.fromFormat(a.date, "dd-MM-yyyy").toMillis());

        return NextResponse.json({ success: true, history: sortedHistory.map((h: any) => ({ date: h.date, encrypted: true })) });
    } catch (err) {
        console.log("Error From /srmapi/attendance/history GET:", err);
        return errorResponse(undefined, {}, 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { date, password } = body;
        const auth = await requireAuthResponse(req);
        if (auth instanceof NextResponse) return auth;

        if (!process.env.MONGO_URI) {
            return errorResponse("Attendance history unavailable without DB", { action: "none" }, 404);
        }

        let initDb: any;
        try {
            initDb = await useMongo();
        } catch {
            return errorResponse("Database unavailable", { action: "none" }, 503);
        }

        const db = initDb.db("college_db").collection("users");
        const user = await db.findOne({ username: auth.payload.username }, { projection: { attendanceHistory: 1 } });
        if (!user) return errorResponse(UNAUTHORIZED, { action: "logout" });

        const entry = user.attendanceHistory?.find((h: any) => h.date === date);
        if (!entry) return errorResponse("Attendance data not found for this date", { action: "none" }, 404);

        try {
            let decryptedData: any;
            try {
                decryptedData = decryptData(entry.data);
            } catch {
                if (!password) throw new Error("PASSWORD_REQUIRED");
                decryptedData = decryptLegacyData(entry.data, password);
                await db.updateOne(
                    { username: auth.payload.username, "attendanceHistory.date": date },
                    { $set: { "attendanceHistory.$.data": encryptData(decryptedData) } }
                );
            }
            return NextResponse.json({ success: true, data: decryptedData });
        } catch (decryptErr: any) {
            if (decryptErr.message === "PASSWORD_REQUIRED") {
                return errorResponse("Password required for legacy data", { action: "request_password" }, 400);
            }
            return errorResponse("Failed to decrypt attendance data", { action: "none" }, 500);
        }
    } catch (err) {
        console.log("Error From /srmapi/attendance/history POST:", err);
        return errorResponse(undefined, {}, 500);
    }
}
