export interface CodingStatsResponse {
  leetcode?: {
    username: string;
    totalSolved: number;
    easySolved: number;
    mediumSolved: number;
    hardSolved: number;
    ranking?: number;
    streak?: number;
    totalActiveDays?: number;
  };
  github?: {
    username: string;
    publicRepos: number;
    followers: number;
    avatarUrl: string;
    profileUrl: string;
  };
  codeforces?: {
    handle: string;
    rating?: number;
    maxRating?: number;
    rank?: string;
    maxRank?: string;
    avatar?: string;
  };
}

export async function fetchLeetCodeStats(username: string) {
  if (!username) return null;
  const cleanUser = username.trim().toLowerCase();

  try {
    const query = `
      query userProfile($username: String!) {
        matchedUser(username: $username) {
          username
          submitStatsGlobal {
            acSubmissionNum {
              difficulty
              count
            }
          }
          profile {
            ranking
            reputation
          }
          userCalendar {
            streak
            totalActiveDays
          }
        }
      }
    `;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
      body: JSON.stringify({
        query,
        variables: { username: cleanUser },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const json = await res.json();
    const user = json?.data?.matchedUser;
    if (!user) return null;

    const stats = user.submitStatsGlobal?.acSubmissionNum || [];
    const all = stats.find((s: any) => s.difficulty === "All")?.count || 0;
    const easy = stats.find((s: any) => s.difficulty === "Easy")?.count || 0;
    const medium = stats.find((s: any) => s.difficulty === "Medium")?.count || 0;
    const hard = stats.find((s: any) => s.difficulty === "Hard")?.count || 0;

    return {
      username: cleanUser,
      totalSolved: all,
      easySolved: easy,
      mediumSolved: medium,
      hardSolved: hard,
      ranking: user.profile?.ranking || 0,
      streak: user.userCalendar?.streak || 0,
      totalActiveDays: user.userCalendar?.totalActiveDays || 0,
    };
  } catch (error) {
    console.error("LeetCode fetch error:", error);
    return null;
  }
}

export async function fetchGitHubStats(username: string) {
  if (!username) return null;
  const cleanUser = username.trim();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanUser)}`, {
      headers: {
        "User-Agent": "SRMAP-Student-Portal",
        Accept: "application/vnd.github.v3+json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();

    return {
      username: data.login,
      publicRepos: data.public_repos || 0,
      followers: data.followers || 0,
      avatarUrl: data.avatar_url || "",
      profileUrl: data.html_url || `https://github.com/${cleanUser}`,
    };
  } catch (error) {
    console.error("GitHub fetch error:", error);
    return null;
  }
}

export async function fetchCodeforcesStats(handle: string) {
  if (!handle) return null;
  const cleanHandle = handle.trim();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(cleanHandle)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== "OK" || !data.result?.[0]) return null;

    const info = data.result[0];
    return {
      handle: info.handle,
      rating: info.rating || 0,
      maxRating: info.maxRating || 0,
      rank: info.rank || "unranked",
      maxRank: info.maxRank || "unranked",
      avatar: info.titlePhoto || info.avatar || "",
    };
  } catch (error) {
    console.error("Codeforces fetch error:", error);
    return null;
  }
}
