import axios from "axios";

export interface LeetCodeProfile {
  username: string;
  realName?: string;
  avatar?: string;
  ranking?: number;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  acceptanceRate?: number;
}

export interface LeetCodeSubmissionResponse {
  success: boolean;
  submissionId?: number;
  statusDisplay: string;
  statusRuntime?: string;
  runtimePercentile?: number;
  statusMemory?: string;
  memoryPercentile?: number;
  totalCorrect?: number;
  totalTestcases?: number;
  compileError?: string;
  runtimeError?: string;
  inputFormatted?: string;
  expectedOutput?: string;
  codeOutput?: string;
  stdOutput?: string;
  message?: string;
}

const LANG_MAP: Record<string, string> = {
  python: "python3",
  python3: "python3",
  cpp: "cpp",
  "c++": "cpp",
  java: "java",
  javascript: "javascript",
  c: "c",
};

/**
 * Verifies and fetches official public LeetCode profile stats directly from LeetCode GraphQL
 * Zero password and zero cookie required!
 */
export async function verifyLeetCodeUsername(username: string): Promise<{ success: boolean; profile?: LeetCodeProfile; message?: string }> {
  const cleanUser = username.replace(/^@/, "").trim();
  const query = `
    query getUserProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          realName
          userAvatar
          ranking
        }
        submitStats {
          acSubmissionNum {
            difficulty
            count
          }
        }
      }
    }
  `;

  try {
    const res = await axios.post(
      "https://leetcode.com/graphql",
      { query, variables: { username: cleanUser } },
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Content-Type": "application/json",
          Referer: `https://leetcode.com/${cleanUser}/`,
        },
        timeout: 10000,
      }
    );

    const user = res.data?.data?.matchedUser;
    if (!user) {
      return { success: false, message: `LeetCode user '@${cleanUser}' not found. Please check spelling.` };
    }

    const acStats = user.submitStats?.acSubmissionNum || [];
    const all = acStats.find((s: any) => s.difficulty === "All")?.count || 0;
    const easy = acStats.find((s: any) => s.difficulty === "Easy")?.count || 0;
    const medium = acStats.find((s: any) => s.difficulty === "Medium")?.count || 0;
    const hard = acStats.find((s: any) => s.difficulty === "Hard")?.count || 0;

    return {
      success: true,
      profile: {
        username: user.username,
        realName: user.profile?.realName || user.username,
        avatar: user.profile?.userAvatar || "https://assets.leetcode.com/users/default_avatar.png",
        ranking: user.profile?.ranking || undefined,
        totalSolved: all,
        easySolved: easy,
        mediumSolved: medium,
        hardSolved: hard,
      },
    };
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to connect to LeetCode GraphQL." };
  }
}

/**
 * Automated LeetCode Credential Login
 */
export async function loginToLeetCode(
  usernameOrEmail: string,
  password: string
): Promise<{ success: boolean; sessionCookie?: string; csrfToken?: string; username?: string; message?: string }> {
  const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

  const session = axios.create({
    baseURL: "https://leetcode.com",
    headers: {
      "User-Agent": userAgent,
      "Accept": "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
    },
    timeout: 15000,
  });

  try {
    const initRes = await session.get("/api/problems/all/", { validateStatus: () => true });
    const setCookies = initRes.headers["set-cookie"] || [];
    let initialCsrf = "";
    let cookieJar: string[] = [];

    for (const c of setCookies) {
      const parts = c.split(";")[0];
      cookieJar.push(parts);
      const match = parts.match(/csrftoken=([^;]+)/);
      if (match) initialCsrf = match[1];
    }

    if (!initialCsrf) {
      initialCsrf = "csrf_" + Math.random().toString(36).substring(2, 14);
      cookieJar.push(`csrftoken=${initialCsrf}`);
    }

    const postData = new URLSearchParams({
      csrfmiddlewaretoken: initialCsrf,
      login: usernameOrEmail.trim(),
      password: password,
      next: "/problems",
    }).toString();

    const loginRes = await session.post("/accounts/login/", postData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": "https://leetcode.com/accounts/login/",
        "Origin": "https://leetcode.com",
        "x-csrftoken": initialCsrf,
        "x-requested-with": "XMLHttpRequest",
        "Cookie": cookieJar.join("; "),
      },
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 405,
    });

    const loginSetCookies = loginRes.headers["set-cookie"] || [];
    let sessionCookie = "";
    let finalCsrf = initialCsrf;

    for (const c of loginSetCookies) {
      const sessionMatch = c.match(/LEETCODE_SESSION=([^;]+)/);
      if (sessionMatch) sessionCookie = sessionMatch[1];
      const csrfMatch = c.match(/csrftoken=([^;]+)/);
      if (csrfMatch) finalCsrf = csrfMatch[1];
    }

    if (sessionCookie) {
      return {
        success: true,
        sessionCookie,
        csrfToken: finalCsrf,
        username: usernameOrEmail.includes("@") ? usernameOrEmail.split("@")[0] : usernameOrEmail,
      };
    }

    return {
      success: false,
      message: "LeetCode required interactive verification for this account. Please connect your LeetCode Username for instant profile sync!",
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to authenticate with LeetCode.",
    };
  }
}

