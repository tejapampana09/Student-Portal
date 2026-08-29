export async function sendWhatsAppTemplateMessage(
  recipientPhone: string,
  templateName: string = "hello_world",
  parameters: string[] = []
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return { success: false, error: "WhatsApp credentials missing in environment variables." };
  }

  let cleanPhone = recipientPhone.replace(/\D/g, "");
  if (cleanPhone.startsWith("0") && cleanPhone.length === 11) {
    cleanPhone = cleanPhone.slice(1);
  }
  if (cleanPhone.length === 10) {
    cleanPhone = "91" + cleanPhone;
  }

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

  const bodyComponents = parameters.length > 0 ? [
    {
      type: "body",
      parameters: parameters.map((p) => ({ type: "text", text: p })),
    },
  ] : undefined;

  try {
    const res = await fetch(url, {
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
          name: templateName,
          language: { code: "en_US" },
          ...(bodyComponents ? { components: bodyComponents } : {}),
        },
      }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json();
    if (res.ok) {
      return { success: true };
    }

    return { success: false, error: data?.error?.message || "Failed to deliver WhatsApp template." };
  } catch (err: any) {
    return { success: false, error: err.message || "Network exception" };
  }
}

export async function sendWhatsAppTextMessage(recipientPhone: string, message: string): Promise<{ success: boolean; error?: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return { success: false, error: "WhatsApp credentials missing in environment variables." };
  }

  let cleanPhone = recipientPhone.replace(/\D/g, "");
  if (cleanPhone.startsWith("0") && cleanPhone.length === 11) {
    cleanPhone = cleanPhone.slice(1);
  }
  if (cleanPhone.length === 10) {
    cleanPhone = "91" + cleanPhone;
  }

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

  try {
    // 1. Send template or direct text
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
    if (textRes.ok) {
      return { success: true };
    }

    // If 24h window is closed, fallback to approved template
    const templateFallback = await sendWhatsAppTemplateMessage(cleanPhone, "hello_world");
    if (templateFallback.success) {
      return { success: true };
    }

    const err = textData?.error?.message || templateFallback.error || "Failed to deliver WhatsApp message.";
    console.error("WhatsApp delivery failed:", textData?.error);
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

  text += `\n🔗 *Portal:* https://13.233.246.195.sslip.io\nHave a productive day! 🚀`;
  return text;
}
