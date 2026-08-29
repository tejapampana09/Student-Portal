import { NextRequest, NextResponse } from "next/server";
import { CODING_PROBLEMS } from "@/server/code/codingProblemsData";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const difficulty = searchParams.get("difficulty");
    const category = searchParams.get("category");
    const search = searchParams.get("search")?.toLowerCase();

    let filtered = [...CODING_PROBLEMS];

    if (difficulty && difficulty !== "All") {
      filtered = filtered.filter((p) => p.difficulty === difficulty);
    }

    if (category && category !== "All") {
      filtered = filtered.filter((p) => p.category === category);
    }

    if (search) {
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(search) ||
          p.companies.some((c) => c.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({
      success: true,
      total: filtered.length,
      problems: filtered,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
