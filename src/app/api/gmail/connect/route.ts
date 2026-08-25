import { NextRequest, NextResponse } from "next/server";
import { getGmailAuthUrl } from "@/server/gmail/gmailService";
import { requireAuthResponse } from "@/server/utils/functions";

export async function GET(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "3.87.134.201.sslip.io";
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const redirectUri = `${proto}://${host}/api/gmail/callback`;

    const state = JSON.stringify({
      username: auth.payload.username,
      origin: `${proto}://${host}`,
    });

    const authUrl = getGmailAuthUrl(redirectUri, Buffer.from(state).toString("base64"));

    return NextResponse.json({ success: true, authUrl });
  } catch (error: any) {
    console.error("Error generating Gmail auth URL:", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to initiate Gmail connection" }, { status: 500 });
  }
}
