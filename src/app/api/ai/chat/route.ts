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

    // Strict Input Validation (Item 8)
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

    // Read-only intent check for attendance code detection (Item 7)
    const codeMatch = query.match(/\b([A-Za-z]\d{6})\b/);
    if (codeMatch && /mark|attendance|code|submit|present/i.test(query)) {
      const code = codeMatch[1].toUpperCase();
      return NextResponse.json({
        success: true,
        answer: `I detected attendance code **${code}**. To safely record attendance without accidental inputs, please submit this code via the **Mark Attendance** button on your dashboard.`,
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

    // Data Minimization (Item 9): Inject only what the query requires
    const qLower = query.toLowerCase();
    const isTimetableQuery = /class|schedule|timetable|room|venue|period|slot|today|tomorrow|monday|tuesday|wednesday|thursday|friday/i.test(qLower);
    const isAttendanceQuery = /attendance|bunk|present|absent|shortage|percentage|safe/i.test(qLower);
    const isFacultyQuery = /faculty|professor|dr\.|teacher|cabin|hod|advisor|email/i.test(qLower);
    const isCalendarQuery = /holiday|exam|calendar|semester|midsem|endsem|date/i.test(qLower);
    const isGradesQuery = /cgpa|sgpa|grade|marks|credit|result/i.test(qLower);

    const minimizedContext: any = {
      studentName: studentData?.personal_details?.name || "Student",
    };

    if (isTimetableQuery) {
      minimizedContext.timetable = studentData?.timetable || [];
      minimizedContext.todayDay = DateTime.now().setZone("Asia/Kolkata").weekdayLong;
    }

    if (isAttendanceQuery) {
      minimizedContext.attendanceSummary = (studentData?.attendance || []).map((a: any) => ({
        subject: a.course_title || a.sub_code,
        percentage: a.overall_percentage || a.attended_percentage,
        attended: a.hours_conducted ? `${a.hours_attended}/${a.hours_conducted}` : undefined,
      }));
    }

    if (isGradesQuery) {
      minimizedContext.cgpa = studentData?.cgpa || studentData?.gpa_details;
    }

    if (isFacultyQuery) {
      minimizedContext.facultyDirectory = (facultyData as any[]).slice(0, 15);
    }

    if (isCalendarQuery) {
      minimizedContext.academicCalendar = academicCalendar;
    }

    // If query is broad, include concise high-level overview
    if (!isTimetableQuery && !isAttendanceQuery && !isFacultyQuery && !isCalendarQuery && !isGradesQuery) {
      minimizedContext.overview = {
        subjectsCount: studentData?.subjects?.length || 0,
        attendanceAverage: studentData?.overall_attendance || undefined,
      };
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `
You are the official SRMAP Campus Copilot AI for SRM University AP students.
Provide accurate, helpful, friendly, and comprehensive assistance.
You can answer ANY question the student asks — including course concepts, coding problems, study strategies, campus directions, faculty info, timetable, attendance, or general knowledge.
Current India Time: ${DateTime.now().setZone("Asia/Kolkata").toFormat("yyyy-MM-dd HH:mm")} (${DateTime.now().setZone("Asia/Kolkata").weekdayLong})

Context Data (Academic & Student records):
${JSON.stringify(minimizedContext, null, 2)}

CRITICAL FORMATTING INSTRUCTIONS (STRICT COMPLIANCE REQUIRED):
1. NEVER use any asterisks or stars (do NOT use **, *, or *** anywhere in your response).
2. Do NOT use markdown bold syntax like **word**. Instead, write words cleanly or use emojis (📅, ⏰, 📍, 📚, 💡).
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
