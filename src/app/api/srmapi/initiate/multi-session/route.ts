import { NextRequest, NextResponse } from "next/server";
import { handleUserSession } from "@/server/auth/handleUserSession";
import { decryptData, errorResponse, enforceRateLimit, requireAuthResponse } from "@/server/utils/functions";
import { useMongo } from "@/lib/database/useMongo";

export async function POST(req: NextRequest) {
    const auth = await requireAuthResponse(req);
    if (auth instanceof NextResponse) return auth;

    let body;
    try { body = await req.json(); } catch { return errorResponse("Invalid JSON body"); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return errorResponse("Invalid request body");
    const username = auth.payload.username.trim().toUpperCase();
    const usernames = body.usernames ?? [username];
    if (!Array.isArray(usernames) || usernames.length > 10 || usernames.some((u: unknown) => typeof u !== "string" || !u.trim())) {
        return errorResponse("Invalid usernames");
    }
    // Reject the entire batch before any credential lookup or portal request.
    // Each saved account must send its own authenticated request.
    if (usernames.some((u: string) => u.trim().toUpperCase() !== username)) {
        return errorResponse("You may only refresh your own account", {}, 403);
    }
    const rate = await enforceRateLimit(`session-refresh:${username}`, 10, 60_000);
    if (!rate.allowed) return NextResponse.json({ success: false, message: "Too many requests. Please wait." }, {
        status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) }
    });

    try {
        const client = await useMongo();
        const user = await client.db("college_db").collection("users").findOne(
            { username }, { projection: { portal_password: 1 } }
        );
        let password = "";
        const supplied = body.passwords?.[username];
        if (supplied !== undefined && typeof supplied !== "string") return errorResponse("Invalid password");
        if (supplied) password = supplied;
        else if (user?.portal_password) password = String(decryptData(user.portal_password));

        const result = password
            ? await handleUserSession({ username, password, allowCachedSession: true })
            : { success: false, requiresPassword: true, message: "Saved portal credentials unavailable. Please log into this account." };
        return NextResponse.json({
            success: result.success,
            results: [{ username, ...result }],
            successCount: result.success ? 1 : 0,
            totalCount: 1,
        }, { headers: { "Cache-Control": "no-store" } });
    } catch {
        return errorResponse("Session refresh temporarily unavailable", {}, 503);
    }
}
