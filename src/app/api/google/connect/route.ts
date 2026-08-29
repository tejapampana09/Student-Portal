import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getGoogleAuthUrl } from "@/server/classroom/classroomService";
import { errorResponse, requireAuthResponse } from "@/server/utils/functions";
import { useMongo } from "@/lib/database/useMongo";

function getCanonicalOrigin(req: NextRequest): string {
  if (process.env.APP_ORIGIN) {
    return process.env.APP_ORIGIN.replace(/\/$/, "");
  }
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || req.nextUrl.host;
  const proto = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol.replace(":", "") || "https";
  if (host) {
    return `${proto}://${host}`;
  }
  return "https://13.233.246.195.sslip.io";
}

function sanitizeReturnTo(path: string | null): string {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return "/classroom";
  }
  return path;
}

export async function GET(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const origin = getCanonicalOrigin(req);
    const redirectUri = `${origin}/api/google/callback`;
    const searchParams = req.nextUrl.searchParams;
    const returnTo = sanitizeReturnTo(searchParams.get("returnTo"));

    // Generate cryptographic 32-byte state nonce
    const stateNonce = crypto.randomBytes(32).toString("hex");

    // Persist single-use state nonce with 10-min TTL in DB
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

    const authUrl = getGoogleAuthUrl(redirectUri, stateNonce);

    return NextResponse.json({ success: true, authUrl });
  } catch (error: any) {
    console.error("Error generating Google Auth URL:", error);
    return errorResponse("Failed to generate Google Auth URL", {}, 500);
  }
}
