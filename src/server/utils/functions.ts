import axios from "axios";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { useMongo } from "@/lib/database/useMongo";
import { basic } from "@/server/utils/headers";
import { NextRequest, NextResponse } from "next/server";
import { validUser } from "@/server/auth/verifyUser";
import { userBlockedResponse } from "@/server/utils/responses";
import { httpAgent, httpsAgent } from "@/server/utils/httpAgents";

function getAccessSecret(): string {
    const value = process.env.ACCESS_SECRET;
    if (!value || value.length < 32) throw new Error("ACCESS_SECRET must be configured and at least 32 characters long");
    return value;
}

function getEncryptionSecret(): string {
    const value = process.env.DB_ENCRYPTION_KEY;
    if (!value || value.length < 32) throw new Error("DB_ENCRYPTION_KEY must be configured and at least 32 characters long");
    return value;
}

const SESSION_COLLECTION = "auth_sessions";
const RATE_LIMIT_COLLECTION = "rate_limits";

function serverKey(): Buffer {
    return crypto.createHash("sha256").update(getEncryptionSecret()).digest();
}

function tokenHash(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
}

export function createClient(sessionId: string) {
    return axios.create({
        timeout: 25000,
        withCredentials: true,
        httpAgent,
        httpsAgent,
        headers: basic(sessionId)
    });
}

/** Authenticated server-side encryption for sensitive application data. */
export function encryptData(data: unknown): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", serverKey(), iv);
    const plaintext = Buffer.from(JSON.stringify(data), "utf8");
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptData(encryptedData: unknown): unknown {
    if (typeof encryptedData !== "string") throw new Error("decryptData error: encryptedData must be a base64 string");
    const data = Buffer.from(encryptedData, "base64");
    if (data.length < 28) throw new Error("decryptData error: invalid encrypted payload");
    const iv = data.subarray(0, 12);
    const tag = data.subarray(12, 28);
    const encrypted = data.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", serverKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8")) as unknown;
}

/** Legacy AES-CBC/password encryption used by older database records. */
export function decryptLegacyData(encryptedData: unknown, password: string): unknown {
    if (typeof encryptedData !== "string") throw new Error("decryptLegacyData error: encryptedData must be a base64 string");
    const data = Buffer.from(encryptedData, "base64");
    if (data.length < 32) throw new Error("decryptLegacyData error: input is too short");
    const salt = data.subarray(0, 16);
    const iv = data.subarray(16, 32);
    const encrypted = data.subarray(32);
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8")) as unknown;
}

/** [DEPRECATED] All new data is strictly encrypted using AES-256-GCM only. */

export function createToken(payload: object) {
    return jwt.sign(payload, getAccessSecret(), { algorithm: "HS256", expiresIn: "7d" });
}

export function verifyToken(token: string) {
    try {
        return jwt.verify(token, getAccessSecret(), { algorithms: ["HS256"] });
    } catch {
        return null;
    }
}

export async function createAuthSession(username: string, admin: boolean) {
    const sessionId = crypto.randomUUID();
    const token = createToken({ username, sessionId, admin });
    if (!process.env.MONGO_URI) throw new Error("Session store unavailable");
    const initDb = await useMongo();
    const result = await initDb.db("college_db").collection(SESSION_COLLECTION).insertOne({
        sessionId,
        username,
        tokenHash: tokenHash(token),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: null,
    });
    if (!result.acknowledged) throw new Error("Session persistence failed");
    return { token, sessionId };
}

export async function revokeAuthSession(token: string): Promise<void> {
    if (!process.env.MONGO_URI) throw new Error("Session store unavailable");
    const initDb = await useMongo();
    await initDb.db("college_db").collection(SESSION_COLLECTION).updateOne(
        { tokenHash: tokenHash(token), revokedAt: null },
        { $set: { revokedAt: new Date() } }
    );
}

export async function revokeAllAuthSessions(username: string): Promise<void> {
    if (!process.env.MONGO_URI) throw new Error("Session store unavailable");
    const initDb = await useMongo();
    await initDb.db("college_db").collection(SESSION_COLLECTION).updateMany(
        { username, revokedAt: null },
        { $set: { revokedAt: new Date() } }
    );
}

