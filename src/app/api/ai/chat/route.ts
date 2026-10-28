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

  // Rate Limiting
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

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { success: false, message: "AI assistant service is currently unavailable." },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();

    if (!body || typeof body !== "object") {
      return errorResponse("Invalid request body");
    }

    const { messages, userQuery } = body;
    const query = (typeof userQuery === "string" ? userQuery : Array.isArray(messages) ? messages[messages.length - 1]?.content : "").trim();

    if (!query || typeof query !== "string") {
      return errorResponse("Query text is required");
    }

    if (query.length > 2000) {
      return errorResponse("Query exceeds maximum allowed length of 2000 characters.");
    }

    // Read-only intent check for attendance code detection
    const codeMatch = query.match(/\b([A-Za-z]\d{6})\b/);
    if (codeMatch && /mark|attendance|code|submit|present/i.test(query)) {
      const code = codeMatch[1].toUpperCase();
      return NextResponse.json({
        success: true,
        answer: `I detected attendance code ${code}. Please submit this code directly via the Mark Attendance button on your dashboard.`,
        suggestedAction: {
          type: "MARK_ATTENDANCE",
          code,
        },
      });
    }

    const initDb = await useMongo();
    const user = await initDb.db("college_db").collection("users").findOne(
      { username: auth.payload.username },
      { projection: { data: 1, username: 1 } }
    );

    let studentData: any = null;
    if (user?.data) {
      try {
        studentData = decryptData(user.data);
      } catch {}
    }

    const nowIndia = DateTime.now().setZone("Asia/Kolkata");
    const todayDay = nowIndia.weekdayLong; // e.g. "Wednesday"
    const currentTimeStr = nowIndia.toFormat("yyyy-MM-dd HH:mm");

    // Student identity
    const studentName = studentData?.profile?.studentName || studentData?.name || "Student";
    const registerNo = studentData?.profile?.registerNo || studentData?.id || auth.payload.username;
    const semester = studentData?.profile?.semester || "";
    const section = studentData?.profile?.section || "";
    const program = studentData?.profile?.program || "";
    const cgpa = studentData?.cgpa?.cgpa || studentData?.cgpa || "N/A";

    // 🎓 Real-Time Attendance & Safe Bunk Calculation for every subject
    let totalClassesAttended = 0;
    let totalClassesConducted = 0;
    const attendanceList = (studentData?.attendance || []).map((a: any) => {
      const subjectName = a.subject_name || a.course_title || "Unknown Subject";
      const subjectCode = a.subject_code || a.sub_code || "";
      const attended = Number(a.present) || 0;
      const conducted = Number(a.classes_conducted) || 0;
      const odTaken = Number(a.od_ml_taken) || 0;
      const effectiveAttended = attended + odTaken;

      totalClassesAttended += effectiveAttended;
      totalClassesConducted += conducted;

      const percentageNum = conducted > 0 ? (effectiveAttended / conducted) * 100 : Number(a.attendance_percentage) || 0;
      const percentageStr = `${percentageNum.toFixed(1)}%`;

      let safeBunks = 0;
      let classesNeededFor75 = 0;
      let status = "Safe";

      if (percentageNum >= 75) {
        // Can bunk B classes and still stay >= 75%:
        safeBunks = Math.floor((effectiveAttended - 0.75 * conducted) / 0.75);
        if (safeBunks < 0) safeBunks = 0;
        status = safeBunks > 0 
          ? `Safe (Can bunk ${safeBunks} class${safeBunks > 1 ? 'es' : ''} safely)`
          : "Borderline (0 safe bunks left, attend next class!)";
      } else {
        // Below 75%: classes needed to reach 75%
        classesNeededFor75 = Math.ceil((0.75 * conducted - effectiveAttended) / 0.25);
        if (classesNeededFor75 < 0) classesNeededFor75 = 0;
        status = `Critical Shortage (Must attend next ${classesNeededFor75} consecutive class${classesNeededFor75 > 1 ? 'es' : ''} to reach 75%)`;
      }

      return {
        subjectCode,
        subjectName,
        attended: `${effectiveAttended}/${conducted}`,
        percentage: percentageStr,
        safeBunksLeft: safeBunks,
        classesNeededToReach75: classesNeededFor75,
        status,
      };
    });

    const overallAttendance = totalClassesConducted > 0 
      ? `${((totalClassesAttended / totalClassesConducted) * 100).toFixed(1)}%` 
      : studentData?.overall_attendance || "N/A";

    // Timetable & Subjects Context
    const timetable = studentData?.timetable || [];
    const subjects = (studentData?.subjects || []).map((s: any) => ({
      code: s.code,
      name: s.name,
      faculty: s.faculty,
      classroom: s.classrooms,
      facultyCabins: s.facultyCabins,
    }));

    const studentContext = {
      studentInfo: {
        name: studentName,
        registerNumber: registerNo,
        semester,
        section,
        program,
        cgpa,
        overallAttendance,
      },
      currentDateAndTime: `${currentTimeStr} (${todayDay})`,
      attendanceBreakdown: attendanceList,
      timetable,
      subjects,
      academicCalendar,
    };

    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `
You are the official, intelligent SRMAP Campus Copilot AI for SRM University AP students.
You have complete access to the student's REAL-TIME official attendance, safe bunks, timetable, subjects, and faculty cabins.

Student Profile & Records:
${JSON.stringify(studentContext, null, 2)}

COMMUNICATION & LANGUAGE INTELLIGENCE:
- Understand and fluently respond in English, Telugu, or Tanglish (Telugu written in English script).
- If the student asks in Telugu or Tanglish (e.g. "inka enni bunks migili unnai", "repati schedule enti", "na attendance entha", "ee roju classes em unnai"), respond in friendly, helpful, natural Tanglish or Telugu so they feel completely understood!
- If the student asks in English, respond in crisp, polite English.

ATTENDANCE & SAFE BUNK INTELLIGENCE (VERY IMPORTANT):
- When the student asks "how many bunks are left", "safe bunks", or "inka enni bunks migili unnai":
  • List every subject clearly with its current percentage, attended ratio, and exactly how many safe bunks they have left.
  • For subjects with attendance below 75%, warn them clearly with ⚠️ that they CANNOT bunk and tell them exactly how many classes they must attend to reach 75%.
  • Give a concise summary at the end (e.g. Total safe bunks across all subjects, and which subjects need immediate attention).

TIMETABLE & NEXT CLASS:
- When asked about next class, today's schedule, or tomorrow:
  • Reference today's day (${todayDay}) and list subjects in order with class timings and classroom venues if available.

GENERAL ASSISTANCE:
- You can also answer ANY academic doubts, programming questions, campus directions, study strategies, exam preparation, or general life/university queries.

CRITICAL FORMATTING INSTRUCTIONS (STRICT COMPLIANCE REQUIRED):
1. NEVER use any asterisks or stars (do NOT use **, *, or *** anywhere in your response).
2. Do NOT use markdown bold syntax like **word**. Instead, write words cleanly or use emojis (📅, ⏰, 📍, 📚, 💡, ⚠️, ✅).
3. For bullet lists, use the bullet character • or numbers (1., 2.), NEVER asterisks (*).
4. Format responses cleanly with neat paragraph spacing and line breaks.
5. Answer questions clearly and directly without any raw markdown stars.
`;

    let answer = "";
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: [
          { role: "user", parts: [{ text: `${systemPrompt}\n\nStudent Question: ${query}` }] }
        ],
      });
      answer = response.text || "";
    } catch (modelErr: any) {
      console.warn("Falling back to gemini-flash-lite-latest:", modelErr?.message);
      const fallbackResponse = await ai.models.generateContent({
        model: "gemini-flash-lite-latest",
        contents: [
          { role: "user", parts: [{ text: `${systemPrompt}\n\nStudent Question: ${query}` }] }
        ],
      });
      answer = fallbackResponse.text || "";
    }

    // Clean any accidental asterisks from the output
    answer = answer
      .replace(/\*\*\*(.*?)\*\*\*/g, "$1")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/(^|[^\*])\*(?!\*)(.*?)\*/g, "$1$2")
      .replace(/^\s*\*\s+/gm, "• ")
      .trim();

    if (!answer) {
      answer = "I could not generate an answer right now. Please try asking again.";
    }

    return NextResponse.json({
      success: true,
      answer,
    });
  } catch (error: any) {
    console.error("Error in AI Chat Copilot:", error?.message || error);
    return NextResponse.json(
      { success: false, message: "Failed to process request. Please try again." },
      { status: 500 }
    );
  }
}
