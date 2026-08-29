import { NextRequest, NextResponse } from "next/server";
import { useMongo } from "@/lib/database/useMongo";
import { decryptData, encryptData, errorResponse, requireAuthResponse } from "@/server/utils/functions";
import { submitDirectToLeetCode } from "@/server/code/leetcodeSubmitService";

export async function GET(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const initDb = await useMongo();
    const user = await initDb.db("college_db").collection<any>("users").findOne(
      { username: auth.payload.username },
      { projection: { leetcodeAuth: 1 } }
    );

    return NextResponse.json({
      success: true,
      hasSavedCredentials: !!user?.leetcodeAuth?.sessionCookie,
    });
  } catch (error: any) {
    return errorResponse("Failed to fetch LeetCode credential status", {}, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { slug, questionId, code, language, sessionCookie, csrfToken, saveCredentials } = body;

    if (!slug || !questionId || !code) {
      return errorResponse("Slug, questionId, and code are required.");
    }

    const initDb = await useMongo();
    const usersCollection = initDb.db("college_db").collection<any>("users");
    const user = await usersCollection.findOne({ username: auth.payload.username });

    let activeSession = sessionCookie;
    let activeCsrf = csrfToken;

    // Use saved encrypted credentials if not provided in payload
    if (!activeSession && user?.leetcodeAuth?.sessionCookie) {
      try {
        activeSession = decryptData(user.leetcodeAuth.sessionCookie);
        if (user.leetcodeAuth.csrfToken) {
          activeCsrf = decryptData(user.leetcodeAuth.csrfToken);
        }
      } catch {}
    }

    if (!activeSession) {
      return errorResponse("LeetCode Session Cookie required. Please connect your LeetCode account.");
    }

    // Optionally save/update credentials
    if (saveCredentials && sessionCookie) {
      await usersCollection.updateOne(
        { username: auth.payload.username },
        {
          $set: {
            leetcodeAuth: {
              sessionCookie: encryptData(sessionCookie),
              csrfToken: csrfToken ? encryptData(csrfToken) : "",
              updatedAt: new Date().toISOString(),
            },
          },
        }
      );
    }

    const result = await submitDirectToLeetCode(
      activeSession,
      activeCsrf,
      slug,
      questionId,
      code,
      language || "python3"
    );

    return NextResponse.json({
      success: result.success,
      result,
    });
  } catch (error: any) {
    console.error("Error in LeetCode submit API:", error);
    return errorResponse(error?.message || "Failed to submit to LeetCode", {}, 500);
  }
}
