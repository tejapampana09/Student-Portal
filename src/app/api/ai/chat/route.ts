import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { useMongo } from "@/lib/database/useMongo";
import facultyData from "@/static/faculty.json";
import academicCalendar from "@/static/academic_calendar.json";
import { decryptData, errorResponse, requireAuthResponse, enforceRateLimit, isAdmin } from "@/server/utils/functions";
import { DateTime } from "luxon";

export async function POST(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  // Generous AI Rate Limit: 60 questions/min for students, 120/min for admins
  const maxAllowed = isAdmin(auth.payload.username) ? 120 : 60;
  const rate = await enforceRateLimit(`ai:user:${auth.payload.username}`, maxAllowed, 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        success: false,
        message: `Too many AI requests. Please wait ${rate.retryAfterSeconds}s before asking again.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        message: "Gemini API key is not configured on the server. Please set GEMINI_API_KEY in environment.",
      },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { messages, userQuery } = body;

    const query = userQuery || (Array.isArray(messages) && messages[messages.length - 1]?.content) || "";
    if (!query) {
      return errorResponse("Query is required");
    }

    const initDb = await useMongo();
    const user = await initDb.db("college_db").collection<any>("users").findOne(
      { username: auth.payload.username },
      { projection: { data: 1, username: 1, session_time: 1, sessionId: 1 } }
    );

    // ⚡ Direct Attendance Marking via AI
    const codeMatch = query.match(/\b([A-Za-z]\d{6})\b/);
    const isMarkIntent = /mark|attendance|code|submit|present/i.test(query);

    if (codeMatch && isMarkIntent) {
      const code = codeMatch[1].toUpperCase();
      if (!user?.sessionId) {
        return NextResponse.json({
          success: true,
          answer: `I found attendance code ${code}, but you don't have an active session yet. Please tap Initiate Session on your dashboard first, and I will mark it for you!`,
        });
      }

      try {
        const SUBMIT_URL = "https://student.srmap.edu.in/srmapstudentcorner/students/transaction/studentattendanceresources.jsp";
        const payload = new URLSearchParams({
          acode: code,
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
            answer: `✅ Success! Attendance marked successfully with code ${code}.`,
          });
        } else if (typeof resData.result === "string" && resData.result.includes("already")) {
          return NextResponse.json({
            success: true,
            answer: `ℹ️ Attendance for code ${code} was already marked!`,
          });
        } else {
          return NextResponse.json({
            success: true,
            answer: `❌ Could not mark attendance: ${resData.result || "Incorrect or expired code"}.`,
          });
        }
      } catch (err: any) {
        console.error("AI attendance marking failed:", err);
      }
    }

    let studentData: any = null;
    if (user?.data) {
      try {
        studentData = decryptData(user.data);
      } catch (e) {
        console.error("Failed to decrypt student data for AI:", e);
      }
    }

    const nowIST = DateTime.now().setZone("Asia/Kolkata");
    const currentDayOfWeek = nowIST.toFormat("cccc");
    const currentTimeStr = nowIST.toFormat("hh:mm a, dd-MMMM-yyyy");

    const contextPrompt = `
You are the official AI Academic Assistant & Copilot for SRM University-AP (SRMAP) Student Portal.
You have access to the authenticated student's real-time academic records.
Current Time in Campus (IST): ${currentTimeStr} (${currentDayOfWeek})

--- STUDENT PROFILE & ACADEMICS ---
Register Number: ${auth.payload.username}
Student Name: ${studentData?.profile?.studentName || studentData?.name || auth.payload.username}
Program / Section: ${studentData?.profile?.program || "B.Tech"} - ${studentData?.profile?.section || "N/A"}
Current Semester: ${studentData?.profile?.semester || "N/A"}
CGPA: ${JSON.stringify(studentData?.cgpa || "N/A")}

--- LIVE ATTENDANCE SUMMARY ---
${
  studentData?.attendance?.length
    ? studentData.attendance
        .map(
          (a: any) =>
            `• ${a.subject_name || a.subject_code} (${a.subject_code}): Attended ${a.present}/${a.classes_conducted} classes = ${a.attendance_percentage}% (Required: 75%)`
        )
        .join("\n")
    : "Attendance data not currently synced or available."
}

--- TIMETABLE SCHEDULE ---
${
  studentData?.timetable?.length
    ? studentData.timetable
        .map((t: any) => `Day ${t.day}: ${Array.isArray(t.subjects) ? t.subjects.join(" | ") : JSON.stringify(t)}`)
        .join("\n")
    : "Timetable data not available."
}

--- REGISTERED SUBJECTS & FACULTY ---
${
  studentData?.subjects?.length
    ? studentData.subjects
        .map((s: any) => `• ${s.code} - ${s.name}: Faculty: ${s.faculty || "N/A"} | Classroom: ${s.classrooms || "N/A"}`)
        .join("\n")
    : "Subjects list not available."
}

--- CAMPUS FACULTY CABIN DIRECTORY SAMPLE ---
${JSON.stringify(facultyData?.slice(0, 40) || [])}

--- ACADEMIC CALENDAR & UPCOMING EVENTS ---
${JSON.stringify(academicCalendar || [])}

--- RULES & GUIDELINES ---
1. ATTENDANCE & BUNK CALCULATION:
   - SRM minimum mandatory attendance is 75%.
   - If the student asks if they can skip/bunk a class: Calculate the new percentage precisely: (present) / (conducted + skipped).
   - Tell them clearly whether it stays above 75%, how many classes they can safely skip, or how many they must attend to reach 75%.
2. TIMETABLE & CLASSROOMS:
   - When asked where their next class is, check the current day of the week (${currentDayOfWeek}) and the time (${currentTimeStr}).
3. FACULTY CABINS:
   - Provide exact cabin number, floor, and building (e.g. TP401, Tech Park, Academic Block).
4. TONE, STYLE & FORMATTING (IMPORTANT):
   - Keep answers SHORT, CRISP, SIMPLE, and DIRECT to the point. No long essays.
   - Do NOT use markdown asterisks (**) or raw markdown heading hashes (###).
   - Use simple bullet points (•), clean line breaks, and clear emojis.
   - Give the bottom-line answer immediately.
   - Support English, Telugu, or Hinglish naturally based on what the student uses.
`;

    const ai = new GoogleGenAI({ apiKey });

    const contents: any[] = [];

    if (Array.isArray(messages) && messages.length > 1) {
      for (const m of messages.slice(-6)) {
        contents.push({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.content }],
        });
      }
    } else {
      contents.push({
        role: "user",
        parts: [{ text: query }],
      });
    }

    // High Quota Model Chain: gemini-3.1-flash-lite (500 RPD) -> gemini-3.5-flash-lite (500 RPD) -> gemini-3.6-flash
    const candidateModels = ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-3.6-flash"];
    let response: any = null;
    let lastErr: any = null;

    for (const model of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: contextPrompt,
            temperature: 0.4,
          },
        });
        if (response?.text) break;
      } catch (e: any) {
        lastErr = e;
        console.warn(`Model ${model} failed, trying next candidate:`, e?.message);
      }
    }

    if (!response && lastErr) {
      throw lastErr;
    }

    const text = response.text || "I couldn't generate a response. Please try again.";

    return NextResponse.json({
      success: true,
      answer: text,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in AI Chat API:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to process AI query",
      },
      { status: 500 }
    );
  }
}
