import { Db } from "mongodb";

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec?: number;
  reason?: "cooldown" | "hourly_limit";
  error?: string;
}

export interface RateLimitDoc {
  _id: string;
  lastSentAt?: Date;
  updatedAt?: Date;
  attempts?: Date[];
}

/**
 * Atomically enforces cooldown and hourly quota limits using MongoDB compare-and-swap.
 * Prevents race conditions and concurrent burst bypasses.
 */
export async function checkAndConsumeRateLimit(
  db: Db,
  key: string,
  cooldownSeconds: number = 60,
  maxPerHour: number = 5
): Promise<RateLimitResult> {
  const collection = db.collection<RateLimitDoc>("rate_limits");
  const now = new Date();
  const nowMs = now.getTime();
  const cooldownCutoff = new Date(nowMs - cooldownSeconds * 1000);
  const hourCutoff = new Date(nowMs - 3600 * 1000);

  try {
    // 1. Check current state for hourly limit & exact cooldown timing
    const existing = await collection.findOne({ _id: key });
    if (existing) {
      const lastSentMs = existing.lastSentAt ? new Date(existing.lastSentAt).getTime() : 0;
      const elapsed = nowMs - lastSentMs;

      if (elapsed < cooldownSeconds * 1000) {
        const retryAfter = Math.ceil((cooldownSeconds * 1000 - elapsed) / 1000);
        return {
          allowed: false,
          retryAfterSec: retryAfter,
          reason: "cooldown",
          error: `Please wait ${retryAfter}s before sending another test message.`,
        };
      }

      const recentAttempts = (existing.attempts || []).filter(
        (t: any) => new Date(t).getTime() >= hourCutoff.getTime()
      );
      if (recentAttempts.length >= maxPerHour) {
        return {
          allowed: false,
          reason: "hourly_limit",
          error: `Hourly limit reached (max ${maxPerHour} test messages per hour). Please try again later.`,
        };
      }
    }

    // 2. Atomic Compare-And-Swap Acquire
    const filter: any = {
      _id: key,
      $or: [
        { lastSentAt: { $exists: false } },
        { lastSentAt: { $lt: cooldownCutoff } },
      ],
    };

    const updateDoc: any = {
      $set: { lastSentAt: now, updatedAt: now },
      $push: {
        attempts: {
          $each: [now],
          $slice: -20,
        },
      },
    };

    const result = await collection.findOneAndUpdate(
      filter,
      updateDoc,
      {
        upsert: true,
        returnDocument: "after",
      }
    );

    if (!result) {
      // Caught concurrent execution racing for the same slot
      return {
        allowed: false,
        retryAfterSec: cooldownSeconds,
        reason: "cooldown",
        error: `Please wait ${cooldownSeconds}s before sending another test message.`,
      };
    }

    return { allowed: true };
  } catch (err: any) {
    if (err.code === 11000) {
      return {
        allowed: false,
        retryAfterSec: cooldownSeconds,
        reason: "cooldown",
        error: `Please wait ${cooldownSeconds}s before sending another test message.`,
      };
    }
    console.error("[RateLimiter] Error evaluating rate limit:", err);
    return {
      allowed: false,
      reason: "cooldown",
      retryAfterSec: cooldownSeconds,
      error: "Rate limiter temporarily unavailable. Please try again later.",
    };
  }
}

/**
 * Refund quota on upstream internal network/server failures
 */
export async function refundRateLimit(db: Db, key: string): Promise<void> {
  try {
    const collection = db.collection<RateLimitDoc>("rate_limits");
    const filter: any = { _id: key };
    const updateDoc: any = {
      $unset: { lastSentAt: "" },
      $pop: { attempts: 1 },
    };
    await collection.updateOne(filter, updateDoc);
  } catch (err) {
    console.error("[RateLimiter] Failed to refund rate limit slot:", err);
  }
}
