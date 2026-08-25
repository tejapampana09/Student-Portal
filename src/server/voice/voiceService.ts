import { ALL_DAYS, parseSubject, TIME_SLOTS } from "@/shared/utils/timetable";
import { getStriverProblemOfTheDay } from "@/server/career/striverA2ZData";
import { DateTime } from "luxon";

export interface SpokenVoiceResponse {
  speech: string;
  title: string;
  details?: any;
}

export function generateNextClassSpeech(studentData: any): SpokenVoiceResponse {
  if (!studentData?.timetable) {
    return { speech: "I couldn't find your timetable data. Please open your SRM portal to refresh.", title: "No Timetable" };
  }

  const nowIST = DateTime.now().setZone("Asia/Kolkata");
  const currentDay = ALL_DAYS[nowIST.weekday % 7];
  const daySchedule = studentData.timetable.find((t: any) => t.day === currentDay);

  if (!daySchedule || !Array.isArray(daySchedule.subjects) || daySchedule.subjects.length === 0) {
    return { speech: `You have no scheduled lectures today on ${currentDay}. Enjoy your break!`, title: "No Lectures Today" };
  }

  const classes: any[] = [];
  daySchedule.subjects.forEach((slot: string, idx: number) => {
    const parsed = parseSubject(slot);
    if (parsed && parsed.code) {
      const subObj = studentData.subjects?.find((s: any) => s.code === parsed.code);
      classes.push({
        name: subObj?.name || parsed.code,
        timeSlot: TIME_SLOTS[idx] || "Upcoming Slot",
        venue: parsed.venue || "Campus Class",
      });
    }
  });

  if (classes.length === 0) {
    return { speech: `No scheduled lectures for today on ${currentDay}.`, title: "Free Day" };
  }

  const nextClass = classes[0];
  const speech = `Your next lecture is ${nextClass.name} at ${nextClass.timeSlot.split("-")[0]}, in Room ${nextClass.venue}.`;

  return {
    speech,
    title: `${nextClass.name} (${nextClass.timeSlot})`,
    details: nextClass,
  };
}

export function generateAttendanceSpeech(studentData: any): SpokenVoiceResponse {
  const attendanceList = studentData?.attendance || [];
  if (attendanceList.length === 0) {
    return { speech: "Attendance data is currently not available.", title: "No Attendance" };
  }

  let totalAttended = 0;
  let totalConducted = 0;
  const lowCourses: string[] = [];

  attendanceList.forEach((item: any) => {
    const conducted = parseInt(item.hours_conducted || "0", 10);
    const absent = parseInt(item.hours_absent || "0", 10);
    const attended = conducted - absent;
    totalAttended += attended;
    totalConducted += conducted;

    const pct = parseFloat(item.attendance_percentage || "0");
    if (pct < 75) {
      lowCourses.push(`${item.subject_name || item.subject_code} at ${pct}%`);
    }
  });

  const overall = totalConducted > 0 ? ((totalAttended / totalConducted) * 100).toFixed(1) : "0";
  const overallNum = parseFloat(overall);

  const safeBunks = Math.max(0, Math.floor((totalAttended - 0.75 * totalConducted) / 0.75));

  let speech = `Your overall attendance is ${overall} percent. `;
  if (overallNum >= 75) {
    speech += `You have ${safeBunks} safe bunks remaining across your courses.`;
  } else {
    speech += `Attention: your attendance is below 75 percent. You have low attendance in ${lowCourses.join(", ")}.`;
  }

  return {
    speech,
    title: `${overall}% Overall Attendance`,
    details: { overall, safeBunks, lowCourses },
  };
}

export function generateTasksSpeech(userDoc: any, studentData: any): SpokenVoiceResponse {
  const tasks: any[] = userDoc?.smartTasks || [];
  const pending = tasks.filter((t) => !t.completed);
  const potd = getStriverProblemOfTheDay(userDoc?.solvedDsaProblems || []);

  let speech = `You have ${pending.length} pending academic tasks today. `;
  if (potd) {
    speech += `Your Striver DSA Problem of the Day is ${potd.title}. `;
  }

  const urgentCoursera = (userDoc?.courseraCourses || []).filter((c: any) => {
    const days = Math.ceil((new Date(c.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days <= 3 && c.completedModules < c.totalModules;
  });

  if (urgentCoursera.length > 0) {
    speech += `You have an urgent Coursera deadline for ${urgentCoursera[0].title}.`;
  }

  return {
    speech,
    title: `${pending.length} Tasks Remaining`,
    details: { pendingCount: pending.length, potd: potd?.title },
  };
}
