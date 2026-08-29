import { NextRequest, NextResponse } from "next/server";
import { getCodeMentorFeedback } from "@/server/code/aiMentorService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { problemTitle, problemDescription, userCode, language, feedbackType, errorMessage } = body;

    if (!userCode || !problemTitle) {
      return NextResponse.json({ success: false, message: "Code and problem information are required." }, { status: 400 });
    }

    const feedback = await getCodeMentorFeedback(
      problemTitle,
      problemDescription || "",
      userCode,
      language || "python",
      feedbackType || "hint",
      errorMessage
    );

    return NextResponse.json({
      success: true,
      feedback,
    });
  } catch (error: any) {
    console.error("Error in AI code mentor:", error);
    return NextResponse.json({ success: false, message: "Mentor service failed." }, { status: 500 });
  }
}
