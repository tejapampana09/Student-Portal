import { NextRequest, NextResponse } from "next/server";
import { solveCaptcha } from "@/lib/captcha";
import { enforceRateLimit } from "@/server/utils/functions";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
    const rate = await enforceRateLimit(`captcha:${ip}`, 30, 10 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many captcha requests. Try again later." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
    }
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const contentType = file.type || "";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are accepted." }, { status: 415 });
    }
    const MAX_BYTES = 2 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image is too large. Maximum size is 2 MB." }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const solvedText = await solveCaptcha(buffer);

    if (!solvedText) {
      return NextResponse.json(
        { error: "Captcha solving failed" },
        { status: 500 }
      );
    }

    return new NextResponse(solvedText, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Captcha solve error:", message);
    return NextResponse.json(
      { error: "Captcha solver unreachable", detail: message },
      { status: 502 }
    );
  }
}