import { parseSubject, TIME_SLOTS } from "@/shared/utils/timetable";
import academicCalendar from "@/static/academic_calendar.json";
import { DateTime } from "luxon";

interface ClassEvent {
  day: string;
  dayIndex: number; // 1 = Monday, ..., 5 = Friday
  slotIndex: number;
  timeRange: string;
  code: string;
  name: string;
  venue: string;
}

export function generateICS(timetable: any[], subjects: any[] = [], studentName = "Student"): string {
  const events: ClassEvent[] = [];

  const dayMap: Record<string, number> = {
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
  };

  const subjectMap = new Map<string, string>();
  (subjects || []).forEach((s) => {
    if (s.code) subjectMap.set(s.code, s.name || s.code);
  });

  (timetable || []).forEach((daySchedule) => {
    const dayName = daySchedule.day;
    const dayIdx = dayMap[dayName];
    if (!dayIdx || !Array.isArray(daySchedule.subjects)) return;

    daySchedule.subjects.forEach((slot: string, slotIdx: number) => {
      if (!slot || slot === "-") return;
      const parsed = parseSubject(slot);
      if (!parsed || !parsed.code) return;

      const timeRange = TIME_SLOTS[slotIdx] || "9:00-9:50";
      const name = subjectMap.get(parsed.code) || parsed.code;

      events.push({
        day: dayName,
        dayIndex: dayIdx,
        slotIndex: slotIdx,
        timeRange,
        code: parsed.code,
        name,
        venue: parsed.venue || "Campus Classroom",
      });
    });
  });

  // Calculate the first upcoming Monday for the base recurrence start
  let baseDate = DateTime.now().setZone("Asia/Kolkata").startOf("week");
  const untilDateStr = "20261231T235959Z"; // End of academic year

  let icsLines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SRMAP Student Portal//Academic Timetable//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:SRMAP Timetable (${studentName})`,
    "X-WR-TIMEZONE:Asia/Kolkata",
  ];

  // Helper to parse "9:00-9:50" or "1:00-1:50" to hour and minute
  function parseHourMin(tStr: string): { h: number; m: number } {
    let [h, m] = tStr.split(":").map(Number);
    if (h < 8) h += 12; // PM conversion for 1:00, 2:00, 3:00, 4:00
    return { h, m: m || 0 };
  }

  // 1. Add Class Schedule Events (Recurring Weekly)
  events.forEach((ev, idx) => {
    const [startStr, endStr] = ev.timeRange.split("-");
    const startHM = parseHourMin(startStr);
    const endHM = parseHourMin(endStr);

    const eventDate = baseDate.plus({ days: ev.dayIndex - 1 });
    const startDT = eventDate.set({ hour: startHM.h, minute: startHM.m, second: 0 });
    const endDT = eventDate.set({ hour: endHM.h, minute: endHM.m, second: 0 });

    const dtStart = startDT.toFormat("yyyyLLdd'T'HHmmss");
    const dtEnd = endDT.toFormat("yyyyLLdd'T'HHmmss");
    const dtStamp = DateTime.now().setZone("utc").toFormat("yyyyLLdd'T'HHmmss'Z'");
    const uid = `srmap-class-${ev.code.replace(/\s+/g, "")}-${ev.day}-${ev.slotIndex}-${idx}@srmap.portal`;

    icsLines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART;TZID=Asia/Kolkata:${dtStart}`,
      `DTEND;TZID=Asia/Kolkata:${dtEnd}`,
      `RRULE:FREQ=WEEKLY;UNTIL=${untilDateStr}`,
      `SUMMARY:${ev.code} - ${ev.name}`,
      `LOCATION:${ev.venue}`,
      `DESCRIPTION:Course: ${ev.name} (${ev.code})\\nRoom Venue: ${ev.venue}\\nSchedule: ${ev.day} ${ev.timeRange}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT10M",
      "ACTION:DISPLAY",
      `DESCRIPTION:Upcoming Class: ${ev.code} in 10 mins at ${ev.venue}`,
      "END:VALARM",
      "END:VEVENT"
    );
  });

  // 2. Add Academic Holidays (All-Day Events)
  const allHolidays = [
    ...(academicCalendar.oddSemesterHolidays || []),
    ...(academicCalendar.evenSemesterHolidays || []),
  ];

  allHolidays.forEach((h, hIdx) => {
    try {
      const [d, m, y] = h.date.split(".").map(Number);
      const holDate = DateTime.local(y, m, d, { zone: "Asia/Kolkata" });
      const dateStr = holDate.toFormat("yyyyLLdd");
      const nextDateStr = holDate.plus({ days: 1 }).toFormat("yyyyLLdd");
      const dtStamp = DateTime.now().setZone("utc").toFormat("yyyyLLdd'T'HHmmss'Z'");
      const uid = `srmap-holiday-${h.date}-${hIdx}@srmap.portal`;

      icsLines.push(
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART;VALUE=DATE:${dateStr}`,
        `DTEND;VALUE=DATE:${nextDateStr}`,
        `SUMMARY:🏖️ Holiday: ${h.occasion}`,
        `DESCRIPTION:SRM AP Academic Holiday: ${h.occasion} (${h.day})`,
        "END:VEVENT"
      );
    } catch {}
  });

  icsLines.push("END:VCALENDAR");

  return icsLines.join("\r\n");
}
