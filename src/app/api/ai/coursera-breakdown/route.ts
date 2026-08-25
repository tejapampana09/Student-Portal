import { NextRequest, NextResponse } from "next/server";
import { errorResponse, requireAuthResponse } from "@/server/utils/functions";
import { generateCourseraModuleTasks } from "@/server/ai/smartTaskService";

export async function POST(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { title, totalModules } = await req.json();
    if (!title) return errorResponse("Course title required");

    const breakdown = await generateCourseraModuleTasks(title, Number(totalModules) || 4);
    return NextResponse.json({ success: true, breakdown });
  } catch (error: any) {
    return errorResponse("Failed to generate breakdown", {}, 500);
  }
}
