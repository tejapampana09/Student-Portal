import { NextRequest, NextResponse } from "next/server";
import { useMongo } from "@/lib/database/useMongo";
import { errorResponse, requireAuthResponse } from "@/server/utils/functions";

export async function POST(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const initDb = await useMongo();
    // Completely purge Gmail credentials from user document
    await initDb.db("college_db").collection("users").updateOne(
      { username: auth.payload.username },
      { $unset: { gmail: "", googleOAuth: "" } }
    );

    return NextResponse.json({
      success: true,
      message: "Gmail disconnected successfully",
    });
  } catch (error: any) {
    console.error("Error disconnecting Gmail:", error);
    return errorResponse("Failed to disconnect Gmail", {}, 500);
  }
}
