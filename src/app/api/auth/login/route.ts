import { NextRequest, NextResponse } from "next/server";
import { isValidRegNumber } from "@/validators/auth/login";
import { handleUserSession } from "@/server/auth/handleUserSession";
import { userBlockedResponse, paramatersNotMatched } from "@/server/utils/responses";
import { createAuthSession, enforceRateLimit, errorResponse, isAdmin, isBlocked } from "@/server/utils/functions";

export async function POST(req: NextRequest) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    const rate = await enforceRateLimit(`login:ip:${ip}`, 30, 15 * 60 * 1000);
    if (!rate.allowed) {
        return NextResponse.json({ success: false, message: "Too many login attempts. Try again later." }, {
            status: 429,
            headers: { "Retry-After": String(rate.retryAfterSeconds) }
        });
    }

    const body = await req.json();
    let { username, password, wantCachedData } = body;
    username = username?.toUpperCase() || "";

    if (!username || !password) return paramatersNotMatched();
    const [isValid, errorMessage] = isValidRegNumber(username);
    if (!isValid) return errorResponse(errorMessage || "Invalid Username!");

    const userRate = await enforceRateLimit(`login:user:${username}`, 20, 15 * 60 * 1000);
    if (!userRate.allowed) {
        return NextResponse.json({ success: false, message: "Too many login attempts for this account. Try again later." }, {
            status: 429,
            headers: { "Retry-After": String(userRate.retryAfterSeconds) }
        });
    }

    try {
        if (await isBlocked(username)) return userBlockedResponse();
        const result = await handleUserSession({ username, password });

        if (!result.success) {
            if ((result as any).hasCachedData) {
                if (!wantCachedData) return errorResponse(result.message, { hasCachedData: true }, 400);
                const authSession = await createAuthSession(username, isAdmin(username));
                return NextResponse.json({
                    success: true,
                    message: "Success (Cached)",
                    accessToken: authSession.token,
                    sessionId: "",
                    sessionTime: (result as any).cachedSessionTime,
                    hasCachedData: true
                });
            }
            return errorResponse(result.message);
        }

        const authSession = await createAuthSession(username, isAdmin(username));
        return NextResponse.json({
            success: true,
            message: "Success!",
            accessToken: authSession.token,
            sessionId: result.sessionId,
            sessionTime: result.sessionTime,
        });
    } catch (err) {
        console.log("Error From /api/auth/login:", err);
        return errorResponse(undefined, {}, 500);
    }
}
