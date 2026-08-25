import { NextRequest, NextResponse } from "next/server";
import { useMongo } from "@/lib/database/useMongo";
import { errorResponse, requireAuthResponse } from "@/server/utils/functions";
import { STRIVER_FULL_PROBLEMS, STRIVER_STEPS, getStriverProblemOfTheDay } from "@/server/career/striverA2ZData";
import { GoogleGenAI } from "@google/genai";

export async function GET(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const initDb = await useMongo();
    const user = await initDb.db("college_db").collection<any>("users").findOne(
      { username: auth.payload.username },
      { projection: { solvedDsaProblems: 1 } }
    );

    const potd = getStriverProblemOfTheDay(user?.solvedDsaProblems || []);

    return NextResponse.json({
      success: true,
      problems: STRIVER_FULL_PROBLEMS,
      steps: STRIVER_STEPS,
      potd,
      solvedIds: user?.solvedDsaProblems || [],
    });
  } catch (error: any) {
    return errorResponse("Failed to fetch DSA problems", {}, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { action, problemId, problemTitle, topic } = body;
    const initDb = await useMongo();
    const usersCollection = initDb.db("college_db").collection("users");

    if (action === "mark_step_completed") {
      const { stepNum } = body;
      const user = await usersCollection.findOne({ username: auth.payload.username });
      const currentSolved: string[] = user?.solvedDsaProblems || [];
      const stepProblemIds = STRIVER_FULL_PROBLEMS.filter((p) => p.stepNum === Number(stepNum)).map((p) => p.id);
      
      const merged = Array.from(new Set([...currentSolved, ...stepProblemIds]));
      await usersCollection.updateOne(
        { username: auth.payload.username },
        { $set: { solvedDsaProblems: merged } },
        { upsert: true }
      );

      return NextResponse.json({ success: true, solvedIds: merged });
    }

    if (action === "toggle_solved") {
      const user = await usersCollection.findOne({ username: auth.payload.username });
      const currentSolved: string[] = user?.solvedDsaProblems || [];
      const updated = currentSolved.includes(problemId)
        ? currentSolved.filter((id) => id !== problemId)
        : [...currentSolved, problemId];

      await usersCollection.updateOne(
        { username: auth.payload.username },
        { $set: { solvedDsaProblems: updated } },
        { upsert: true }
      );

      return NextResponse.json({ success: true, solvedIds: updated });
    }

    if (action === "ai_explain") {
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_KEY;
      if (apiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey });
          const prompt = `
You are Striver (TakeUforward), the famous DSA educator.
Explain the optimal solution for the LeetCode problem "${problemTitle}" from the Striver's A2Z DSA sheet.

Provide a response in Markdown with:
1. 💡 **Core Intuition** (Why the optimal approach beats Brute Force)
2. ⏱️ **Time & Space Complexity** (Optimal Analysis)
3. 💻 **Optimal Code** (Clean Java, C++ or Python)
4. 🧠 **Common Interview Traps / Edge Cases**

Keep the tone encouraging, crystal clear, and concise.
`;
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
          });

          return NextResponse.json({ success: true, explanation: response.text });
        } catch (err: any) {
          console.warn("Gemini explanation error:", err);
        }
      }

      // Fallback
      return NextResponse.json({
        success: true,
        explanation: `### 💡 Core Intuition for ${problemTitle}
1. **Brute Force**: Involves high complexity checking all possibilities.
2. **Optimal Approach**: Look for invariants (e.g. two pointers, prefix sums, binary search on answer, or dynamic programming).
3. **Complexity**: Achieves optimal performance as recommended in Striver's A2Z Sheet.`,
      });
    }

    if (action === "generate_variation") {
      const targetTopic = topic || "Dynamic Programming / Graphs / Arrays";
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_KEY;
      if (apiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey });
          const prompt = `
Generate a fresh, realistic company interview problem (Amazon / Google / Microsoft style) based on the **${targetTopic}** technique from Striver's A2Z DSA sheet.

Return a raw JSON object with schema:
{
  "title": "Unique Problem Title",
  "difficulty": "Easy" | "Medium" | "Hard",
  "company": "e.g. Google / Amazon",
  "problemStatement": "Clear description with input/output examples",
  "sampleInput": "nums = [1, 2, 3], k = 2",
  "sampleOutput": "Output: 4",
  "optimalHint": "Key intuition..."
}
Output ONLY raw JSON. No markdown backticks.
`;
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
          });

          const raw = response.text || "";
          const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(cleaned);
          return NextResponse.json({ success: true, variation: parsed });
        } catch (err) {
          console.warn("Gemini variation error:", err);
        }
      }

      return NextResponse.json({
        success: true,
        variation: {
          title: "Minimum Operations to Balance Array",
          difficulty: "Medium",
          company: "Google / Amazon",
          problemStatement: "Given an array of integers, determine the minimum operations to make all adjacent differences equal.",
          sampleInput: "nums = [2, 4, 6, 8, 10]",
          sampleOutput: "0",
          optimalHint: "Use a difference map or prefix sum strategy!",
        },
      });
    }

    return errorResponse("Invalid action");
  } catch (error: any) {
    return errorResponse("Failed to process DSA practice request", {}, 500);
  }
}
