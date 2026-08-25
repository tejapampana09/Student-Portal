import { NextRequest, NextResponse } from "next/server";
import { useMongo } from "@/lib/database/useMongo";
import { errorResponse, requireAuthResponse } from "@/server/utils/functions";
import { fetchLeetCodeStats, fetchGitHubStats, fetchCodeforcesStats } from "@/server/career/codingStatsService";

export async function GET(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const initDb = await useMongo();
    const user = await initDb.db("college_db").collection<any>("users").findOne(
      { username: auth.payload.username },
      { projection: { codingProfiles: 1 } }
    );

    const profiles = user?.codingProfiles || {};
    const [leetcode, github, codeforces] = await Promise.all([
      profiles.leetcode ? fetchLeetCodeStats(profiles.leetcode) : null,
      profiles.github ? fetchGitHubStats(profiles.github) : null,
      profiles.codeforces ? fetchCodeforcesStats(profiles.codeforces) : null,
    ]);

    return NextResponse.json({
      success: true,
      handles: profiles,
      stats: { leetcode, github, codeforces },
    });
  } catch (error: any) {
    return errorResponse("Failed to fetch coding stats", {}, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { leetcode, github, codeforces } = body;

    const initDb = await useMongo();
    await initDb.db("college_db").collection("users").updateOne(
      { username: auth.payload.username },
      {
        $set: {
          "codingProfiles.leetcode": leetcode ? leetcode.trim() : "",
          "codingProfiles.github": github ? github.trim() : "",
          "codingProfiles.codeforces": codeforces ? codeforces.trim() : "",
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, message: "Profiles saved successfully!" });
  } catch (error: any) {
    return errorResponse("Failed to update coding profiles", {}, 500);
  }
}
