import { NextRequest, NextResponse } from "next/server";
import { handleUserSession } from "@/server/auth/handleUserSession";
import { decryptData, requireAuthResponse } from "@/server/utils/functions";
import { useMongo } from "@/lib/database/useMongo";

export async function POST(req: NextRequest) {
    const auth = await requireAuthResponse(req);
    if (auth instanceof NextResponse) return auth;

    let body: any = {};
    try {
        body = await req.json();
    } catch {
        body = {};
    }

    let usernames: string[] = Array.isArray(body.usernames) ? body.usernames : [];
    const passwords: Record<string, string> = body.passwords && typeof body.passwords === "object" ? body.passwords : {};

    // Default to currently authenticated username if none provided
    if (usernames.length === 0 && auth.payload?.username) {
        usernames = [auth.payload.username];
    }

    // Sanitize and deduplicate
    const cleanUsernames = Array.from(
        new Set(
            usernames
                .map((u) => String(u || "").trim().toUpperCase())
                .filter(Boolean)
        )
    ).slice(0, 10);

    if (cleanUsernames.length === 0) {
        return NextResponse.json(
            { success: false, message: "No valid usernames provided" },
            { status: 400 }
        );
    }

    let db: any = null;
    try {
        const initDb = await useMongo();
        db = initDb.db("college_db").collection("users");
    } catch (dbErr) {
        console.warn("[Multi-Session] MongoDB unavailable:", (dbErr as any)?.message);
    }

    const promises = cleanUsernames.map(async (username) => {
        try {
            let password = passwords[username] || "";

            // If password not passed in payload, attempt to load decrypted password from MongoDB
            if (!password && db) {
                const user = await db.findOne(
                    { username },
                    { projection: { portal_password: 1, session_id: 1, session_time: 1 } }
                );

                if (user?.portal_password) {
                    try {
                        password = String(decryptData(user.portal_password));
                    } catch (decErr) {
                        console.warn(`[Multi-Session] Decryption failed for ${username}:`, decErr);
                    }
                }
            }

            if (!password) {
                return {
                    username,
                    success: false,
                    requiresPassword: true,
                    message: "Saved portal credentials unavailable. Please log into this account.",
                };
            }

            const result = await handleUserSession({ username, password });
            if (!result.success) {
                return {
                    username,
                    success: false,
                    message: result.message || "Failed to renew session with SRM server.",
                };
            }

            return {
                username,
                success: true,
                sessionId: result.sessionId,
                sessionTime: result.sessionTime,
                message: "Session renewed successfully!",
            };
        } catch (err: any) {
            console.error(`[Multi-Session] Error for ${username}:`, err?.message || err);
            return {
                username,
                success: false,
                message: err?.message || "Failed to initiate session",
            };
        }
    });

    const results = await Promise.all(promises);
    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
        success: successCount > 0,
        results,
        successCount,
        totalCount: results.length,
    });
}
