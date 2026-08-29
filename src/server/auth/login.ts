import axios from "axios";
import { solveCaptcha } from "@/lib/captcha";
import { main, captcha, authenticate } from "@/server/utils/headers";
import { httpsAgent } from "@/server/utils/httpAgents";
import { LoginResponse } from "@/types/server/login";

const httpLoginClient = axios.create({
  httpsAgent,
  timeout: 25000,
  validateStatus: () => true,
});

async function attemptLogin(username: string, password: string): Promise<LoginResponse> {
  const mainRes = await httpLoginClient.get("https://student.srmap.edu.in/srmapstudentcorner/StudentLoginPage", {
    headers: main,
  });

  if (mainRes.status >= 500) throw new Error("SRM server is unreachable. Please try again later.");

  const setCookie = String(mainRes.headers["set-cookie"] || "");
  const jsessionIdMatch = setCookie.match(/JSESSIONID=([^;]+)/);
  if (!jsessionIdMatch) throw new Error("Session ID not found");
  const jsessionId = jsessionIdMatch[1];

  const captchaRes = await httpLoginClient.get("https://student.srmap.edu.in/srmapstudentcorner/captchas", {
    headers: captcha(jsessionId),
    responseType: "arraybuffer",
  });

  if (captchaRes.status >= 500) throw new Error("SRM server is unreachable. Please try again later.");

  const captchaBuffer = Buffer.from(captchaRes.data);
  const captchaTextRaw = await solveCaptcha(captchaBuffer);
  if (!captchaTextRaw) throw new Error("Captcha solving failed");

  const payload = new URLSearchParams({
    txtUserName: username,
    txtAuthKey: password,
    ccode: captchaTextRaw,
  }).toString();

  const loginRes = await httpLoginClient.post(
    "https://student.srmap.edu.in/srmapstudentcorner/StudentLoginToPortal",
    payload,
    {
      headers: {
        ...authenticate(jsessionId),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      responseType: "text",
    }
  );

  const html = String(loginRes.data || "");

  const alertMatch = html.match(/alert\(['"](.*?)['"]\)/i);
  if (alertMatch) {
    const alertMsg = alertMatch[1]?.trim();
    if (/captcha/i.test(alertMsg)) {
      throw new Error(`Captcha Error: ${alertMsg}`);
    }
    throw new Error(alertMsg || "Invalid credentials");
  }

  const nameMatch = html.match(/<h2>(.*?)<\/h2>/i);
  if (!nameMatch && !html.includes("logout") && !html.includes("Logout") && !html.includes("HRDSystem")) {
    throw new Error("Invalid credentials");
  }

  return { success: true, sessionId: jsessionId };
}

async function login(username: string, password: string, maxRetries = 3): Promise<LoginResponse> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await attemptLogin(username, password);
      if (res.success) return res;
    } catch (error: unknown) {
      lastError = error;
      console.log(`Login attempt ${attempt}/${maxRetries} failed:`, error);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
      }
    }
  }

  console.log("Error From /backendUtils/auth/login:- ", lastError);
  let message = "Login Failed, Please Check Your Credentials!";
  if (lastError instanceof Error) {
    if (
      lastError.message.includes("fetch failed") ||
      lastError.message.includes("ECONNREFUSED") ||
      lastError.message.includes("ENOTFOUND") ||
      lastError.message.includes("network") ||
      lastError.message.includes("timeout") ||
      lastError.message.includes("ETIMEDOUT") ||
      lastError.message.includes("socket") ||
      lastError.message.includes("failed to fetch")
    ) {
      message = "SRM server is unreachable. Please try again later.";
    } else {
      message = lastError.message;
    }
  }
  return { success: false, message };
}

export { login };
