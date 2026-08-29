import axios from "axios";

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
 * 100% Automated LeetCode Credential Login
 * Emulates full Chrome browser handshake to acquire LEETCODE_SESSION and csrftoken automatically!
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
    // Step 1: Initial handshake to fetch fresh cookies and authentic csrftoken
    const initRes = await session.get("/api/problems/all/", {
      validateStatus: () => true,
    });

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
      // Fallback: fetch login page directly
      const loginPageRes = await session.get("/accounts/login/", { validateStatus: () => true });
      const lpCookies = loginPageRes.headers["set-cookie"] || [];
      for (const c of lpCookies) {
        const parts = c.split(";")[0];
        cookieJar.push(parts);
        const match = parts.match(/csrftoken=([^;]+)/);
        if (match) initialCsrf = match[1];
      }
    }

    if (!initialCsrf) {
      initialCsrf = "default_" + Math.random().toString(36).substring(2, 14);
      cookieJar.push(`csrftoken=${initialCsrf}`);
    }

    const cookieHeader = cookieJar.join("; ");

    // Step 2: Post login payload to LeetCode authentication endpoint
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
        "Cookie": cookieHeader,
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

    // Step 3: Check response body for error details
    const resBody = typeof loginRes.data === "string" ? loginRes.data : JSON.stringify(loginRes.data || {});
    if (resBody.includes("Invalid login") || resBody.includes("Sign in failed") || resBody.includes("username or password")) {
      return {
        success: false,
        message: "Incorrect LeetCode username or password. Please verify your credentials.",
      };
    }

    return {
      success: false,
      message: "LeetCode required captcha verification. Please use the 1-Time Session Cookie tab to connect instantly.",
    };
  } catch (err: any) {
    console.error("LeetCode automated login error:", err?.message);
    return {
      success: false,
      message: err.response?.data?.message || err.message || "Failed to authenticate with LeetCode.",
    };
  }
}

export async function getCsrfTokenFromSession(sessionCookie: string): Promise<string> {
  const cleanSession = sessionCookie.replace(/^LEETCODE_SESSION=/, "").trim();
  try {
    const res = await axios.get("https://leetcode.com/graphql", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Cookie: `LEETCODE_SESSION=${cleanSession};`,
      },
      validateStatus: () => true,
    });

    const setCookies = res.headers["set-cookie"] || [];
    for (const c of setCookies) {
      const match = c.match(/csrftoken=([^;]+)/);
      if (match) return match[1];
    }
  } catch (err) {
    console.warn("Could not fetch CSRF token automatically:", err);
  }
  return "placeholder_csrf_token";
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
    cleanCsrf = await getCsrfTokenFromSession(cleanSession);
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

    // Poll judge results (up to 12 attempts = 6 seconds)
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
    console.error("Direct LeetCode submission error:", err?.response?.data || err?.message);
    const msg = err.response?.data?.error || err.message || "Failed to communicate with LeetCode API.";
    return {
      success: false,
      statusDisplay: "Error",
      message: msg.includes("403") ? "Invalid or expired LeetCode session." : msg,
    };
  }
}
