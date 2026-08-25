import { useMongo } from "@/lib/database/useMongo";
import { login } from "@/server/auth/login";
import { getTime } from "@/shared/utils/functions";
import { encryptData, decryptData, decryptLegacyData } from "@/server/utils/functions";
import { DateTime } from "luxon";

async function decryptStoredValue(value: unknown, password: string): Promise<{ value: any; legacy: boolean }> {
    try {
        return { value: decryptData(value), legacy: false };
    } catch {
        return { value: decryptLegacyData(value, password), legacy: true };
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
