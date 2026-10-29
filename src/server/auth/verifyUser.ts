import crypto from "crypto";
import { NextRequest } from "next/server";
import { useMongo } from "@/lib/database/useMongo";
import { verifyToken } from "@/server/utils/functions";

interface TokenPayload {
    username: string;
    sessionId: string;
    admin?: boolean;
    iat?: number;
}

export async function validUser(req: NextRequest): Promise<{ valid: boolean; payload?: TokenPayload; message?: string; token?: string; unavailable?: boolean }> {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return { valid: false, message: "Missing Authorization Token!" };
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) return { valid: false, message: "Missing Authorization Token!" };

    const payload = verifyToken(token) as TokenPayload | null;
    if (typeof payload?.username !== "string" || !payload.username || typeof payload.sessionId !== "string" || !payload.sessionId) {
        return { valid: false, message: "Invalid Authentication Token!" };
    }

    if (!process.env.MONGO_URI) return { valid: false, unavailable: true, message: "Session store unavailable" };
    try {
        const initDb = await useMongo();
        const session = await initDb.db("college_db").collection("auth_sessions").findOne({
            sessionId: payload.sessionId,
            username: payload.username,
            tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
            revokedAt: null,
            expiresAt: { $gt: new Date() },
        });

        if (!session) return { valid: false, message: "Session revoked or invalid!" };
    } catch {
        console.error("[VerifyUser] Session validation unavailable");
        return { valid: false, unavailable: true, message: "Session store unavailable" };
    }
    return { valid: true, payload, token };
}
