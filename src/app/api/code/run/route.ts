import { NextResponse } from "next/server";

// Do not parse or execute submitted code in the application process, even for
// authenticated users. Authentication and a timeout are not a security sandbox.
export async function POST() {
  return NextResponse.json(
    { success: false, message: "Code execution is temporarily unavailable while an isolated sandbox is configured." },
    { status: 503, headers: { "Cache-Control": "no-store" } }
  );
}
