import { NextRequest, NextResponse } from "next/server";
import { errorResponse, requireAuthResponse } from "@/server/utils/functions";
import { summarizeLectureNotes } from "@/server/ai/notesSummarizerService";

export async function POST(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { content, subjectName, targetExam } = body;

    if (!content || content.trim().length < 10) {
      return errorResponse("Please provide lecture notes, syllabus text, or slide content to summarize.");
    }

    const result = await summarizeLectureNotes(
      content.trim(),
      subjectName || "Subject",
      targetExam || "End-Sem"
    );

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("Error in summarize notes API:", error);
    return errorResponse("Failed to summarize notes", {}, 500);
  }
}
