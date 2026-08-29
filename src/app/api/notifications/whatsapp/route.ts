import { NextRequest, NextResponse } from "next/server";
import { useMongo } from "@/lib/database/useMongo";
import { errorResponse, requireAuthResponse } from "@/server/utils/functions";
import {
  sendWhatsAppDailyBriefingTemplate,
  sendWhatsAppTextMessage,
  validateAndFormatPhone,
} from "@/server/notifications/whatsappService";

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
    const usersCollection = initDb.db("college_db").collection<any>("users");
    const user = await usersCollection.findOne(
      { username: auth.payload.username },
      { projection: { whatsapp: 1 } }
    );

    if (action === "test") {
      if (!phone) return errorResponse("Phone number is required for test message", {}, 400);

      // Server-side strict phone validation
      const validation = validateAndFormatPhone(phone);
      if (!validation.valid || !validation.phone) {
        return errorResponse(validation.error || "Invalid phone number format", {}, 400);
      }

      // Rate Limiting: 60-second cooldown & max 5 tests per hour
      const now = Date.now();
      const lastTest = user?.whatsapp?.lastTestSentAt ? new Date(user.whatsapp.lastTestSentAt).getTime() : 0;
      const cooldownMs = 60 * 1000;

      if (now - lastTest < cooldownMs) {
        const waitSec = Math.ceil((cooldownMs - (now - lastTest)) / 1000);
        return errorResponse(`Please wait ${waitSec}s before sending another test message.`, {}, 429);
      }

      const oneHourAgo = now - 60 * 60 * 1000;
      const recentTests = (user?.whatsapp?.testHistory || []).filter((t: number) => t > oneHourAgo);
      if (recentTests.length >= 5) {
        return errorResponse("Hourly test limit reached (max 5 test messages/hour). Please try again later.", {}, 429);
      }

      const sent = await sendWhatsAppDailyBriefingTemplate(
        validation.phone,
        auth.payload.username || "Student",
        "Today",
        [],
        [],
        null
      );

      // Record rate limit metadata
      recentTests.push(now);
      await usersCollection.updateOne(
        { username: auth.payload.username },
        {
          $set: {
            "whatsapp.lastTestSentAt": new Date(now).toISOString(),
            "whatsapp.testHistory": recentTests,
          },
        }
      );

      if (sent.success) {
        return NextResponse.json({ success: true, message: "Test WhatsApp message sent successfully!" });
      } else {
        const fallback = await sendWhatsAppTextMessage(validation.phone, "🎓 *SRMAP Student Portal Alert*\n\nHello! This is a test notification from your SRMAP Student Portal.");
        if (fallback.success) {
          return NextResponse.json({ success: true, message: "Test WhatsApp message sent successfully!" });
        }
        return errorResponse(sent.error || fallback.error || "Failed to send WhatsApp message.", {}, 500);
      }
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
