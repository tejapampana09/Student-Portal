import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { useMongo } from "@/lib/database/useMongo";
import { errorResponse, requireAuthResponse } from "@/server/utils/functions";

export async function GET(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const initDb = await useMongo();
    const user = await initDb.db("college_db").collection<any>("users").findOne(
      { username: auth.payload.username },
      { projection: { voiceToken: 1 } }
    );

    let token = user?.voiceToken;
    if (!token) {
      token = "srmap_voice_" + crypto.randomBytes(16).toString("hex");
      await initDb.db("college_db").collection("users").updateOne(
        { username: auth.payload.username },
        { $set: { voiceToken: token } }
      );
    }

    return NextResponse.json({ success: true, voiceToken: token });
  } catch (error: any) {
    return errorResponse("Failed to fetch voice token", {}, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const newToken = "srmap_voice_" + crypto.randomBytes(16).toString("hex");
    const initDb = await useMongo();
    await initDb.db("college_db").collection("users").updateOne(
      { username: auth.payload.username },
      { $set: { voiceToken: newToken } }
    );

    return NextResponse.json({ success: true, voiceToken: newToken, message: "Voice token regenerated!" });
  } catch (error: any) {
    return errorResponse("Failed to regenerate voice token", {}, 500);
  }
}
