import { NextRequest, NextResponse } from "next/server";
import { useMongo } from "@/lib/database/useMongo";
import { errorResponse, requireAuthResponse } from "@/server/utils/functions";
import { sendWhatsAppDailyBriefingTemplate, sendWhatsAppTextMessage } from "@/server/notifications/whatsappService";

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
    const usersCollection = initDb.db("college_db").collection("users");

    if (action === "test") {
      if (!phone) return errorResponse("Phone number is required for test message");
      const sent = await sendWhatsAppDailyBriefingTemplate(
        phone,
        auth.payload.username || "Student",
        "Today",
        [],
        [],
        null
      );
      if (sent.success) {
        return NextResponse.json({ success: true, message: "Test WhatsApp template message sent successfully!" });
      } else {
        const fallback = await sendWhatsAppTextMessage(phone, "🎓 *SRMAP Student Portal Alert*\n\nHello! This is a test notification from your SRMAP Student Portal.");
        if (fallback.success) {
          return NextResponse.json({ success: true, message: "Test WhatsApp message sent successfully!" });
        }
        return errorResponse(sent.error || fallback.error || "Failed to send WhatsApp message.", {}, 500);
      }
    }

    // Save preferences
    await usersCollection.updateOne(
      { username: auth.payload.username },
      {
        $set: {
          "whatsapp.phone": phone || "",
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
