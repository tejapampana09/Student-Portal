import { NextRequest, NextResponse } from "next/server";
import { useMongo } from "@/lib/database/useMongo";
import { errorResponse, requireAuthResponse } from "@/server/utils/functions";

export async function POST(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const initDb = await useMongo();
    // Completely purge all Google OAuth credentials to guarantee zero orphaned tokens
    await initDb.db("college_db").collection("users").updateOne(
      { username: auth.payload.username },
      { $unset: { googleOAuth: "", google: "", gmail: "" } }
    );

    return NextResponse.json({
      success: true,
      message: "Google Classroom & connected Google services disconnected successfully",
    });
  } catch (error: any) {
    console.error("Error disconnecting Google:", error);
    return errorResponse("Failed to disconnect Google account", {}, 500);
  }
}
