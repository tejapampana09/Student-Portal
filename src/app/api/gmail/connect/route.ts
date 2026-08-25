import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { getGmailAuthUrl } from "@/server/gmail/gmailService";
import { requireAuthResponse } from "@/server/utils/functions";
import { useMongo } from "@/lib/database/useMongo";

export async function GET(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const accessSecret = process.env.ACCESS_SECRET;
    if (!accessSecret) {
      return NextResponse.json({ success: false, message: "Server configuration error" }, { status: 500 });
    }

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "3.87.134.201.sslip.io";
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const redirectUri = `${proto}://${host}/api/gmail/callback`;

    // Generate secure random nonce
    const nonce = crypto.randomBytes(32).toString("hex");

    // Store nonce in database with 10-minute expiry
    const initDb = await useMongo();
    await initDb.db("college_db").collection("oauth_states").insertOne({
      nonce,
      username: auth.payload.username,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Sign cryptographic state
    const signedState = jwt.sign(
      {
        nonce,
        username: auth.payload.username,
      },
      accessSecret,
      { expiresIn: "10m" }
    );

    const authUrl = getGmailAuthUrl(redirectUri, signedState);

    return NextResponse.json({ success: true, authUrl });
  } catch (error: any) {
    console.error("Error generating Gmail auth URL:", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to initiate Gmail connection" }, { status: 500 });
  }
}
