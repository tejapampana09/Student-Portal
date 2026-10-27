import { useMongo } from "@/lib/database/useMongo";
import { isSessionValid } from "@/shared/utils/functions";
import { fetchPastInternals } from "@/server/srmapi/exams/fetchPastInternals";
import { INVALID_CREDENTIALS, UNAUTHORIZED } from "@/shared/utils/messages";
import { decryptData } from "@/server/utils/functions";

interface ResolvePastInternalsParams {
  username: string;
  sessionId: string;
  semester: string | number;
}

interface ResolvePastInternalsError {
  message?: string;
  data?: Record<string, any>;
  status?: number;
}

interface ResolvePastInternalsResult {
  data?: Awaited<ReturnType<typeof fetchPastInternals>>;
  error?: ResolvePastInternalsError;
}

function parseSemester(semester: string | number): number {
  if (typeof semester === "number") {
    if (Number.isInteger(semester) && semester > 0) return semester;
    throw new Error("INVALID_SEMESTER");
  }

  const trimmed = semester.trim();
  const numericSemester = Number(trimmed);
  if (!Number.isInteger(numericSemester) || numericSemester <= 0) {
    throw new Error("INVALID_SEMESTER");
  }

  return numericSemester;
}

export async function getPastInternalsForUser({
  username,
  sessionId,
  semester,
}: ResolvePastInternalsParams): Promise<ResolvePastInternalsResult> {
  let user: any = null;
  if (process.env.MONGO_URI) {
    try {
      const initDb = await useMongo();
      const db = initDb.db("college_db").collection("users");
      user = await db.findOne({ username });
    } catch (e) {
      console.warn("[getPastInternalsForUser] Mongo lookup skipped:", (e as any)?.message);
    }
  }

  let parsedSemester: number | undefined;
  try {
    parsedSemester = parseSemester(semester);
  } catch {
    return { error: { message: "Invalid semester value" } };
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

  const result = await fetchPastInternals(activeSessionId, parsedSemester);
  if (!result) {
    return { error: { message: INVALID_CREDENTIALS, data: { action: "logout" } } };
  }

  return { data: result };
}
