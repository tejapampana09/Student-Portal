import { NextRequest, NextResponse } from "next/server";
import { solveCaptcha } from "@/lib/captcha";
import { enforceRateLimit } from "@/server/utils/functions";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
    const rate = await enforceRateLimit(`captcha:${ip}`, 60, 10 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many captcha requests. Try again later." },
        { status: 429, headers: { ...CORS_HEADERS, "Retry-After": String(rate.retryAfterSeconds) } }
      );
    }

    let buffer: Buffer | null = null;
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => ({}));
      const rawImage = body.image || body.base64 || body.file;

      if (!rawImage || typeof rawImage !== "string") {
        return NextResponse.json({ error: "No image base64 provided" }, { status: 400, headers: CORS_HEADERS });
      }

      const base64Clean = rawImage.replace(/^data:image\/\w+;base64,/, "");
      buffer = Buffer.from(base64Clean, "base64");
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");

      if (!file || !(file instanceof Blob)) {
        return NextResponse.json({ error: "No file provided" }, { status: 400, headers: CORS_HEADERS });
      }

      const fileType = file.type || "";
      if (!fileType.startsWith("image/")) {
        return NextResponse.json({ error: "Only image files are accepted." }, { status: 415, headers: CORS_HEADERS });
      }

      buffer = Buffer.from(await file.arrayBuffer());
    } else {
      // Fallback: try raw binary buffer if sent directly
      const arrayBuffer = await request.arrayBuffer().catch(() => null);
      if (arrayBuffer && arrayBuffer.byteLength > 0) {
        buffer = Buffer.from(arrayBuffer);
      }
    }

    if (!buffer || buffer.length === 0) {
      return NextResponse.json({ error: "Invalid or empty image payload." }, { status: 400, headers: CORS_HEADERS });
    }

    const MAX_BYTES = 2 * 1024 * 1024;
    if (buffer.length > MAX_BYTES) {
      return NextResponse.json({ error: "Image is too large. Maximum size is 2 MB." }, { status: 413, headers: CORS_HEADERS });
    }

    const solvedText = await solveCaptcha(buffer);

    if (!solvedText) {
      return NextResponse.json(
        { success: false, error: "Captcha solving failed" },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const acceptHeader = request.headers.get("accept") || "";
    if (acceptHeader.includes("text/plain")) {
      return new NextResponse(solvedText, {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "text/plain",
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        captcha: solvedText,
        text: solvedText,
      },
      {
        status: 200,
        headers: CORS_HEADERS,
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Captcha solve error:", message);
    return NextResponse.json(
      { success: false, error: "Captcha solver unreachable", detail: message },
      { status: 502, headers: CORS_HEADERS }
    );
  }
}
