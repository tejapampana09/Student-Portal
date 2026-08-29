import { NextRequest, NextResponse } from "next/server";
import { useMongo } from "@/lib/database/useMongo";
import { decryptData, errorResponse, requireAuthResponse } from "@/server/utils/functions";
import { fetchStudentEmails } from "@/server/gmail/gmailService";

export async function GET(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const initDb = await useMongo();
    const user = await initDb.db("college_db").collection<any>("users").findOne({ username: auth.payload.username });

    if (!user || !user.gmail || !user.gmail.refreshToken) {
      return NextResponse.json({
        success: true,
        connected: false,
        isConnected: false,
        emails: [],
      });
    }

    const decrypted = decryptData(String(user.gmail.refreshToken));
    const refreshToken = typeof decrypted === "string" ? decrypted : JSON.stringify(decrypted);

    const emails = await fetchStudentEmails(refreshToken, 10);

    return NextResponse.json({
      success: true,
      connected: true,
      isConnected: true,
      email: user.gmail.email,
      name: user.gmail.name,
      picture: user.gmail.picture,
      emails,
    });
  } catch (error: any) {
    console.error("Error in Gmail emails API:", error);
    return errorResponse(error?.message || "Failed to fetch emails", {}, 500);
  }
}
