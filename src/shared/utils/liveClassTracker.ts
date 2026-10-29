import { DateTime } from "luxon";
import { parseSubject, TIME_SLOTS } from "@/shared/utils/timetable";

export interface LiveClassInfo {
  status: "ongoing" | "upcoming" | "finished" | "holiday";
  subjectCode: string;
  subjectName: string;
  venue: string;
  faculty?: string;
  slotIndex: number;
  timeRange: string;
  minutesUntilStart?: number;
  minutesUntilEnd?: number;
  attendancePercentage?: string;
  safeBunks?: number;
  classesNeeded?: number;
}

export function parseSlotTimeRange(timeRange: string): { startMinutes: number; endMinutes: number } {
  const [startStr, endStr] = timeRange.split("-");

  const toMinutes = (str: string) => {
    let [h, m] = str.split(":").map(Number);
    // Convert 1:00-5:30 PM slots to 24hr format
    if (h >= 1 && h <= 7) h += 12;
    return h * 60 + (m || 0);
  };

  return {
    startMinutes: toMinutes(startStr),
    endMinutes: toMinutes(endStr),
  };
}

export function getLiveClassStatus(
  timetable: any[] = [],
  subjects: any[] = [],
  attendance: any[] = []
): LiveClassInfo {
  const now = DateTime.now().setZone("Asia/Kolkata");
  const dayName = now.toFormat("cccc"); // e.g. "Thursday"
  const currentMinutes = now.hour * 60 + now.minute;

  const subjectMap = new Map<string, { name: string; faculty?: string }>();
  (subjects || []).forEach((s) => {
    if (s.code) {
      subjectMap.set(s.code, {
        name: s.name || s.code,
        faculty: s.faculty || "",
      });
    }
  });

  const attendanceMap = new Map<string, { percentage: string; safeBunks: number; needed: number }>();
  (attendance || []).forEach((att) => {
    const code = att.subject_code || att.code;
    if (code) {
      const conducted = Number(att.classes_conducted || 0);
      const present = Number(att.present || 0);
      const pct = att.attendance_percentage || (conducted > 0 ? `${((present / conducted) * 100).toFixed(1)}%` : "N/A");

      let safeBunks = 0;
      let needed = 0;
      if (conducted > 0) {
        if (present >= 0.75 * conducted) {
          safeBunks = Math.floor((present - 0.75 * conducted) / 0.75);
        } else {
          needed = Math.ceil((0.75 * conducted - present) / 0.25);
        }
      }

      attendanceMap.set(code, { percentage: pct, safeBunks, needed });
    }
  });

  const daySchedule = (timetable || []).find((d) => d.day?.toLowerCase() === dayName.toLowerCase());

  if (!daySchedule || !Array.isArray(daySchedule.subjects) || daySchedule.subjects.length === 0) {
    return {
      status: "holiday",
      subjectCode: "",
      subjectName: "No Classes Scheduled Today",
      venue: "SRM AP Campus",
      slotIndex: -1,
      timeRange: "",
    };
  }

  const validSlots: {
    slotIdx: number;
    raw: string;
    code: string;
    venue: string;
    startMinutes: number;
    endMinutes: number;
    timeRange: string;
  }[] = [];

  daySchedule.subjects.forEach((subjStr: string, slotIdx: number) => {
    if (!subjStr || subjStr.trim() === "-" || subjStr.trim() === "") return;
    const parsed = parseSubject(subjStr);
    if (!parsed || !parsed.code) return;

    const timeRange = TIME_SLOTS[slotIdx] || "9:00-9:50";
    const { startMinutes, endMinutes } = parseSlotTimeRange(timeRange);

    validSlots.push({
      slotIdx,
      raw: subjStr,
      code: parsed.code,
      venue: parsed.venue || "Campus Classroom",
      startMinutes,
      endMinutes,
      timeRange,
    });
  });

  if (validSlots.length === 0) {
    return {
      status: "holiday",
      subjectCode: "",
      subjectName: "No Classes Scheduled Today",
      venue: "SRM AP Campus",
      slotIndex: -1,
      timeRange: "",
    };
  }

  // 1. Check for ongoing class
  for (const slot of validSlots) {
    if (currentMinutes >= slot.startMinutes && currentMinutes <= slot.endMinutes) {
      const subjInfo = subjectMap.get(slot.code);
      const attInfo = attendanceMap.get(slot.code);

      return {
        status: "ongoing",
        subjectCode: slot.code,
        subjectName: subjInfo?.name || slot.code,
        venue: slot.venue,
        faculty: subjInfo?.faculty,
        slotIndex: slot.slotIdx,
        timeRange: slot.timeRange,
        minutesUntilEnd: Math.max(1, slot.endMinutes - currentMinutes),
        attendancePercentage: attInfo?.percentage,
        safeBunks: attInfo?.safeBunks,
        classesNeeded: attInfo?.needed,
      };
    }
  }

  // 2. Check for upcoming class today
  for (const slot of validSlots) {
    if (slot.startMinutes > currentMinutes) {
      const subjInfo = subjectMap.get(slot.code);
      const attInfo = attendanceMap.get(slot.code);

      return {
        status: "upcoming",
        subjectCode: slot.code,
        subjectName: subjInfo?.name || slot.code,
        venue: slot.venue,
        faculty: subjInfo?.faculty,
        slotIndex: slot.slotIdx,
        timeRange: slot.timeRange,
        minutesUntilStart: slot.startMinutes - currentMinutes,
        attendancePercentage: attInfo?.percentage,
        safeBunks: attInfo?.safeBunks,
        classesNeeded: attInfo?.needed,
      };
    }
  }

  // 3. All classes finished for today
  return {
    status: "finished",
    subjectCode: "",
    subjectName: "All Classes Finished for Today! 🎉",
    venue: "Hostel / Free Time",
    slotIndex: -1,
    timeRange: "",
  };
}
