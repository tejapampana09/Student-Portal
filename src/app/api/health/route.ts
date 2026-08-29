import { NextResponse } from "next/server";
import { useMongo } from "@/lib/database/useMongo";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "disconnected";
  let dbLatencyMs = 0;

  try {
    const initDb = await useMongo();
    const db = initDb.db("college_db");
    const pingStart = Date.now();
    await db.command({ ping: 1 });
    dbLatencyMs = Date.now() - pingStart;
    dbStatus = "connected";
  } catch (err) {
    console.error("Health check database ping failed:", err);
    dbStatus = "degraded";
  }

  const isHealthy = dbStatus === "connected";

  return NextResponse.json(
    {
      status: isHealthy ? "ok" : "degraded",
      service: "student-portal",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      responseTimeMs: Date.now() - startTime,
    },
    {
      status: isHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    }
  );
}
