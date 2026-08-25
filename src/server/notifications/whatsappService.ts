import axios from "axios";

export async function sendWhatsAppTextMessage(recipientPhone: string, message: string): Promise<boolean> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.error("WhatsApp credentials missing in environment variables.");
    return false;
  }

  // Sanitize phone number (strip +, spaces, hyphens)
  let cleanPhone = recipientPhone.replace(/\D/g, "");
  if (cleanPhone.length === 10) {
    cleanPhone = "91" + cleanPhone; // default India code if 10 digits
  }

  try {
    const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: "text",
      text: {
        preview_url: true,
        body: message,
      },
    };

    const res = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    return res.status === 200 || res.status === 201;
  } catch (error: any) {
    console.error("Error sending WhatsApp message via Meta Cloud API:", error?.response?.data || error?.message);
    return false;
  }
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
