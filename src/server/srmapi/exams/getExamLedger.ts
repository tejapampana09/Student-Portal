import { useMongo } from "@/lib/database/useMongo";
import { isSessionValid } from "@/shared/utils/functions";
import { fetchExamLedger } from "@/server/srmapi/exams/fetchExamLedger";
import { INVALID_CREDENTIALS, UNAUTHORIZED } from "@/shared/utils/messages";
import { decryptData } from "@/server/utils/functions";

interface ResolveExamLedgerParams {
  username: string;
  sessionId: string;
}

interface ResolveExamLedgerError {
  message?: string;
  data?: Record<string, any>;
  status?: number;
}

interface ResolveExamLedgerResult {
  data?: Awaited<ReturnType<typeof fetchExamLedger>>;
  error?: ResolveExamLedgerError;
}

export async function getExamLedgerForUser({
  username,
  sessionId,
}: ResolveExamLedgerParams): Promise<ResolveExamLedgerResult> {
  let user: any = null;
  if (process.env.MONGO_URI) {
    try {
      const initDb = await useMongo();
      const db = initDb.db("college_db").collection("users");
      user = await db.findOne({ username });
    } catch (e) {
      console.warn("[getExamLedgerForUser] Mongo lookup skipped:", (e as any)?.message);
    }
  }

  let activeSessionId = sessionId;
  if (!activeSessionId && user?.session_id) {
    try {
      activeSessionId = decryptData(user.session_id) as string;
    } catch {}
  }
  if (!activeSessionId && user?.session) {
    activeSessionId = user.session;
  }

  if (!activeSessionId) {
    return { error: { message: UNAUTHORIZED, data: { action: "logout" } } };
  }

  const result = await fetchExamLedger(activeSessionId);
  if (!result) {
    return { error: { message: INVALID_CREDENTIALS, data: { action: "logout" } } };
  }

  return { data: result };
}
