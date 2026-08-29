import { NextRequest, NextResponse } from "next/server";
import { getGoogleOAuth2Client } from "@/server/classroom/classroomService";
import { useMongo } from "@/lib/database/useMongo";
import { encryptData } from "@/server/utils/functions";
import { google } from "googleapis";

function getCanonicalOrigin(): string {
  if (process.env.APP_ORIGIN) {
    return process.env.APP_ORIGIN.replace(/\/$/, "");
  }
  return "https://3.87.134.201.sslip.io";
}

export async function GET(req: NextRequest) {
  const origin = getCanonicalOrigin();
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/classroom?oauth_error=missing_params`);
  }

  try {
    const initDb = await useMongo();
    const statesCol = initDb.db("college_db").collection("oauth_states");

    // Atomically find and consume single-use state nonce (never decode username from state!)
    const stateDoc = await statesCol.findOneAndUpdate(
      {
        stateNonce: state,
        used: false,
        expiresAt: { $gt: new Date() },
      },
      {
        $set: { used: true, usedAt: new Date() },
      },
      { returnDocument: "before" }
    );

    if (!stateDoc) {
      console.warn("Rejected Google Classroom OAuth callback with invalid or expired state nonce.");
      return NextResponse.redirect(`${origin}/classroom?oauth_error=invalid_or_expired_state`);
    }

    const username = stateDoc.username;
    const returnTo = stateDoc.returnTo || "/classroom";

    const redirectUri = `${origin}/api/google/callback`;
    const oauth2Client = getGoogleOAuth2Client(redirectUri);
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      console.warn("No refresh token received during Classroom OAuth token exchange.");
    }

    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    const encryptedRefreshToken = tokens.refresh_token ? encryptData(tokens.refresh_token) : null;
    const encryptedAccessToken = tokens.access_token ? encryptData(tokens.access_token) : null;

    const credentialPayload: any = {
      email: userInfo.data.email,
      name: userInfo.data.name,
      picture: userInfo.data.picture,
      connectedAt: new Date().toISOString(),
    };
    if (encryptedRefreshToken) credentialPayload.refreshToken = encryptedRefreshToken;
    if (encryptedAccessToken) credentialPayload.accessToken = encryptedAccessToken;

    // Save under unified googleOAuth and google object
    await initDb.db("college_db").collection("users").updateOne(
      { username },
      {
        $set: {
          googleOAuth: credentialPayload,
          google: credentialPayload,
        },
      }
    );

    const cleanReturn = returnTo.includes("?")
      ? `${returnTo}&google=connected`
      : `${returnTo}?google=connected`;

    return NextResponse.redirect(`${origin}${cleanReturn}`);
  } catch (error: any) {
    console.error("Error during secure Google Classroom OAuth callback:", error?.message || error);
    return NextResponse.redirect(`${origin}/classroom?oauth_error=callback_failed`);
  }
}
