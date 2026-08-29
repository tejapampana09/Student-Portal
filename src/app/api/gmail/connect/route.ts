import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getGmailAuthUrl } from "@/server/gmail/gmailService";
import { errorResponse, requireAuthResponse } from "@/server/utils/functions";
import { useMongo } from "@/lib/database/useMongo";

function getCanonicalOrigin(): string {
  if (process.env.APP_ORIGIN) {
    return process.env.APP_ORIGIN.replace(/\/$/, "");
  }
  return "https://3.87.134.201.sslip.io";
}

function sanitizeReturnTo(path: string | null): string {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return "/dashboard";
  }
  return path;
}

export async function GET(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const origin = getCanonicalOrigin();
    const redirectUri = `${origin}/api/gmail/callback`;
    const searchParams = req.nextUrl.searchParams;
    const returnTo = sanitizeReturnTo(searchParams.get("returnTo"));

    const stateNonce = crypto.randomBytes(32).toString("hex");

    const initDb = await useMongo();
    await initDb.db("college_db").collection("oauth_states").insertOne({
      stateNonce,
      username: auth.payload.username,
      returnTo,
      origin,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      used: false,
    });

    const authUrl = getGmailAuthUrl(redirectUri, stateNonce);

    return NextResponse.json({ success: true, authUrl });
  } catch (error: any) {
    console.error("Error generating Gmail Auth URL:", error);
    return errorResponse("Failed to generate Gmail Auth URL", {}, 500);
  }
}
