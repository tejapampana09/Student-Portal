import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { useMongo } from "@/lib/database/useMongo";
import facultyData from "@/static/faculty.json";
import academicCalendar from "@/static/academic_calendar.json";
import { decryptData, errorResponse, requireAuthResponse } from "@/server/utils/functions";
import { DateTime } from "luxon";

export async function POST(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

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
      { projection: { data: 1, username: 1, session_time: 1 } }
    );

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
4. TONE & LANGUAGE:
   - Friendly, encouraging, smart, concise, and helpful.
   - Use clean Markdown with bullet points, bold percentages, and clear emojis.
   - Support English, Telugu, or Hinglish naturally based on the student's language.
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

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction: contextPrompt,
        temperature: 0.4,
      },
    });

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
