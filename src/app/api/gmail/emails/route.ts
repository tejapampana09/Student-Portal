import { NextRequest, NextResponse } from "next/server";
import { useMongo } from "@/lib/database/useMongo";
import { decryptData, errorResponse, requireAuthResponse } from "@/server/utils/functions";
import { fetchStudentEmails } from "@/server/gmail/gmailService";

export async function GET(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const initDb = await useMongo();
    const user = await initDb.db("college_db").collection<any>("users").findOne(
      { username: auth.payload.username },
      { projection: { gmail: 1 } }
    );

    if (!user?.gmail?.refreshToken) {
      return NextResponse.json({
        success: true,
        connected: false,
        emails: [],
      });
    }

    const decrypted = decryptData(String(user.gmail.refreshToken));
    const refreshToken = typeof decrypted === "string" ? decrypted : JSON.stringify(decrypted);
    const emails = await fetchStudentEmails(refreshToken, 8);

    return NextResponse.json({
      success: true,
      connected: true,
      email: user.gmail.email || "",
      emails,
    });
  } catch (error: any) {
    console.error("Error in /api/gmail/emails:", error);
    return errorResponse("Failed to fetch emails", {}, 500);
  }
}
