import { NextRequest, NextResponse } from "next/server";
import { useMongo } from "@/lib/database/useMongo";
import { errorResponse, requireAuthResponse } from "@/server/utils/functions";
import { fetchCourseraCourseByUrl } from "@/server/career/courseraScraperService";

export async function POST(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { url, deadline } = await req.json();
    if (!url || typeof url !== "string") {
      return errorResponse("Please provide a valid Coursera URL");
    }

    // 1-Second Auto-fetch
    const scraped = await fetchCourseraCourseByUrl(url);

    // Default deadline to 3 weeks from now if not provided
    const targetDeadline = deadline || new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const newCourse = {
      id: "coursera-" + Date.now(),
      title: scraped.title,
      platform: "Coursera",
      totalModules: scraped.totalModules,
      completedModules: 0,
      deadline: targetDeadline,
      url: url.trim(),
      breakdown: scraped.breakdown,
      completedTasks: [],
      addedAt: new Date().toISOString(),
    };

    const initDb = await useMongo();
    await initDb.db("college_db").collection("users").updateOne(
      { username: auth.payload.username },
      { $push: { courseraCourses: newCourse } as any },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: "Course auto-imported with task breakdown!",
      course: newCourse,
    });
  } catch (error: any) {
    return errorResponse("Failed to auto-import Coursera course", {}, 500);
  }
}
