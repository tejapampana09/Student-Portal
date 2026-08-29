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

export async function getCsrfTokenFromSession(sessionCookie: string): Promise<string> {
  const cleanSession = sessionCookie.replace(/^LEETCODE_SESSION=/, "").trim();
  try {
    const res = await axios.get("https://leetcode.com/graphql", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
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
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Content-Type": "application/json",
      Referer: `https://leetcode.com/problems/${slug}/`,
      Origin: "https://leetcode.com",
      "x-csrftoken": cleanCsrf,
      Cookie: `LEETCODE_SESSION=${cleanSession}; csrftoken=${cleanCsrf};`,
    },
    timeout: 15000,
  });

  try {
    // 1. Submit code to LeetCode
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
        message: submitRes.data?.error || "Invalid session cookie. Please ensure you are logged into leetcode.com.",
      };
    }

    // 2. Poll LeetCode for judge results (up to 12 attempts = 6 seconds)
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
      message: msg.includes("403") ? "Invalid or expired LeetCode session cookie." : msg,
    };
  }
}
