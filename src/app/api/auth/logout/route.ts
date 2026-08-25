import { NextRequest, NextResponse } from "next/server";
import { requireAuthResponse, revokeAuthSession, errorResponse } from "@/server/utils/functions";

export async function POST(req: NextRequest) {
    const auth = await requireAuthResponse(req);
    if (auth instanceof NextResponse) return auth;
    try {
        if (auth.token) await revokeAuthSession(auth.token);
        return NextResponse.json({ success: true, message: "Logged out successfully." });
    } catch (err) {
        console.error("Error From /api/auth/logout:", err);
        return errorResponse(undefined, {}, 500);
    }
}
