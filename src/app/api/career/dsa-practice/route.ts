import { NextRequest, NextResponse } from "next/server";
import { useMongo } from "@/lib/database/useMongo";
import { errorResponse, requireAuthResponse } from "@/server/utils/functions";
import { STRIVER_HASHING_PROBLEMS } from "@/server/career/striverA2ZData";
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

    return NextResponse.json({
      success: true,
      problems: STRIVER_HASHING_PROBLEMS,
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
    const { action, problemId, problemTitle } = body;
    const initDb = await useMongo();
    const usersCollection = initDb.db("college_db").collection("users");

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
Explain the optimal solution for the LeetCode problem "${problemTitle}" from the Hashing module of the A2Z DSA sheet.

Provide a response in Markdown with:
1. 💡 **Core Intuition** (Why Hashing beats Brute Force)
2. ⏱️ **Time & Space Complexity** (Optimal Analysis)
3. 💻 **Optimal Code** (Clean Java & C++ or Python)
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
1. **Brute Force**: Involves nested loops checking all pairs or subarrays in O(N²) time.
2. **Optimal Hashing Approach**: By using a Hash Map or Hash Set, we achieve O(1) average lookups, cutting total time complexity down to **O(N)**!
3. **Key Pattern**: For frequency/pair problems, insert elements as you iterate and check for the complement (target - current) or (prefixSum - target).`,
      });
    }

    if (action === "generate_variation") {
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_KEY;
      if (apiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey });
          const prompt = `
Generate a fresh, realistic company interview problem (Amazon / Google / Microsoft style) based on the **Hashing & Prefix Sum / Frequency** technique from Striver's A2Z DSA sheet.

Return a raw JSON object with schema:
{
  "title": "Unique Problem Title",
  "difficulty": "Easy" | "Medium" | "Hard",
  "company": "e.g. Amazon",
  "problemStatement": "Clear description with input/output examples",
  "sampleInput": "nums = [1, 2, 3, -3, 1, 1, 1, 4, 2, -3], k = 3",
  "sampleOutput": "Output: 8",
  "optimalHint": "Store prefix sums in a HashMap..."
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

      // Fallback variation
      return NextResponse.json({
        success: true,
        variation: {
          title: "Subarray with Equal 0s and 1s",
          difficulty: "Medium",
          company: "Amazon / Microsoft",
          problemStatement: "Given a binary array nums, find the maximum length of a contiguous subarray with an equal number of 0 and 1.",
          sampleInput: "nums = [0, 1, 0, 1, 1, 0, 0]",
          sampleOutput: "6",
          optimalHint: "Convert all 0s to -1, then this reduces to finding the Longest Subarray with Sum = 0 using a HashMap!",
        },
      });
    }

    return errorResponse("Invalid action");
  } catch (error: any) {
    return errorResponse("Failed to process DSA practice request", {}, 500);
  }
}
