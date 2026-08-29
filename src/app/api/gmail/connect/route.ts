import { NextRequest, NextResponse } from "next/server";
import { getGmailAuthUrl } from "@/server/gmail/gmailService";
import { errorResponse, requireAuthResponse } from "@/server/utils/functions";

function getValidOrigin(req: NextRequest): string {
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
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const origin = getValidOrigin(req);
    const redirectUri = `${origin}/api/gmail/callback`;
    const searchParams = req.nextUrl.searchParams;
    const returnTo = searchParams.get("returnTo") || "/dashboard";

    const statePayload = Buffer.from(
      JSON.stringify({ username: auth.payload.username, returnTo, origin })
    ).toString("base64");

    const authUrl = getGmailAuthUrl(redirectUri, statePayload);

    return NextResponse.json({ success: true, authUrl });
  } catch (error: any) {
    console.error("Error generating Google Auth URL:", error);
    return errorResponse("Failed to generate Google Auth URL", {}, 500);
  }
}
