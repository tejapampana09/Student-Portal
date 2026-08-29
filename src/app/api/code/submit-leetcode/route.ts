import { NextRequest, NextResponse } from "next/server";
import { useMongo } from "@/lib/database/useMongo";
import { decryptData, encryptData, errorResponse, requireAuthResponse } from "@/server/utils/functions";
import { submitDirectToLeetCode } from "@/server/code/leetcodeSubmitService";
import jwt from "jsonwebtoken";

export async function GET(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const initDb = await useMongo();
    const user = await initDb.db("college_db").collection<any>("users").findOne(
      { username: auth.payload.username },
      { projection: { leetcodeAuth: 1 } }
    );

    const isConnected = !!user?.leetcodeAuth?.sessionCookie;
    let leetcodeUsername = user?.leetcodeAuth?.username || "";

    if (isConnected && !leetcodeUsername && user?.leetcodeAuth?.sessionCookie) {
      try {
        const decrypted = String(decryptData(user.leetcodeAuth.sessionCookie));
        const decoded: any = jwt.decode(decrypted);
        if (decoded?.username) {
          leetcodeUsername = decoded.username;
        }
      } catch {}
    }

    return NextResponse.json({
      success: true,
      isConnected,
      hasSavedCredentials: isConnected,
      leetcodeUsername: leetcodeUsername || (isConnected ? "Connected Account" : null),
      connectedAt: user?.leetcodeAuth?.updatedAt || null,
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
    const { action, sessionCookie, csrfToken, slug, questionId, code, language } = body;

    const initDb = await useMongo();
    const usersCollection = initDb.db("college_db").collection<any>("users");
    const user = await usersCollection.findOne({ username: auth.payload.username });

    // Action 1: Connect Account Explicitly
    if (action === "connect") {
      if (!sessionCookie || typeof sessionCookie !== "string" || sessionCookie.trim().length < 20) {
        return errorResponse("Valid LEETCODE_SESSION cookie is required.");
      }

      let leetcodeUsername = "";
      try {
        const clean = sessionCookie.replace(/^LEETCODE_SESSION=/, "").trim();
        const decoded: any = jwt.decode(clean);
        if (decoded?.username) {
          leetcodeUsername = decoded.username;
        }
      } catch {}

      await usersCollection.updateOne(
        { username: auth.payload.username },
        {
          $set: {
            leetcodeAuth: {
              sessionCookie: encryptData(sessionCookie.trim()),
              csrfToken: csrfToken ? encryptData(csrfToken.trim()) : "",
              username: leetcodeUsername,
              updatedAt: new Date().toISOString(),
            },
          },
        }
      );

      return NextResponse.json({
        success: true,
        message: "LeetCode account connected securely!",
        leetcodeUsername: leetcodeUsername || "Connected Account",
      });
    }

    // Action 2: Disconnect Account
    if (action === "disconnect") {
      await usersCollection.updateOne(
        { username: auth.payload.username },
        { $unset: { leetcodeAuth: "" } }
      );
      return NextResponse.json({ success: true, message: "LeetCode account disconnected." });
    }

    // Action 3: Direct Automatic Submission
    if (!slug || !questionId || !code) {
      return errorResponse("Slug, questionId, and code are required.");
    }

    let activeSession = sessionCookie;
    let activeCsrf = csrfToken;

    // Pull encrypted credentials from user record
    if (!activeSession && user?.leetcodeAuth?.sessionCookie) {
      try {
        activeSession = String(decryptData(user.leetcodeAuth.sessionCookie));
        if (user.leetcodeAuth.csrfToken) {
          activeCsrf = String(decryptData(user.leetcodeAuth.csrfToken));
        }
      } catch {}
    }

    if (!activeSession) {
      return errorResponse("LeetCode account not connected. Please connect your account once to enable automatic submissions.", {}, 401);
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
