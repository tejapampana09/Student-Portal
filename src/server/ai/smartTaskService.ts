import { GoogleGenAI } from "@google/genai";

export interface SmartTask {
  id: string;
  title: string;
  category: "class" | "attendance" | "coursera" | "coding" | "custom";
  priority: "high" | "medium" | "low";
  timeEstimate?: string;
  completed: boolean;
  dueDate?: string;
  context?: string;
}

export async function generateSmartDayPlan(data: {
  studentName: string;
  currentDay: string;
  todayClasses: Array<{ name: string; timeSlot: string; venue?: string }>;
  lowAttendance: Array<{ subject_name?: string; subject_code?: string; attendance_percentage?: string | number }>;
  courseraCourses: Array<{ title: string; totalModules: number; completedModules: number; deadline: string }>;
  leetcodeStreak?: number;
  customTasks?: Array<{ id: string; title: string; completed: boolean }>;
}): Promise<SmartTask[]> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_KEY;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
You are an intelligent academic AI assistant for an SRM University student named ${data.studentName}.
Generate a structured, prioritized list of 4-7 actionable tasks for today (${data.currentDay}).

Context:
- Today's Classes: ${JSON.stringify(data.todayClasses)}
- Low Attendance (<75%): ${JSON.stringify(data.lowAttendance)}
- Active Coursera/Certifications: ${JSON.stringify(data.courseraCourses)}
- LeetCode Streak: ${data.leetcodeStreak || 0} days
- Existing To-Dos: ${JSON.stringify(data.customTasks || [])}

Return a valid JSON array of objects with the exact schema:
[
  {
    "id": "unique-string",
    "title": "Clear actionable title with emoji",
    "category": "class" | "attendance" | "coursera" | "coding" | "custom",
    "priority": "high" | "medium" | "low",
    "timeEstimate": "e.g. 45 mins / 1:00 PM",
    "completed": false,
    "context": "Brief helpful tip or room number"
  }
]
Output ONLY raw JSON. No markdown backticks, no markdown formatting.
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
          timeEstimate: t.timeEstimate || "30 mins",
          completed: Boolean(t.completed),
          context: t.context || "",
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
      timeEstimate: "Mandatory",
      completed: false,
      context: "Attendance is currently below the 75% university threshold.",
    });
  });

  // 2. Today's classes
  data.todayClasses.slice(0, 3).forEach((cls, idx) => {
    tasks.push({
      id: `class-${idx}`,
      title: `📚 Attend ${cls.name} (${cls.timeSlot.split("-")[0]})`,
      category: "class",
      priority: "medium",
      timeEstimate: cls.timeSlot,
      completed: false,
      context: cls.venue ? `Room: ${cls.venue}` : "Lecture session",
    });
  });

  // 3. Coursera module pace
  data.courseraCourses.forEach((c, idx) => {
    const remaining = c.totalModules - c.completedModules;
    if (remaining > 0) {
      const daysLeft = Math.ceil((new Date(c.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      tasks.push({
        id: `coursera-${idx}`,
        title: `🎓 Coursera: Module ${c.completedModules + 1} of '${c.title}'`,
        category: "coursera",
        priority: daysLeft <= 3 ? "high" : "medium",
        timeEstimate: "45 mins",
        completed: false,
        context: `Due in ${daysLeft} days. Complete reading & graded quiz.`,
      });
    }
  });

  // 4. Coding streak
  tasks.push({
    id: "leetcode-daily",
    title: `🔥 Solve 1 Daily LeetCode Problem (Keep ${data.leetcodeStreak || 0}-Day Streak)`,
    category: "coding",
    priority: "medium",
    timeEstimate: "30 mins",
    completed: false,
    context: "Consistent daily problem solving boosts campus placement readiness.",
  });

  return tasks;
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
Output ONLY raw JSON. No markdown backticks.
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

  // Fallback module template
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
