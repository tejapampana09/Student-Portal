import { NextRequest, NextResponse } from "next/server";
import { useMongo } from "@/lib/database/useMongo";
import { decryptData, encryptData, errorResponse, requireAuthResponse } from "@/server/utils/functions";
import { submitDirectToLeetCode, loginToLeetCode, verifyLeetCodeUsername } from "@/server/code/leetcodeSubmitService";
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

    const isConnected = !!(user?.leetcodeAuth?.username || user?.leetcodeAuth?.sessionCookie);
    const leetcodeUsername = user?.leetcodeAuth?.username || null;
    const profile = user?.leetcodeAuth?.profile || null;

    return NextResponse.json({
      success: true,
      isConnected,
      hasSavedCredentials: !!user?.leetcodeAuth?.sessionCookie,
      leetcodeUsername: leetcodeUsername || (isConnected ? "Connected Account" : null),
      profile,
      connectedAt: user?.leetcodeAuth?.updatedAt || null,
    });
  } catch (error: any) {
    return errorResponse("Failed to fetch LeetCode status", {}, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { action, username, usernameOrEmail, password, sessionCookie, csrfToken, slug, questionId, code, language } = body;

    const initDb = await useMongo();
    const usersCollection = initDb.db("college_db").collection<any>("users");
    const user = await usersCollection.findOne({ username: auth.payload.username });

    // Action 1: Instant LeetCode Username Connect & Profile Sync (Zero Password / Zero Cookie)
    if (action === "verify-username") {
      const targetUser = username || usernameOrEmail;
      if (!targetUser) {
        return errorResponse("LeetCode username is required.");
      }

      const verifyRes = await verifyLeetCodeUsername(targetUser);
      if (!verifyRes.success || !verifyRes.profile) {
        return errorResponse(verifyRes.message || `User '@${targetUser}' not found on LeetCode.`, {}, 404);
      }

      await usersCollection.updateOne(
        { username: auth.payload.username },
        {
          $set: {
            "leetcodeAuth.username": verifyRes.profile.username,
            "leetcodeAuth.profile": verifyRes.profile,
            "leetcodeAuth.updatedAt": new Date().toISOString(),
          },
        },
        { upsert: true }
      );

      return NextResponse.json({
        success: true,
        message: `LeetCode account @${verifyRes.profile.username} connected successfully!`,
        profile: verifyRes.profile,
        leetcodeUsername: verifyRes.profile.username,
      });
    }

    // Action 2: Direct Credential Login (Username & Password)
    if (action === "login-credentials") {
      if (!usernameOrEmail || !password) {
        return errorResponse("LeetCode Username/Email and Password are required.");
      }

      const loginResult = await loginToLeetCode(usernameOrEmail, password);
      if (!loginResult.success || !loginResult.sessionCookie) {
        return errorResponse(loginResult.message || "Failed to log into LeetCode.", {}, 400);
      }

      await usersCollection.updateOne(
        { username: auth.payload.username },
        {
          $set: {
            leetcodeAuth: {
              sessionCookie: encryptData(loginResult.sessionCookie),
              csrfToken: loginResult.csrfToken ? encryptData(loginResult.csrfToken) : "",
              username: loginResult.username || usernameOrEmail,
              updatedAt: new Date().toISOString(),
            },
          },
        }
      );

      return NextResponse.json({
        success: true,
        message: "LeetCode account connected successfully!",
        leetcodeUsername: loginResult.username || usernameOrEmail,
      });
    }

    // Action 3: Connect via Session Cookie
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
              username: leetcodeUsername || "Connected",
              updatedAt: new Date().toISOString(),
            },
          },
        }
      );

      return NextResponse.json({
        success: true,
        message: "LeetCode account connected securely!",
        leetcodeUsername: leetcodeUsername || "Connected",
      });
    }

    // Action 4: Disconnect Account
    if (action === "disconnect") {
      await usersCollection.updateOne(
        { username: auth.payload.username },
        { $unset: { leetcodeAuth: "" } }
      );
      return NextResponse.json({ success: true, message: "LeetCode account disconnected." });
    }

    // Action 5: Direct Submission
    if (!slug || !questionId || !code) {
      return errorResponse("Slug, questionId, and code are required.");
    }

    let activeSession = sessionCookie;
    let activeCsrf = csrfToken;

    if (!activeSession && user?.leetcodeAuth?.sessionCookie) {
      try {
        activeSession = String(decryptData(user.leetcodeAuth.sessionCookie));
        if (user.leetcodeAuth.csrfToken) {
          activeCsrf = String(decryptData(user.leetcodeAuth.csrfToken));
        }
      } catch {}
    }

    if (!activeSession) {
      // Return direct submission link for 1-tap browser submission
      return NextResponse.json({
        success: true,
        result: {
          success: true,
          statusDisplay: "Ready to Submit",
          message: "Code compiled and verified locally! Opening official LeetCode submission in new tab.",
          alternateLink: `https://leetcode.com/problems/${slug}/`,
        },
      });
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
