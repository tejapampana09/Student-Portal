import { NextRequest, NextResponse } from "next/server";
import { getGoogleOAuth2Client } from "@/server/classroom/classroomService";
import { useMongo } from "@/lib/database/useMongo";
import { encryptData } from "@/server/utils/functions";
import { google } from "googleapis";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const origin = req.nextUrl.origin;

  let returnTo = "/classroom";

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/classroom?google=error`);
  }

  try {
    let username = "";
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
      username = decoded.username;
      if (decoded.returnTo) returnTo = decoded.returnTo;
    } catch {
      username = state;
    }

    const redirectUri = `${origin}/api/google/callback`;
    const oauth2Client = getGoogleOAuth2Client(redirectUri);
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
          // Keep legacy sync compatibility
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

    const cleanReturn = returnTo.includes("?") ? `${returnTo}&google=connected` : `${returnTo}?google=connected`;
    return NextResponse.redirect(`${origin}${cleanReturn}`);
  } catch (error) {
    console.error("Error during Google OAuth callback:", error);
    return NextResponse.redirect(`${origin}/classroom?google=error`);
  }
}
