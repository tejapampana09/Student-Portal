import { NextRequest, NextResponse } from "next/server";
import { useMongo } from "@/lib/database/useMongo";
import { decryptData } from "@/server/utils/functions";
import { generateAttendanceSpeech } from "@/server/voice/voiceService";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") || req.headers.get("x-voice-token");

  if (!token) {
    return NextResponse.json({ error: "Missing voice token" }, { status: 401 });
  }

  try {
    const initDb = await useMongo();
    const user = await initDb.db("college_db").collection<any>("users").findOne({ voiceToken: token });

    if (!user || !user.data) {
      return NextResponse.json({ speech: "Invalid voice authentication key.", title: "Unauthorized" }, { status: 401 });
    }

    const studentData: any = decryptData(user.data);
    const speechResult = generateAttendanceSpeech(studentData);

    return NextResponse.json(speechResult);
  } catch (error: any) {
    return NextResponse.json({ speech: "Error calculating attendance.", error: error.message }, { status: 500 });
  }
}
