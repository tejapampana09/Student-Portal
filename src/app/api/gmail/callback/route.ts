import { NextRequest, NextResponse } from "next/server";
import { getOAuth2Client } from "@/server/gmail/gmailService";
import { useMongo } from "@/lib/database/useMongo";
import { encryptData } from "@/server/utils/functions";
import { google } from "googleapis";

function getValidOrigin(req: NextRequest, stateOrigin?: string): string {
  if (stateOrigin && !stateOrigin.includes("0.0.0.0")) return stateOrigin;

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");

  if (host && !host.includes("0.0.0.0")) {
    return `${proto}://${host}`;
  }

  const reqOrigin = req.nextUrl?.origin || "";
  if (reqOrigin && !reqOrigin.includes("0.0.0.0")) {
    return reqOrigin;
  }

  return "https://3.87.134.201.sslip.io";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  let returnTo = "/classroom";
  let stateOrigin = "";

  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
      if (decoded.returnTo) returnTo = decoded.returnTo;
      if (decoded.origin) stateOrigin = decoded.origin;
    } catch {}
  }

  const origin = getValidOrigin(req, stateOrigin);

  if (!code || !state) {
    return NextResponse.redirect(`${origin}${returnTo}?google=error`);
  }

  try {
    let username = "";
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
      username = decoded.username;
    } catch {
      username = state;
    }

    const redirectUri = `${origin}/api/gmail/callback`;
    const oauth2Client = getOAuth2Client(redirectUri);
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      const newAuth = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: true,
        scope: [
          "https://www.googleapis.com/auth/classroom.courses.readonly",
          "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
          "https://www.googleapis.com/auth/classroom.student-submissions.me.readonly",
          "https://www.googleapis.com/auth/classroom.announcements.readonly",
          "https://www.googleapis.com/auth/gmail.readonly",
          "https://www.googleapis.com/auth/userinfo.email",
          "https://www.googleapis.com/auth/userinfo.profile",
        ],
        state,
      });
      return NextResponse.redirect(newAuth);
    }

    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    const encryptedRefreshToken = encryptData(tokens.refresh_token);
    const encryptedAccessToken = tokens.access_token ? encryptData(tokens.access_token) : null;

    const initDb = await useMongo();
    await initDb.db("college_db").collection("users").updateOne(
      { username },
      {
        $set: {
          google: {
            email: userInfo.data.email,
            name: userInfo.data.name,
            picture: userInfo.data.picture,
            refreshToken: encryptedRefreshToken,
            accessToken: encryptedAccessToken,
            connectedAt: new Date().toISOString(),
          },
          gmail: {
            email: userInfo.data.email,
            name: userInfo.data.name,
            picture: userInfo.data.picture,
            refreshToken: encryptedRefreshToken,
            accessToken: encryptedAccessToken,
            connectedAt: new Date().toISOString(),
          },
        },
      }
    );

    const cleanReturn = returnTo.includes("?")
      ? `${returnTo}&google=connected&gmail=connected`
      : `${returnTo}?google=connected&gmail=connected`;
    return NextResponse.redirect(`${origin}${cleanReturn}`);
  } catch (error) {
    console.error("Error during Google OAuth callback:", error);
    return NextResponse.redirect(`${origin}${returnTo}?google=error`);
  }
}
