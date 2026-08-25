import { GoogleGenAI } from "@google/genai";

export interface SmartTask {
  id: string;
  title: string;
  category: "class" | "attendance" | "coursera" | "coding" | "custom";
  priority: "high" | "medium" | "low";
  timeEstimate?: string;
  timeBlock?: "Morning" | "Afternoon" | "Evening" | "Night";
  completed: boolean;
  dueDate?: string;
  context?: string;
  subtasks?: Array<{ id: string; title: string; completed: boolean }>;
}

export async function generateSmartDayPlan(data: {
  studentName: string;
  currentDay: string;
  todayClasses: Array<{ name: string; timeSlot: string; venue?: string }>;
  lowAttendance: Array<{ subject_name?: string; subject_code?: string; attendance_percentage?: string | number }>;
  courseraCourses: Array<{ title: string; totalModules: number; completedModules: number; deadline: string }>;
  striverPotd?: { title: string; difficulty: string; step: string; keyIdea: string };
  leetcodeStreak?: number;
  customTasks?: Array<{ id: string; title: string; completed: boolean }>;
}): Promise<SmartTask[]> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_KEY;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
You are an intelligent academic AI mentor for an SRM University student named ${data.studentName}.
Generate a structured, realistic, and prioritized daily academic time-block schedule for today (${data.currentDay}).

Context:
- Today's Classes & Venues: ${JSON.stringify(data.todayClasses)}
- Low Attendance Alerts (<75%): ${JSON.stringify(data.lowAttendance)}
- Active Coursera Certifications: ${JSON.stringify(data.courseraCourses)}
- Striver A2Z DSA Problem of the Day: ${JSON.stringify(data.striverPotd || "Arrays / Hashing")}
- LeetCode Streak: ${data.leetcodeStreak || 0} days
- Student's Custom To-Dos: ${JSON.stringify(data.customTasks || [])}

Return a valid JSON array of 5-7 tasks with schema:
[
  {
    "id": "unique-task-id",
    "title": "Actionable task with emoji",
    "category": "class" | "attendance" | "coursera" | "coding" | "custom",
    "priority": "high" | "medium" | "low",
    "timeBlock": "Morning" | "Afternoon" | "Evening" | "Night",
    "timeEstimate": "e.g. 45 mins / 10:00 AM",
    "completed": false,
    "context": "Short helpful tip, room venue, or key insight",
    "subtasks": [
      { "id": "sub-1", "title": "Micro step", "completed": false }
    ]
  }
]
Output ONLY raw JSON.
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const raw = response.text || "";
      const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((t, idx) => ({
          id: t.id || `ai-task-${idx}-${Date.now()}`,
          title: t.title || "Academic task",
          category: t.category || "custom",
          priority: t.priority || "medium",
          timeBlock: t.timeBlock || "Morning",
          timeEstimate: t.timeEstimate || "30 mins",
          completed: Boolean(t.completed),
          context: t.context || "",
          subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
        }));
      }
    } catch (err) {
      console.warn("Gemini smart task generation fallback:", err);
    }
  }

  // Algorithmic synthesis fallback
  const tasks: SmartTask[] = [];

  // 1. Low attendance priority
  data.lowAttendance.forEach((sub, idx) => {
    tasks.push({
      id: `att-warn-${idx}`,
      title: `🚨 Must Attend ${sub.subject_name || sub.subject_code} (${sub.attendance_percentage}%)`,
      category: "attendance",
      priority: "high",
      timeBlock: "Morning",
      timeEstimate: "Mandatory",
      completed: false,
      context: "Attendance is currently below 75%. Bunking this class will risk debarment.",
    });
  });

  // 2. Today's classes
  data.todayClasses.slice(0, 3).forEach((cls, idx) => {
    tasks.push({
      id: `class-${idx}`,
      title: `📚 Attend ${cls.name} (${cls.timeSlot})`,
      category: "class",
      priority: "medium",
      timeBlock: idx === 0 ? "Morning" : "Afternoon",
      timeEstimate: cls.timeSlot,
      completed: false,
      context: cls.venue ? `Room: ${cls.venue}` : "Scheduled lecture session",
    });
  });

  // 3. Striver A2Z POTD
  if (data.striverPotd) {
    tasks.push({
      id: "striver-potd-task",
      title: `🔥 Solve Striver A2Z POTD: '${data.striverPotd.title}' (${data.striverPotd.difficulty})`,
      category: "coding",
      priority: "high",
      timeBlock: "Evening",
      timeEstimate: "45 mins",
      completed: false,
      context: `💡 ${data.striverPotd.keyIdea}`,
    });
  }

  // 4. Coursera module pace
  data.courseraCourses.forEach((c, idx) => {
    const remaining = c.totalModules - c.completedModules;
    if (remaining > 0) {
      const daysLeft = Math.ceil((new Date(c.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      tasks.push({
        id: `coursera-${idx}`,
        title: `🎓 Coursera: Module ${c.completedModules + 1} of '${c.title}'`,
        category: "coursera",
        priority: daysLeft <= 3 ? "high" : "medium",
        timeBlock: "Night",
        timeEstimate: "45 mins",
        completed: false,
        context: `Due in ${daysLeft} days. Finish video lectures & graded assessment.`,
      });
    }
  });

  return tasks;
}

export async function generateTaskSubsteps(taskTitle: string): Promise<Array<{ id: string; title: string; completed: boolean }>> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_KEY;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
Break down the task "${taskTitle}" for an SRM University engineering student into 3 concise, highly actionable 15-minute micro-subtasks.

Return a raw JSON array:
[
  { "id": "sub-1", "title": "Subtask title with emoji", "completed": false }
]
Output ONLY raw JSON.
`;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const raw = response.text || "";
      const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }

  return [
    { id: `sub-${Date.now()}-1`, title: "Review instructions & setup environment", completed: false },
    { id: `sub-${Date.now()}-2`, title: "Execute core implementation / study concept", completed: false },
    { id: `sub-${Date.now()}-3`, title: "Review output & mark completed", completed: false },
  ];
}

export async function generateCourseraModuleTasks(courseTitle: string, totalModules: number): Promise<Array<{ moduleNum: number; tasks: string[] }>> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_KEY;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
Break down the course '${courseTitle}' which has ${totalModules} modules into specific, realistic micro-tasks per module (e.g. video lectures, practice quizzes, lab assignment).

Return a raw JSON array of objects with the exact schema:
[
  {
    "moduleNum": 1,
    "tasks": [
      "Watch Intro & Core Concepts Video (20m)",
      "Complete Practice Quiz 1 (15m)",
      "Hands-on Programming Assignment (45m)"
    ]
  }
]
Output ONLY raw JSON.
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const raw = response.text || "";
      const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (err) {
      console.warn("Coursera breakdown error:", err);
    }
  }

  const list = [];
  for (let i = 1; i <= totalModules; i++) {
    list.push({
      moduleNum: i,
      tasks: [
        `Watch Module ${i} Core Concept Lectures (30 mins)`,
        `Complete Module ${i} Practice Assessment & Quiz (15 mins)`,
        `Finish Module ${i} Graded Project / Lab Assignment (45 mins)`,
      ],
    });
  }
  return list;
}
