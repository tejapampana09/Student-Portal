import { NextRequest, NextResponse } from "next/server";
import { getOAuth2Client } from "@/server/gmail/gmailService";
import { useMongo } from "@/lib/database/useMongo";
import { encryptData } from "@/server/utils/functions";
import { google } from "googleapis";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");

  if (!code || !stateRaw) {
    return NextResponse.redirect(new URL("/dashboard?gmail=error", req.url));
  }

  try {
    let stateData: any = {};
    try {
      stateData = JSON.parse(Buffer.from(stateRaw, "base64").toString("utf-8"));
    } catch {}

    const { username, origin } = stateData;
    if (!username) {
      return NextResponse.redirect(new URL("/dashboard?gmail=invalid_state", req.url));
    }

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "3.87.134.201.sslip.io";
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const redirectUri = `${proto}://${host}/api/gmail/callback`;

    const oauth2Client = getOAuth2Client(redirectUri);
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      // If prompt consent wasn't forced, check if we already have one or proceed with existing
      console.warn("No refresh_token returned by Google");
    }

    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const userEmail = userInfo.data.email || "";

    const initDb = await useMongo();
    const usersCollection = initDb.db("college_db").collection("users");

    const updateDoc: any = {
      "gmail.email": userEmail,
      "gmail.connectedAt": new Date().toISOString(),
    };

    if (tokens.refresh_token) {
      updateDoc["gmail.refreshToken"] = encryptData(tokens.refresh_token);
    }
    if (tokens.access_token) {
      updateDoc["gmail.accessToken"] = encryptData(tokens.access_token);
    }

    await usersCollection.updateOne(
      { username },
      { $set: updateDoc }
    );

    const redirectBase = origin || `${proto}://${host}`;
    return NextResponse.redirect(new URL("/dashboard?gmail=connected", redirectBase));
  } catch (error) {
    console.error("Error in Gmail OAuth callback:", error);
    return NextResponse.redirect(new URL("/dashboard?gmail=failed", req.url));
  }
}
