import { NextRequest, NextResponse } from "next/server";
import { useMongo } from "@/lib/database/useMongo";
import { errorResponse, requireAuthResponse } from "@/server/utils/functions";
import {
  sendWhatsAppDailyBriefingTemplate,
  sendWhatsAppTextMessage,
  validateAndFormatPhone,
} from "@/server/notifications/whatsappService";
import { checkAndConsumeRateLimit, refundRateLimit } from "@/server/utils/rateLimiter";

export async function GET(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const initDb = await useMongo();
    const user = await initDb.db("college_db").collection<any>("users").findOne(
      { username: auth.payload.username },
      { projection: { whatsapp: 1 } }
    );

    return NextResponse.json({
      success: true,
      whatsapp: user?.whatsapp || { enabled: false, phone: "" },
    });
  } catch (error: any) {
    return errorResponse("Failed to fetch WhatsApp preferences", {}, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { action, phone, enabled } = body;

    const initDb = await useMongo();
    const collegeDb = initDb.db("college_db");
    const usersCollection = collegeDb.collection<any>("users");

    if (action === "test") {
      if (!phone) return errorResponse("Phone number is required for test message", {}, 400);

      // 1. Strict E.164 phone validation
      const validation = validateAndFormatPhone(phone);
      if (!validation.valid || !validation.phone) {
        return errorResponse(validation.error || "Invalid phone number format", {}, 400);
      }

      // 2. Atomic Rate Limiting (60s cooldown, max 5/hr) via Compare-And-Swap
      const rateLimitKey = `wa_test:${auth.payload.username}`;
      const rateCheck = await checkAndConsumeRateLimit(collegeDb, rateLimitKey, 60, 5);

      if (!rateCheck.allowed) {
        return errorResponse(rateCheck.error || "Rate limit exceeded. Please try again later.", {}, 429);
      }

      // 3. Dispatch WhatsApp test message
      const sent = await sendWhatsAppDailyBriefingTemplate(
        validation.phone,
        auth.payload.username || "Student",
        "Today",
        [],
        [],
        null
      );

      if (sent.success) {
        return NextResponse.json({ success: true, message: "Test WhatsApp message sent successfully!" });
      }

      const fallback = await sendWhatsAppTextMessage(validation.phone, "🎓 *SRMAP Student Portal Alert*\n\nHello! This is a test notification from your SRMAP Student Portal.");
      if (fallback.success) {
        return NextResponse.json({ success: true, message: "Test WhatsApp message sent successfully!" });
      }

      // If upstream failed on 5xx server error, refund rate limit quota
      if (sent.statusCode && sent.statusCode >= 500) {
        await refundRateLimit(collegeDb, rateLimitKey);
      }

      return errorResponse(sent.error || fallback.error || "Failed to send WhatsApp message.", {}, 500);
    }

    // Validate phone number if enabling WhatsApp
    let sanitizedPhone = "";
    if (phone) {
      const validation = validateAndFormatPhone(phone);
      if (!validation.valid || !validation.phone) {
        return errorResponse(validation.error || "Invalid phone number format", {}, 400);
      }
      sanitizedPhone = validation.phone;
    }

    // Save preferences
    await usersCollection.updateOne(
      { username: auth.payload.username },
      {
        $set: {
          "whatsapp.phone": sanitizedPhone,
          "whatsapp.enabled": !!enabled,
          "whatsapp.updatedAt": new Date().toISOString(),
        },
      }
    );

    return NextResponse.json({ success: true, message: "WhatsApp preferences updated successfully" });
  } catch (error: any) {
    return errorResponse(error?.message || "Failed to update WhatsApp preferences", {}, 500);
  }
}