export async function requireAuthResponse(req: NextRequest): Promise<{ payload: any; token?: string } | NextResponse> {
    const { valid, payload, token, unavailable } = await validUser(req);
    if (unavailable) return errorResponse("Authentication temporarily unavailable", {}, 503);
    if (!valid || !payload) return errorResponse("Unauthorized!", { action: "logout" }, 401);
    try {
        if (await isBlocked(payload.username)) return userBlockedResponse();
    } catch {
        return errorResponse("Authentication temporarily unavailable", {}, 503);
    }
    return { payload, token };
}

export async function requireAuthResponseAdmin(req: NextRequest): Promise<{ payload: any } | NextResponse> {
    const { valid, payload, unavailable } = await validUser(req);
    if (unavailable) return errorResponse("Authentication temporarily unavailable", {}, 503);
    if (!valid || !payload) return errorResponse("Unauthorized!", { action: "logout" }, 401);
    try {
        if (await isBlocked(payload.username)) return userBlockedResponse();
    } catch {
        return errorResponse("Authentication temporarily unavailable", {}, 503);
    }
    if (!isAdmin(payload.username)) return errorResponse("You don't have admin privilages!");
    return { payload };
}

export async function isBlocked(username: string): Promise<boolean> {
    if (!username || !process.env.MONGO_URI) return false;
    try {
        const initDb = await useMongo();
        const dbBlocked = initDb.db("college_db").collection("blocked");
        const blockedUser = await dbBlocked.findOne({ username: username.toUpperCase() });
        return !!blockedUser;
    } catch (err) {
        throw new Error("Account status unavailable");
    }
}

export async function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  try {
    if (!process.env.MONGO_URI) {
      return { allowed: false, retryAfterSeconds: 60 };
    }
    const now = new Date();
    const initDb = await useMongo();
    const col = initDb.db("college_db").collection<{ _id: string; count: number; expiresAt: Date }>(RATE_LIMIT_COLLECTION);
    // Mongo's unique _id and one atomic update keep all instances on the same
    // counter. Reset expired windows inside the update, never delete then upsert.
    const activeWindow = { $gt: ["$expiresAt", now] };
    const doc = await col.findOneAndUpdate(
      { _id: `rate:${tokenHash(key)}` },
      [{ $set: {
        count: { $cond: [activeWindow, { $add: ["$count", 1] }, 1] },
        expiresAt: { $cond: [activeWindow, "$expiresAt", new Date(now.getTime() + windowMs)] },
      } }],
      { upsert: true, returnDocument: "after" }
    );

    if (!doc) return { allowed: false, retryAfterSeconds: 60 };

    if (doc.count > limit) {
      const expiresAtMs = doc.expiresAt ? new Date(doc.expiresAt).getTime() : now.getTime() + windowMs;
      const retryAfterSeconds = Math.max(1, Math.ceil((expiresAtMs - now.getTime()) / 1000));
      return { allowed: false, retryAfterSeconds };
    }

    return { allowed: true, retryAfterSeconds: 0 };
  } catch (err) {
    console.error("[RateLimit] Store unavailable");
    return { allowed: false, retryAfterSeconds: 60 };
  }
}

export function errorResponse(message?: string, data: Record<string, any> = {}, status: number = 400): NextResponse {
    return NextResponse.json({ success: false, message: message ?? "Something Went Wrong!", ...data }, { status });
}

export function isAdmin(username: string): boolean {
    const adminUsers = String(process.env.ADMIN_USERS || "")
        .split(",")
        .map(value => value.trim().toUpperCase())
        .filter(Boolean);
    return adminUsers.includes(username.toUpperCase());
}

export async function callApiWithRetry(apiCall: () => Promise<any>, maxAttempts: number = 3): Promise<any> {
    let attempts = 0;
    while (attempts < maxAttempts) {
        attempts++;
        try {
            return await apiCall();
        } catch (err) {
            if (attempts >= maxAttempts) throw err;
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts - 1) * 1000));
        }
    }
}
