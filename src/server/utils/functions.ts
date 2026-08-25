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

export function encryptLegacyData(data: unknown, password: string): string {
    const salt = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    const jsonData = Buffer.from(JSON.stringify(data), "utf8");
    const encrypted = Buffer.concat([cipher.update(jsonData), cipher.final()]);
    return Buffer.concat([salt, iv, encrypted]).toString("base64");
}

export function createToken(payload: object) {
    return jwt.sign(payload, getAccessSecret(), { algorithm: "HS256" });
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
    const initDb = await useMongo();
    await initDb.db("college_db").collection(SESSION_COLLECTION).insertOne({
        sessionId,
        username,
        tokenHash: tokenHash(token),
        createdAt: new Date(),
        revokedAt: null,
    });
    return { token, sessionId };
}

export async function revokeAuthSession(token: string): Promise<void> {
    const initDb = await useMongo();
    await initDb.db("college_db").collection(SESSION_COLLECTION).updateOne(
        { tokenHash: tokenHash(token), revokedAt: null },
        { $set: { revokedAt: new Date() } }
    );
}

export async function revokeAllAuthSessions(username: string): Promise<void> {
    const initDb = await useMongo();
    await initDb.db("college_db").collection(SESSION_COLLECTION).updateMany(
        { username, revokedAt: null },
        { $set: { revokedAt: new Date() } }
    );
}

export async function requireAuthResponse(req: NextRequest): Promise<{ payload: any; token?: string } | NextResponse> {
    const { valid, payload, token } = await validUser(req);
    if (!valid || !payload) return errorResponse("Unauthorized!", { action: "logout" }, 401);
    if (await isBlocked(payload.username)) return userBlockedResponse();
    return { payload, token };
}

export async function requireAuthResponseAdmin(req: NextRequest): Promise<{ payload: any } | NextResponse> {
    const { valid, payload } = await validUser(req);
    if (!valid || !payload) return errorResponse("Unauthorized!", { action: "logout" }, 401);
    if (await isBlocked(payload.username)) return userBlockedResponse();
    if (!isAdmin(payload.username)) return errorResponse("You don't have admin privilages!");
    return { payload };
}

export async function isBlocked(username: string): Promise<boolean> {
    if (!username) return false;
    try {
        const initDb = await useMongo();
        const dbBlocked = initDb.db("college_db").collection("blocked");
        const blockedUser = await dbBlocked.findOne({ username: username.toUpperCase() });
        return !!blockedUser;
    } catch (err) {
        console.error("Error checking blocked user:", err);
        return false;
    }
}

export async function enforceRateLimit(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const initDb = await useMongo();
    const col = initDb.db("college_db").collection(RATE_LIMIT_COLLECTION);
    const existing = await col.findOne({ key });

    if (!existing || new Date(existing.windowStart).getTime() <= windowStart) {
        await col.updateOne(
            { key },
            { $set: { key, count: 1, windowStart: new Date(now), expiresAt: new Date(now + windowMs) } },
            { upsert: true }
        );
        return { allowed: true, retryAfterSeconds: 0 };
    }

    if (existing.count >= limit) {
        const retryAfterSeconds = Math.max(1, Math.ceil((new Date(existing.expiresAt).getTime() - now) / 1000));
        return { allowed: false, retryAfterSeconds };
    }

    await col.updateOne({ key }, { $inc: { count: 1 } });
    return { allowed: true, retryAfterSeconds: 0 };
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
