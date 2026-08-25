import { NextRequest, NextResponse } from "next/server";
import { useMongo } from "@/lib/database/useMongo";
import { errorResponse, requireAuthResponse } from "@/server/utils/functions";
import { generateSmartDayPlan, generateTaskSubsteps } from "@/server/ai/smartTaskService";
import { decryptData } from "@/server/utils/functions";
import { parseSubject, TIME_SLOTS } from "@/shared/utils/timetable";
import { getStriverProblemOfTheDay } from "@/server/career/striverA2ZData";

export async function GET(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const initDb = await useMongo();
    const user = await initDb.db("college_db").collection<any>("users").findOne(
      { username: auth.payload.username },
      { projection: { data: 1, courseraCourses: 1, codingProfiles: 1, smartTasks: 1, solvedDsaProblems: 1 } }
    );

    if (user?.smartTasks && Array.isArray(user.smartTasks) && user.smartTasks.length > 0) {
      return NextResponse.json({ success: true, tasks: user.smartTasks });
    }

    // Auto-generate if not yet cached
    let studentData: any = null;
    if (user?.data) {
      try {
        studentData = decryptData(user.data);
      } catch {}
    }

    const currentDay = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());
    const daySchedule = studentData?.timetable?.find((t: any) => t.day === currentDay);
    const todayClasses: any[] = [];
    if (daySchedule && Array.isArray(daySchedule.subjects)) {
      daySchedule.subjects.forEach((slot: string, idx: number) => {
        const parsed = parseSubject(slot);
        if (parsed && parsed.code) {
          const subObj = studentData?.subjects?.find((s: any) => s.code === parsed.code);
          todayClasses.push({
            name: subObj?.name || parsed.code,
            timeSlot: TIME_SLOTS[idx] || "Class Slot",
            venue: parsed.venue,
          });
        }
      });
    }

    const lowAttendance = (studentData?.attendance || []).filter((a: any) => {
      const pct = parseFloat(a.attendance_percentage || "0");
      return pct < 75;
    });

    const potd = getStriverProblemOfTheDay(user?.solvedDsaProblems || []);

    const tasks = await generateSmartDayPlan({
      studentName: studentData?.profile?.studentName || auth.payload.username,
      currentDay,
      todayClasses,
      lowAttendance,
      courseraCourses: user?.courseraCourses || [],
      striverPotd: potd,
      leetcodeStreak: 3,
    });

    await initDb.db("college_db").collection("users").updateOne(
      { username: auth.payload.username },
      { $set: { smartTasks: tasks } }
    );

    return NextResponse.json({ success: true, tasks });
  } catch (error: any) {
    return errorResponse("Failed to generate smart tasks", {}, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { action, tasks, task, taskTitle } = body;
    const initDb = await useMongo();
    const usersCollection = initDb.db("college_db").collection("users");

    if (action === "save_all") {
      await usersCollection.updateOne(
        { username: auth.payload.username },
        { $set: { smartTasks: tasks } },
        { upsert: true }
      );
      return NextResponse.json({ success: true, message: "Tasks updated" });
    }

    if (action === "toggle") {
      const user = await usersCollection.findOne({ username: auth.payload.username });
      const currentTasks: any[] = user?.smartTasks || [];
      const updated = currentTasks.map((t: any) => (t.id === task.id ? { ...t, completed: !t.completed } : t));
      await usersCollection.updateOne(
        { username: auth.payload.username },
        { $set: { smartTasks: updated } }
      );
      return NextResponse.json({ success: true, tasks: updated });
    }

    if (action === "split_subtasks") {
      const subtasks = await generateTaskSubsteps(taskTitle || "Academic Study");
      return NextResponse.json({ success: true, subtasks });
    }

    if (action === "regenerate") {
      const user = await usersCollection.findOne({ username: auth.payload.username });
      let studentData: any = null;
      if (user?.data) {
        try {
          studentData = decryptData(user.data);
        } catch {}
      }

      const currentDay = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());
      const daySchedule = studentData?.timetable?.find((t: any) => t.day === currentDay);
      const todayClasses: any[] = [];
      if (daySchedule && Array.isArray(daySchedule.subjects)) {
        daySchedule.subjects.forEach((slot: string, idx: number) => {
          const parsed = parseSubject(slot);
          if (parsed && parsed.code) {
            const subObj = studentData?.subjects?.find((s: any) => s.code === parsed.code);
            todayClasses.push({
              name: subObj?.name || parsed.code,
              timeSlot: TIME_SLOTS[idx] || "Class Slot",
              venue: parsed.venue,
            });
          }
        });
      }

      const lowAttendance = (studentData?.attendance || []).filter((a: any) => {
        const pct = parseFloat(a.attendance_percentage || "0");
        return pct < 75;
      });

      const potd = getStriverProblemOfTheDay(user?.solvedDsaProblems || []);

      const newTasks = await generateSmartDayPlan({
        studentName: studentData?.profile?.studentName || auth.payload.username,
        currentDay,
        todayClasses,
        lowAttendance,
        courseraCourses: user?.courseraCourses || [],
        striverPotd: potd,
        leetcodeStreak: 3,
      });

      await usersCollection.updateOne(
        { username: auth.payload.username },
        { $set: { smartTasks: newTasks } }
      );

      return NextResponse.json({ success: true, tasks: newTasks });
    }

    return errorResponse("Invalid action");
  } catch (error: any) {
    return errorResponse("Failed to update smart tasks", {}, 500);
  }
}
