import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getOAuth2Client } from "@/server/gmail/gmailService";
import { useMongo } from "@/lib/database/useMongo";
import { encryptData } from "@/server/utils/functions";
import { google } from "googleapis";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");

  // Determine correct public domain base URL
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "3.87.134.201.sslip.io";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const baseUrl = `${proto}://${host}`;

  if (!code || !stateRaw) {
    return NextResponse.redirect(new URL("/classroom?gmail=error", baseUrl));
  }

  const accessSecret = process.env.ACCESS_SECRET;
  if (!accessSecret) {
    return NextResponse.redirect(new URL("/classroom?gmail=server_error", baseUrl));
  }

  try {
    // 1. Cryptographically verify the signed state
    let statePayload: any;
    try {
      statePayload = jwt.verify(stateRaw, accessSecret);
    } catch {
      return NextResponse.redirect(new URL("/classroom?gmail=invalid_state", baseUrl));
    }

    const { username, nonce, returnTo } = statePayload;
    const destination = returnTo || "/classroom";

    if (!username || !nonce) {
      return NextResponse.redirect(new URL(`${destination}?gmail=invalid_state`, baseUrl));
    }

    // 2. Atomically verify and consume the server-side one-time nonce
    const initDb = await useMongo();
    const stateDoc = await initDb.db("college_db").collection("oauth_states").findOneAndDelete({
      nonce,
      username,
      expiresAt: { $gt: new Date() },
    });

    if (!stateDoc) {
      return NextResponse.redirect(new URL(`${destination}?gmail=expired_state`, baseUrl));
    }

    const redirectUri = `${baseUrl}/api/gmail/callback`;
    const oauth2Client = getOAuth2Client(redirectUri);
    const { tokens } = await oauth2Client.getToken(code);

    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const userEmail = userInfo.data.email || "";

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

    // 3. Clean redirect to designated target page
    return NextResponse.redirect(new URL(`${destination}?gmail=connected`, baseUrl));
  } catch (error) {
    console.error("Error in Gmail OAuth callback:", error);
    return NextResponse.redirect(new URL("/classroom?gmail=failed", baseUrl));
  }
}
