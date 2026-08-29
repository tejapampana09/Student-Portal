import { useMongo } from "@/lib/database/useMongo";
import { login } from "@/server/auth/login";
import { getTime } from "@/shared/utils/functions";
import { encryptData, decryptData, decryptLegacyData } from "@/server/utils/functions";
import { DateTime } from "luxon";

/** Stored SRM portal sessions are considered immediately reusable without network verification for 10 minutes */
export const SRM_SESSION_REUSE_WINDOW_MS = 10 * 60 * 1000;

export async function decryptStoredValue(value: unknown, password: string): Promise<{ value: any; legacy: boolean }> {
    try {
        return { value: decryptData(value), legacy: false };
    } catch {
        return { value: decryptLegacyData(value, password), legacy: true };
    }
}

export function getSessionAgeMs(sessionTime: unknown): number | null {
    if (typeof sessionTime !== "string" || !sessionTime.trim()) return null;

    // 1. Try parsing standard IST format "yyyy-MM-dd, HH:mm:ss"
    const parsedLuxon = DateTime.fromFormat(sessionTime.trim(), "yyyy-MM-dd, HH:mm:ss", { zone: "Asia/Kolkata" });
    if (parsedLuxon.isValid) {
        const diffMs = DateTime.now().setZone("Asia/Kolkata").diff(parsedLuxon, "milliseconds").milliseconds;
        // Protect against clock skew / invalid future timestamps (>60s in future is treated as invalid)
        if (diffMs < -60000) return null;
        return Math.max(0, diffMs);
    }

    // 2. Fallback: ISO 8601 or standard Date parsing
    const parsedDate = new Date(sessionTime).getTime();
    if (!isNaN(parsedDate)) {
        const diffMs = Date.now() - parsedDate;
        if (diffMs < -60000) return null;
        return Math.max(0, diffMs);
    }

    return null;
}

export async function isSessionAlive(sessionId: string): Promise<boolean> {
    if (!sessionId) return false;
    try {
        const res = await fetch("https://student.srmap.edu.in/srmapstudentcorner/students/report/studentTimeTableResources.jsp", {
            method: "POST",
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Cookie": `JSESSIONID=${sessionId}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ ids: "1" }),
            signal: AbortSignal.timeout(4000),
        });
        const text = await res.text();
        return !text.includes("StudentLoginPage") && !text.includes("Session Expired") && text.length > 300;
    } catch {
        return false;
    }
}

async function migrateLegacyData(user: any, password: string, db: any) {
    const updates: Record<string, unknown> = {};

    if (user.session_id) {
        try {
            const { value } = await decryptStoredValue(user.session_id, password);
            updates.session_id = encryptData(value);
        } catch { /* keep existing value until a fresh session is available */ }
    }

    if (user.data) {
        try {
            const { value } = await decryptStoredValue(user.data, password);
            updates.data = encryptData(value);
        } catch { /* old cache may be unavailable; fresh login data will replace it */ }
    }

    if (Array.isArray(user.attendanceHistory)) {
        const migratedHistory = [];
        let changed = false;
        for (const entry of user.attendanceHistory) {
            if (!entry?.data) {
                migratedHistory.push(entry);
                continue;
            }
            try {
                const { value, legacy } = await decryptStoredValue(entry.data, password);
                migratedHistory.push({ ...entry, data: legacy ? encryptData(value) : entry.data });
                changed ||= legacy;
            } catch {
                migratedHistory.push(entry);
            }
        }
        if (changed) updates.attendanceHistory = migratedHistory;
    }

    updates.portal_password = encryptData(password);
    if (Object.keys(updates).length) await db.updateOne({ username: user.username }, { $set: updates });
}

export async function handleUserSession({ username, password }: { username: string; password: string; }) {
    const initDb = await useMongo();
    const db = initDb.db("college_db").collection<any>("users");
    const time = getTime();
    const user = await db.findOne({ username });

    // ⚡ OPTIMIZED CRITICAL PATH: Local session reuse
    if (user?.session_id) {
        try {
            const { value: existingSessionId } = await decryptStoredValue(user.session_id, password);
            if (typeof existingSessionId === "string" && existingSessionId.trim().length > 0) {
                const cleanSessionId = existingSessionId.trim();
                const sessionAgeMs = getSessionAgeMs(user.session_time);

                // Case B: Fresh Session (<10 min) -> INSTANT RETURN (<10ms), NO external SRM request
                if (sessionAgeMs !== null && sessionAgeMs <= SRM_SESSION_REUSE_WINDOW_MS) {
                    console.log(`[SRM Session] Session fresh (${Math.round(sessionAgeMs / 1000)}s old) — instant local reuse`);
                    return {
                        success: true,
                        sessionId: cleanSessionId,
                        sessionTime: user.session_time || time,
                    };
                }

                // Case C/D: Stale Session (>10 min) -> Validate with SRM server
                console.log(`[SRM Session] Session older than 10m (${sessionAgeMs !== null ? Math.round(sessionAgeMs / 1000) : "unknown"}s) — validating with SRM server...`);
                const alive = await isSessionAlive(cleanSessionId);
                if (alive) {
                    console.log(`[SRM Session] Stale session verified alive — reusing and refreshing session timestamp`);
                    await db.updateOne(
                        { username },
                        { $set: { session_time: time, portal_password: encryptData(password) } }
                    );
                    return {
                        success: true,
                        sessionId: cleanSessionId,
                        sessionTime: time,
                    };
                }

                console.log(`[SRM Session] Stale session expired on university server — acquiring fresh session`);
            }
        } catch (decryptError) {
            console.log(`[SRM Session] Corrupted or unparseable session data — creating fresh session`);
        }
    }

    // Case A / Fallback: Create fresh SRM session via standard login flow
    const result = await login(username, password);

    if (!result?.success) {
        if (result?.message?.includes("SRM server is unreachable") && user) {
            try {
                const { value } = await decryptStoredValue(user.session_id, password);
                if (value) {
                    await db.updateOne({ username }, { $set: { session_id: encryptData(value), portal_password: encryptData(password) } });
                    return {
                        success: false,
                        message: result.message,
                        hasCachedData: true,
                        cachedSessionId: value,
                        cachedSessionTime: user.session_time,
                    };
                }
            } catch { }
        }
        return { success: false, message: result?.message || "Invalid credentials" };
    }

    await db.updateOne(
        { username },
        {
            $set: {
                session_id: encryptData(result.sessionId),
                session_time: time,
                portal_password: encryptData(password),
            },
            $setOnInsert: { createdAt: DateTime.now().toJSDate() },
        },
        { upsert: true }
    );

    if (user) await migrateLegacyData(user, password, db);
    return { success: true, sessionId: result.sessionId, sessionTime: time };
}
