import { NextRequest, NextResponse } from "next/server";
import { useMongo } from "@/lib/database/useMongo";
import { requireAuthResponse, errorResponse, decryptData } from "@/server/utils/functions";
import { handleUserSession } from "@/server/auth/handleUserSession";
import axios from "axios";
import { httpsAgent } from "@/server/utils/httpAgents";

const httpMarkClient = axios.create({
  httpsAgent,
  timeout: 10000,
  validateStatus: () => true,
});

const SUBMIT_URL = "https://student.srmap.edu.in/srmapstudentcorner/students/transaction/studentattendanceresources.jsp";

async function postAttendance(code: string, sessionId: string) {
  const payload = new URLSearchParams({
    acode: code.trim().toUpperCase(),
    dynamiclatdata: "0",
    dynamiclonxdata: "0",
    ids: "1",
  }).toString();

  const response = await httpMarkClient.post(SUBMIT_URL, payload, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0",
      "Cookie": `JSESSIONID=${sessionId}`,
    },
    responseType: "text",
  });

  const text = String(response.data || "");
  let responseData: any = null;
  try {
    responseData = JSON.parse(text.trim());
  } catch {
    try {
      const jsonString = text.replace(/<[^>]+>/g, "").trim();
      responseData = JSON.parse(jsonString);
    } catch {
      responseData = null;
    }
  }

  const isSessionExpired =
    text.includes("StudentLoginPage") ||
    text.includes("Session Expired") ||
    text.includes("Please login again") ||
    (responseData && typeof responseData.result === "string" && responseData.result.toLowerCase().includes("session"));

  return { response, text, responseData, isSessionExpired };
}

import { cleanSpokenCode } from "@/shared/utils/voiceUtils";
export { cleanSpokenCode };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawCode = searchParams.get("code") || "";
  const code = cleanSpokenCode(rawCode);

  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) {
    return NextResponse.json(
      { success: false, message: "Please log in to use voice attendance.", spokenText: "Please log in to student portal first." },
      { status: 401 }
    );
  }

  return await executeVoiceAttendance(auth.payload.username, code);
}

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const rawCode = body.code || "";
  const code = cleanSpokenCode(rawCode);

  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) {
    return NextResponse.json(
      { success: false, message: "Please log in to use voice attendance.", spokenText: "Please log in to student portal first." },
      { status: 401 }
    );
  }

  return await executeVoiceAttendance(auth.payload.username, code);
}

async function executeVoiceAttendance(username: string, code: string) {
  if (!code || !/^[A-Z]\d{6}$/.test(code)) {
    return NextResponse.json({
      success: false,
      message: "Invalid attendance code format. Code must be 1 letter followed by 6 digits (e.g. A123456).",
      spokenText: "Invalid code. Please say a letter followed by six numbers.",
    }, { status: 400 });
  }

  try {
    let db: any = null;
    let userDoc: any = null;
    try {
      const initDb = await useMongo();
      db = initDb.db("college_db").collection("users");
      userDoc = await db.findOne({ username });
    } catch (dbErr) {
      console.warn("[Voice Attendance] DB error:", dbErr);
    }

    if (!userDoc?.portal_password) {
      return NextResponse.json({
        success: false,
        message: "No saved password found in database. Please log in on the web portal.",
        spokenText: "Please log in to the student portal to save your portal password.",
      }, { status: 401 });
    }

    const password = String(decryptData(userDoc.portal_password));
    const sessionRes = await handleUserSession({ username, password });

    if (!sessionRes.success || !sessionRes.sessionId) {
      return NextResponse.json({
        success: false,
        message: sessionRes.message || "Failed to initiate SRM session",
        spokenText: "Failed to connect to SRM portal. Please check your credentials.",
      }, { status: 500 });
    }

    const { responseData, isSessionExpired } = await postAttendance(code, sessionRes.sessionId);

    if (responseData?.resultstatus === "1") {
      return NextResponse.json({
        success: true,
        code,
        message: "Attendance Captured Successfully!",
        spokenText: `Boom! Attendance captured for ${username} with code ${code}!`,
      });
    } else if (typeof responseData?.result === "string" && responseData.result.includes("Your Attendance captured al")) {
      return NextResponse.json({
        success: true,
        code,
        message: "Attendance Captured Already!",
        spokenText: `Attendance was already captured for ${username}.`,
      });
    } else if (typeof responseData?.result === "string" && responseData.result.includes("Wrong Attendance")) {
      return NextResponse.json({
        success: false,
        code,
        message: "Wrong Attendance Code!",
        spokenText: `Sorry, code ${code} was rejected by SRM as incorrect.`,
      }, { status: 404 });
    } else {
      return NextResponse.json({
        success: false,
        code,
        message: responseData?.result || "Could not mark attendance",
        spokenText: `Could not mark attendance: ${responseData?.result || "Incorrect code"}`,
      }, { status: 400 });
    }
  } catch (err: any) {
    console.error("[Voice Attendance] Error:", err?.message || err);
    return NextResponse.json({
      success: false,
      message: err?.message || "Internal server error",
      spokenText: "An error occurred while marking attendance.",
    }, { status: 500 });
  }
}
