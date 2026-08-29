import { NextRequest, NextResponse } from "next/server";
import { useMongo } from "@/lib/database/useMongo";
import { errorResponse, requireAuthResponse, enforceRateLimit } from "@/server/utils/functions";

export async function POST(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  const rate = await enforceRateLimit(`mark_att:${auth.payload.username}`, 10, 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ success: false, message: "Too many requests. Please wait." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { code } = body;
    if (!code || typeof code !== "string" || !/^[A-Za-z]\d{6}$/.test(code.trim())) {
      return errorResponse("Invalid attendance code format (must be 1 letter + 6 digits, e.g. A123456).");
    }

    const cleanCode = code.trim().toUpperCase();

    const initDb = await useMongo();
    const user = await initDb.db("college_db").collection<any>("users").findOne(
      { username: auth.payload.username },
      { projection: { sessionId: 1 } }
    );

    if (!user?.sessionId) {
      return errorResponse("No active portal session found. Please initiate a session on your dashboard first.", {}, 400);
    }

    const SUBMIT_URL = "https://student.srmap.edu.in/srmapstudentcorner/students/transaction/studentattendanceresources.jsp";
    const payload = new URLSearchParams({
      acode: cleanCode,
      dynamiclatdata: "0",
      dynamiclonxdata: "0",
      ids: "1",
    }).toString();

    const markRes = await fetch(SUBMIT_URL, {
      method: "POST",
      body: payload,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0",
        Cookie: `JSESSIONID=${user.sessionId}`,
      },
    });

    const text = await markRes.text();
    let resData: any = {};
    try {
      resData = JSON.parse(text.trim());
    } catch {
      resData = JSON.parse(text.replace(/<[^>]+>/g, "").trim());
    }

    if (resData.resultstatus === "1") {
      return NextResponse.json({
        success: true,
        message: `Attendance marked successfully for code ${cleanCode}!`,
        result: resData.result,
      });
    } else if (typeof resData.result === "string" && resData.result.includes("already")) {
      return NextResponse.json({
        success: true,
        message: `Attendance was already marked for code ${cleanCode}.`,
        result: resData.result,
      });
    } else {
      return errorResponse(resData.result || "Failed to mark attendance. Invalid or expired code.", {}, 400);
    }
  } catch (error: any) {
    console.error("Error marking attendance:", error);
    return errorResponse("Failed to communicate with university server. Please try again.", {}, 500);
  }
}