export async function submitDirectToLeetCode(
  sessionCookie: string,
  csrfToken: string | undefined,
  slug: string,
  questionId: string,
  code: string,
  language: string
): Promise<LeetCodeSubmissionResponse> {
  const cleanLang = LANG_MAP[language.toLowerCase()] || "python3";
  const cleanSession = sessionCookie.replace(/^LEETCODE_SESSION=/, "").trim();

  let cleanCsrf = (csrfToken || "").replace(/^csrftoken=/, "").trim();
  if (!cleanCsrf || cleanCsrf.length < 5) {
    cleanCsrf = "placeholder_csrf";
  }

  const client = axios.create({
    baseURL: "https://leetcode.com",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Content-Type": "application/json",
      Referer: `https://leetcode.com/problems/${slug}/`,
      Origin: "https://leetcode.com",
      "x-csrftoken": cleanCsrf,
      Cookie: `LEETCODE_SESSION=${cleanSession}; csrftoken=${cleanCsrf};`,
    },
    timeout: 15000,
  });

  try {
    const submitRes = await client.post(`/problems/${slug}/submit/`, {
      lang: cleanLang,
      question_id: questionId,
      typed_code: code,
    });

    const submissionId = submitRes.data?.submission_id;
    if (!submissionId) {
      return {
        success: false,
        statusDisplay: "Submission Failed",
        message: submitRes.data?.error || "Session expired. Please reconnect your LeetCode account.",
      };
    }

    for (let attempt = 0; attempt < 12; attempt++) {
      await new Promise((r) => setTimeout(r, 600));

      const checkRes = await client.get(`/submissions/detail/${submissionId}/check/`);
      const data = checkRes.data;

      if (data.state === "SUCCESS") {
        return {
          success: true,
          submissionId,
          statusDisplay: data.status_display || "Accepted",
          statusRuntime: data.status_runtime || "N/A",
          runtimePercentile: data.runtime_percentile ? parseFloat(data.runtime_percentile.toFixed(1)) : undefined,
          statusMemory: data.status_memory || "N/A",
          memoryPercentile: data.memory_percentile ? parseFloat(data.memory_percentile.toFixed(1)) : undefined,
          totalCorrect: data.total_correct,
          totalTestcases: data.total_testcases,
          compileError: data.compile_error,
          runtimeError: data.runtime_error,
          inputFormatted: data.input_formatted,
          expectedOutput: data.expected_output,
          codeOutput: data.code_output,
          stdOutput: data.std_output,
        };
      }
    }

    return {
      success: true,
      submissionId,
      statusDisplay: "Pending Evaluation",
      message: "Submission sent to LeetCode. Evaluation in progress on LeetCode servers.",
    };
  } catch (err: any) {
    return {
      success: false,
      statusDisplay: "Error",
      message: err.message || "Failed to communicate with LeetCode API.",
    };
  }
}
