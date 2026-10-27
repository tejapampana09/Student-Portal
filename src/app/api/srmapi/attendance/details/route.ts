import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { useMongo } from "@/lib/database/useMongo";
import { PARAMETERS } from "@/shared/utils/messages";
import { errorResponse, decryptData, requireAuthResponse } from "@/server/utils/functions";
import { UNAUTHORIZED, INVALID_CREDENTIALS } from "@/shared/utils/messages";
import { getFullDateAndTime } from "@/shared/utils/functions";
import { fetchAttendance } from "@/server/srmapi/utils/fetchCheckAttendance";

export async function POST(req: NextRequest) {
    let body: any = {};
    try { body = await req.json(); } catch {}
    const { sessionId } = body;

    const auth = await requireAuthResponse(req);
    if (auth instanceof NextResponse) return auth;

    try {
        let user: any = null;
        if (process.env.MONGO_URI) {
            try {
                const initDb = await useMongo();
                const db = initDb.db("college_db").collection("users");
                user = await db.findOne({ username: auth.payload.username });
            } catch (e) {
                console.warn("[attendance/details] Mongo lookup skipped:", (e as any)?.message);
            }
        }

        let activeSessionId = sessionId;
        if (!activeSessionId && user?.session_id) {
            try { activeSessionId = decryptData(user.session_id) as string; } catch {}
        }
        if (!activeSessionId && user?.session) {
            activeSessionId = user.session;
        }

        if (!activeSessionId) {
            return errorResponse(PARAMETERS);
        }

        const result = await fetchAttendance(activeSessionId);

        if (!result?.attendance) {
            return errorResponse(INVALID_CREDENTIALS, {});
        }

        return NextResponse.json({
            success: true,
            message: "Success!",
            attendance: {
                data: result.attendance,
                last_fetched: getFullDateAndTime()
            }
        });
    } catch (err) {
        console.log("Error From /api/srmapi/attendance/details:- ", err);
        return errorResponse(undefined, {}, 500);
    }
}
