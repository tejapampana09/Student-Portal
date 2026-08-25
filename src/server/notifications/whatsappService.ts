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

  try {
    // 1. Send approved hello_world template (guaranteed delivery outside 24h window)
    const templateRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "template",
        template: {
          name: "hello_world",
          language: { code: "en_US" },
        },
      }),
      signal: AbortSignal.timeout(10000),
    });

    const templateData = await templateRes.json();

    // 2. Also send custom detailed text message
    const textRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "text",
        text: {
          preview_url: false,
          body: message,
        },
      }),
      signal: AbortSignal.timeout(10000),
    });

    const textData = await textRes.json();

    if (templateRes.ok || textRes.ok) {
      return { success: true };
    }

    const err = textData?.error?.message || templateData?.error?.message || "Failed to deliver WhatsApp message.";
    console.error("WhatsApp delivery failed:", textData?.error || templateData?.error);
    return { success: false, error: err };
  } catch (err: any) {
    console.error("WhatsApp network exception:", err.message);
    return { success: false, error: err.message || "Network exception" };
  }
}

export function buildDailyBriefingMessage(
  studentName: string,
  currentDay: string,
  todayClasses: any[],
  lowAttendanceSubjects: any[],
  nextHoliday: any,
  recentEmails: any[],
  courseraCourses?: any[]
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

  // 3. Coursera / Certification Reminders
  if (courseraCourses && courseraCourses.length > 0) {
    const pendingCourses = courseraCourses.filter(
      (c) => c.completedModules < c.totalModules
    );
    if (pendingCourses.length > 0) {
      text += `\n🎓 *Coursera Tasks & Deadlines:*\n`;
      pendingCourses.slice(0, 2).forEach((c) => {
        const remaining = c.totalModules - c.completedModules;
        const daysLeft = Math.ceil(
          (new Date(c.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        text += `• *${c.title}*: ${remaining} modules left (${daysLeft > 0 ? `${daysLeft}d left` : "Due today!"})\n`;
      });
    }
  }

  // 4. Next Holiday
  if (nextHoliday) {
    text += `\n🏖️ *Next Holiday:* ${nextHoliday.occasion} on ${nextHoliday.date} (${nextHoliday.day})\n`;
  }

  // 5. Urgent Circulars
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
