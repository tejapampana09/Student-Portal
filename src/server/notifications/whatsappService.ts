/**
 * WhatsApp Cloud API Notification Service
 * Production Hardened:
 * 1. Strict E.164 phone validation
 * 2. PII / Phone number masking in logs
 * 3. Meta rate limit (429) and auth (401/403) monitoring
 * 4. Zero client-side secret exposure
 */

export function validateAndFormatPhone(phone: string): { valid: boolean; phone?: string; error?: string } {
  if (!phone || typeof phone !== "string") {
    return { valid: false, error: "Phone number is required." };
  }

  let clean = phone.replace(/\D/g, "");

  // Strip leading 0 if 11 digits (e.g. 09542696946 -> 9542696946)
  if (clean.startsWith("0") && clean.length === 11) {
    clean = clean.slice(1);
  }

  // If 10 digits (Standard Indian mobile), default to +91 country code
  if (clean.length === 10) {
    clean = "91" + clean;
  }

  // Validate E.164 standard: 10 to 15 digits total, digits only, country code must not start with 0
  const e164Regex = /^[1-9]\d{9,14}$/;
  if (!e164Regex.test(clean)) {
    return { valid: false, error: "Invalid phone number format. Please provide a valid 10-digit or international mobile number." };
  }

  return { valid: true, phone: clean };
}

export function maskPhoneNumber(phone: string): string {
  if (!phone) return "[EMPTY]";
  const clean = phone.replace(/\D/g, "");
  if (clean.length <= 4) return "****";
  const start = clean.slice(0, 4);
  const end = clean.slice(-2);
  return `+${start}****${end}`;
}

export async function sendWhatsAppTemplateMessage(
  recipientPhone: string,
  templateName: string = "hello_world",
  parameters: string[] = []
): Promise<{ success: boolean; error?: string; statusCode?: number }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return { success: false, error: "WhatsApp credentials not configured on server." };
  }

  const phoneValidation = validateAndFormatPhone(recipientPhone);
  if (!phoneValidation.valid || !phoneValidation.phone) {
    return { success: false, error: phoneValidation.error || "Invalid phone number." };
  }
  const cleanPhone = phoneValidation.phone;
  const maskedPhone = maskPhoneNumber(cleanPhone);

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

  const bodyComponents = parameters.length > 0 ? [
    {
      type: "body",
      parameters: parameters.map((p) => ({ type: "text", text: String(p || "").slice(0, 1024) })),
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

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      console.log(`[WhatsApp] Template '${templateName}' delivered successfully to ${maskedPhone}`);
      return { success: true, statusCode: res.status };
    }

    // Monitor Meta API rate limit / 429
    if (res.status === 429) {
      console.warn(`[WhatsApp] Meta API rate limit reached (429) when messaging ${maskedPhone}`);
      return { success: false, error: "WhatsApp service is temporarily rate-limited by Meta. Please retry shortly.", statusCode: 429 };
    }

    // Auth failures
    if (res.status === 401 || res.status === 403) {
      console.error(`[WhatsApp] Meta API authentication error (${res.status})`);
      return { success: false, error: "WhatsApp service configuration error. Please contact administrator.", statusCode: res.status };
    }

    const metaErrorMsg = data?.error?.message || "Failed to deliver WhatsApp template.";
    console.warn(`[WhatsApp] Meta delivery warning for ${maskedPhone} (Code: ${data?.error?.code}): ${metaErrorMsg}`);
    return { success: false, error: metaErrorMsg, statusCode: res.status };
  } catch (err: any) {
    console.error(`[WhatsApp] Network exception when sending to ${maskedPhone}`);
    return { success: false, error: "Network connection to WhatsApp Cloud API failed." };
  }
}

export async function sendWhatsAppDailyBriefingTemplate(
  recipientPhone: string,
  studentName: string,
  currentDay: string,
  todayClasses: any[],
  lowAttendanceSubjects: any[],
  nextHoliday: any
): Promise<{ success: boolean; error?: string }> {
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME || "srmap_daily_briefing";

  const classesParam = todayClasses.length === 0
    ? "No classes scheduled today 🌴"
    : `${todayClasses.length} class(es) scheduled`;

  const attendanceParam = lowAttendanceSubjects.length === 0
    ? "All subjects above 75% ✅"
    : `⚠️ ${lowAttendanceSubjects.length} subject(s) below 75%`;

  const holidayParam = nextHoliday
    ? `${nextHoliday.occasion} on ${nextHoliday.date}`
    : "No upcoming holidays";

  const parameters = [
    studentName || "Student",
    currentDay || "Today",
    classesParam,
    attendanceParam,
    holidayParam,
  ];

  // 1. Try custom approved template first
  const customRes = await sendWhatsAppTemplateMessage(recipientPhone, templateName, parameters);
  if (customRes.success) {
    return { success: true };
  }

  // 2. Fallback to pre-approved hello_world if custom template is in review or failed
  return await sendWhatsAppTemplateMessage(recipientPhone, "hello_world");
}

export async function sendWhatsAppTextMessage(recipientPhone: string, message: string): Promise<{ success: boolean; error?: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return { success: false, error: "WhatsApp credentials missing in environment variables." };
  }

  const phoneValidation = validateAndFormatPhone(recipientPhone);
  if (!phoneValidation.valid || !phoneValidation.phone) {
    return { success: false, error: phoneValidation.error || "Invalid phone number." };
  }
  const cleanPhone = phoneValidation.phone;
  const maskedPhone = maskPhoneNumber(cleanPhone);

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

  try {
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

    const textData = await textRes.json().catch(() => ({}));
    if (textRes.ok) {
      console.log(`[WhatsApp] Text message delivered to ${maskedPhone}`);
      return { success: true };
    }

    // If outside 24h customer window (Meta code 131047), fallback to template
    if (textData?.error?.code === 131047 || textRes.status === 400) {
      console.log(`[WhatsApp] 24h window closed for ${maskedPhone}, attempting template fallback`);
      const templateFallback = await sendWhatsAppTemplateMessage(cleanPhone, "hello_world");
      if (templateFallback.success) {
        return { success: true };
      }
    }

    if (textRes.status === 429) {
      return { success: false, error: "WhatsApp service rate limited by Meta. Please retry shortly." };
    }

    const err = textData?.error?.message || "Failed to deliver WhatsApp message.";
    return { success: false, error: err };
  } catch (err: any) {
    return { success: false, error: "Network connection to WhatsApp Cloud API failed." };
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
