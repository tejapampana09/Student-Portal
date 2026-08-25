import { solveCaptcha } from "@/lib/captcha";
import { main, captcha, authenticate } from "@/server/utils/headers";
import { LoginResponse } from "@/types/server/login";

async function attemptLogin(username: string, password: string): Promise<LoginResponse> {
  const mainRes = await fetch("https://student.srmap.edu.in/srmapstudentcorner/StudentLoginPage", {
    method: "GET",
    headers: main
  });

  if (!mainRes.ok) throw new Error("SRM server is unreachable. Please try again later.");

  const setCookie = mainRes.headers.get("set-cookie") || "";
  const jsessionIdMatch = setCookie.match(/JSESSIONID=([^;]+)/);
  if (!jsessionIdMatch) throw new Error("Session ID not found");
  const jsessionId = jsessionIdMatch[1];

  const captchaRes = await fetch("https://student.srmap.edu.in/srmapstudentcorner/captchas", {
    method: "GET",
    headers: captcha(jsessionId)
  });

  if (!captchaRes.ok) throw new Error("SRM server is unreachable. Please try again later.");

  const captchaBuffer = Buffer.from(await captchaRes.arrayBuffer());
  const captchaTextRaw = await solveCaptcha(captchaBuffer);
  if (!captchaTextRaw) throw new Error("Captcha solving failed");

  const payload = new URLSearchParams({
    txtUserName: username,
    txtAuthKey: password,
    ccode: captchaTextRaw,
  });

  const loginRes = await fetch("https://student.srmap.edu.in/srmapstudentcorner/StudentLoginToPortal", {
    method: "POST",
    headers: authenticate(jsessionId),
    body: payload
  });

  const html = await loginRes.text();
  const nameMatch = html.match(/<h2>(.*?)<\/h2>/);
  if (!nameMatch) throw new Error("Invalid credentials");

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
        await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
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