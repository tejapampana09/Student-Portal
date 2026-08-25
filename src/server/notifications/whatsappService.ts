import axios from "axios";

export async function sendWhatsAppTextMessage(recipientPhone: string, message: string): Promise<{ success: boolean; error?: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return { success: false, error: "WhatsApp credentials missing in environment variables." };
  }

  // Sanitize phone number (strip +, spaces, hyphens)
  let cleanPhone = recipientPhone.replace(/\D/g, "");
  if (cleanPhone.length === 10) {
    cleanPhone = "91" + cleanPhone;
  }

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

  // First try sending template message (for 24h window compliance)
  try {
    const templatePayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: "template",
      template: {
        name: process.env.WHATSAPP_TEMPLATE_NAME || "email_alert",
        language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: "SRMAP Student Portal" },
              { type: "text", text: "Daily Academic Briefing" },
              { type: "text", text: "Academics" },
              { type: "text", text: "High" },
              { type: "text", text: message.length > 300 ? message.substring(0, 297) + "..." : message },
            ],
          },
        ],
      },
    };

    const res = await axios.post(url, templatePayload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    if (res.status === 200 || res.status === 201) {
      return { success: true };
    }
  } catch (templateErr: any) {
    // If template fails, attempt direct text message
    try {
      const textPayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "text",
        text: {
          preview_url: false,
          body: message,
        },
      };

      const resText = await axios.post(url, textPayload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });

      if (resText.status === 200 || resText.status === 201) {
        return { success: true };
      }
    } catch (textErr: any) {
      const errData = templateErr?.response?.data?.error || textErr?.response?.data?.error;
      const errMsg = errData?.message || textErr?.message || "WhatsApp dispatch failed";
      console.error("WhatsApp Meta Cloud API error:", errData || textErr?.message);
      return { success: false, error: errMsg };
    }
  }

  return { success: true };
}

export function buildDailyBriefingMessage(
  studentName: string,
  currentDay: string,
  todayClasses: any[],
  lowAttendanceSubjects: any[],
  nextHoliday: any,
  recentEmails: any[]
): string {
  let text = `☀️ *Good Morning, ${studentName}!* 🎓\n`;
  text += `Here is your SRMAP Daily Academic Briefing for *${currentDay}*:\n\n`;

  // 1. Timetable
  text += `📅 *Today's Classes:*\n`;
  if (todayClasses.length === 0) {
    text += `• No classes scheduled today! Enjoy your break. 🌴\n`;
  } else {
    todayClasses.forEach((c) => {
      text += `• ${c.timeSlot.split("-")[0]}: *${c.name || c.code}* ${c.venue ? `(${c.venue})` : ""}\n`;
    });
  }

  // 2. Attendance alerts
  if (lowAttendanceSubjects.length > 0) {
    text += `\n⚠️ *Attendance Alerts (<75%):*\n`;
    lowAttendanceSubjects.forEach((s) => {
      text += `• *${s.subject_name || s.subject_code}*: ${s.attendance_percentage}% (${s.present}/${s.classes_conducted} classes)\n`;
    });
  } else {
    text += `\n✅ *Attendance Status:* All subjects are above 75%!\n`;
  }

  // 3. Next Holiday
  if (nextHoliday) {
    text += `\n🏖️ *Next Holiday:* ${nextHoliday.occasion} on ${nextHoliday.date} (${nextHoliday.day})\n`;
  }

  // 4. Urgent Circulars
  if (recentEmails && recentEmails.length > 0) {
    const important = recentEmails.filter((e) => e.isImportant);
    if (important.length > 0) {
      text += `\n📢 *Urgent SRM Circulars:*\n`;
      important.slice(0, 2).forEach((e) => {
        text += `• ${e.subject}\n`;
      });
    }
  }

  text += `\n🔗 *Portal:* https://3.87.134.201.sslip.io\nHave a productive day! 🚀`;
  return text;
}
