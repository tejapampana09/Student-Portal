export async function sendWhatsAppTextMessage(recipientPhone: string, message: string): Promise<{ success: boolean; error?: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return { success: false, error: "WhatsApp credentials missing in environment variables." };
  }

  // Sanitize phone number (strip +, spaces, hyphens)
  let cleanPhone = recipientPhone.replace(/\D/g, "");
  if (cleanPhone.startsWith("0") && cleanPhone.length === 11) {
    cleanPhone = cleanPhone.slice(1);
  }
  if (cleanPhone.length === 10) {
    cleanPhone = "91" + cleanPhone;
  }

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

  // 1. Try sending rich custom text message
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

    const resText = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(textPayload),
      signal: AbortSignal.timeout(10000),
    });

    const dataText = await resText.json();

    if (resText.ok) {
      return { success: true };
    }

    console.warn("Direct WhatsApp text failed, trying template fallback...", dataText);

    // 2. If text fails (e.g. 24h window closed), send approved hello_world template
    const templatePayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: "template",
      template: {
        name: "hello_world",
        language: { code: "en_US" },
      },
    };

    const resTemplate = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(templatePayload),
      signal: AbortSignal.timeout(10000),
    });

    const dataTemplate = await resTemplate.json();

    if (resTemplate.ok) {
      return { success: true };
    }

    const errData = dataText?.error || dataTemplate?.error;
    const errMsg = errData?.message || "WhatsApp dispatch failed";
    console.error("WhatsApp Meta Cloud API error:", errData);
    return { success: false, error: errMsg };
  } catch (err: any) {
    console.error("WhatsApp dispatch network error:", err.message);
    return { success: false, error: err.message || "Network timeout" };
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
