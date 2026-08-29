import { handleUserSession } from "@/server/auth/handleUserSession";
import { decryptData, errorResponse, requireAuthResponse } from "@/server/utils/functions";
import { useMongo } from "@/lib/database/useMongo";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const auth = await requireAuthResponse(req);
    if (auth instanceof NextResponse) return auth;

    try {
        const initDb = await useMongo();
        const user = await initDb.db("college_db").collection<any>("users").findOne(
            { username: auth.payload.username },
            { projection: { portal_password: 1, session_id: 1, session_time: 1 } }
        );
        
        if (!user?.portal_password) {
            return errorResponse("Saved portal credentials are unavailable. Please log in again.", {}, 401);
        }

        let password = "";
        try {
            password = String(decryptData(user.portal_password));
        } catch (decryptErr) {
            console.error("Portal password decryption failed:", decryptErr);
            return errorResponse("Session encryption key updated. Please log in again to refresh credentials.", {}, 401);
        }

        const result = await handleUserSession({ username: auth.payload.username, password });
        if (!result.success) return errorResponse(result.message);

        return NextResponse.json({
            success: true,
            message: "Success!",
            sessionId: result.sessionId,
            sessionTime: result.sessionTime,
        });
    } catch (err: any) {
        console.error("Error From initiate/session:", err?.message || err);
        return errorResponse("Failed to initiate session. Please try again.", {}, 500);
    }
}
