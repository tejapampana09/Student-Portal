import { NextResponse } from "next/server";
import { useMongo } from "@/lib/database/useMongo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const initDb = await useMongo();
    const db = initDb.db("college_db");
    const pingStart = Date.now();
    await db.command({ ping: 1 });
    const latencyMs = Date.now() - pingStart;

    return NextResponse.json({
      status: "ready",
      database: "connected",
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Readiness check failed:", err);
    return NextResponse.json(
      {
        status: "not_ready",
        database: "disconnected",
        error: "Database connectivity check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
