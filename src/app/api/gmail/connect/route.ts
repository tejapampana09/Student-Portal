import { NextRequest, NextResponse } from "next/server";
import { getGmailAuthUrl } from "@/server/gmail/gmailService";
import { errorResponse, requireAuthResponse } from "@/server/utils/functions";

export async function GET(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const origin = req.nextUrl.origin;
    const redirectUri = `${origin}/api/gmail/callback`;
    const searchParams = req.nextUrl.searchParams;
    const returnTo = searchParams.get("returnTo") || "/dashboard";

    const statePayload = Buffer.from(
      JSON.stringify({ username: auth.payload.username, returnTo })
    ).toString("base64");

    const authUrl = getGmailAuthUrl(redirectUri, statePayload);

    return NextResponse.json({ success: true, authUrl });
  } catch (error: any) {
    console.error("Error generating Google Auth URL:", error);
    return errorResponse("Failed to generate Google Auth URL", {}, 500);
  }
}
