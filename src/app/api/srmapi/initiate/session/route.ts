import { handleUserSession } from "@/server/auth/handleUserSession";
import { decryptData, errorResponse, requireAuthResponse } from "@/server/utils/functions";
import { useMongo } from "@/lib/database/useMongo";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const auth = await requireAuthResponse(req);
    if (auth instanceof NextResponse) return auth;

    try {
        const initDb = await useMongo();
        const user = await initDb.db("college_db").collection<any>("users").findOne({ username: auth.payload.username }, { projection: { portal_password: 1 } });
        if (!user?.portal_password) return errorResponse("Saved portal credentials are unavailable. Please log in again.", {}, 401);

        const password = String(decryptData(user.portal_password));
        const result = await handleUserSession({ username: auth.payload.username, password });
        if (!result.success) return errorResponse(result.message);

        return NextResponse.json({ success: true, message: "Success!", sessionId: result.sessionId, sessionTime: result.sessionTime });
    } catch (err) {
        console.log("Error From initiate/session:", err);
        return errorResponse(undefined, {}, 500);
    }
}
