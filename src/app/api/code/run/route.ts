import { NextRequest, NextResponse } from "next/server";
import { executeCodeLocally } from "@/server/code/codeExecutionService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { language, code, problemId, customInput } = body;

    if (!code || !problemId) {
      return NextResponse.json({ success: false, message: "Code and problemId are required." }, { status: 400 });
    }

    const result = executeCodeLocally(language || "python", code, problemId, customInput);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("Error executing code:", error);
    return NextResponse.json({ success: false, message: "Code execution failed." }, { status: 500 });
  }
}
