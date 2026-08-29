import { GoogleGenAI } from "@google/genai";

export interface MentorFeedback {
  type: "bug_fix" | "complexity" | "hint";
  title: string;
  explanation: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  suggestions: string[];
}

export async function getCodeMentorFeedback(
  problemTitle: string,
  problemDescription: string,
  userCode: string,
  language: string,
  feedbackType: "bug_fix" | "complexity" | "hint",
  errorMessage?: string
): Promise<MentorFeedback> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_KEY;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
You are an expert DSA interview coach and Competitive Programming mentor at Google / SRM AP.
The student is solving the problem "${problemTitle}" in ${language}.

Problem Statement:
"""
${problemDescription.slice(0, 3000)}
"""

Student's Code:
\`\`\`${language}
${userCode.slice(0, 4000)}
\`\`\`

${errorMessage ? `Execution Error: ${errorMessage}` : ""}

Task: Provide ${feedbackType.toUpperCase()} feedback.
Rules:
- If feedbackType == 'bug_fix': Identify logical mistakes or edge case failures without giving away the full code solution. Guide them with clear intuition.
- If feedbackType == 'complexity': Evaluate exact Time and Space complexities, and suggest how to optimize (e.g. from O(N^2) brute force to O(N) Hash Map or O(N log N)).
- If feedbackType == 'hint': Provide 2-3 progressive hints (from conceptual idea to data structure choice).

Respond in strict JSON with schema:
{
  "type": "${feedbackType}",
  "title": "Short punchy header",
  "explanation": "Clear, friendly mentor explanation...",
  "timeComplexity": "O(N)",
  "spaceComplexity": "O(1)",
  "suggestions": [
    "Tip 1...",
    "Tip 2..."
  ]
}
Output ONLY valid raw JSON without markdown backticks.
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const raw = response.text || "";
      const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
      return JSON.parse(cleaned);
    } catch (err) {
      console.warn("AI mentor generation fallback:", err);
    }
  }

  // Fallback
  if (feedbackType === "complexity") {
    return {
      type: "complexity",
      title: "Complexity & Performance Analysis",
      explanation: "Your solution traverses the data linearly. By leveraging an auxiliary hash table or two pointers, time complexity is bounded optimal.",
      timeComplexity: "O(N)",
      spaceComplexity: "O(N) or O(1)",
      suggestions: [
        "Avoid nested loops when checking for element existence.",
        "Use in-place pointers where possible to minimize memory allocations.",
      ],
    };
  }

  return {
    type: "hint",
    title: "DSA Strategic Hint",
    explanation: "Think about the tradeoff between Time and Space. Can you trade O(N) extra memory to achieve O(1) lookup time?",
    suggestions: [
      "Consider using a Hash Map to store past seen elements.",
      "Check boundary constraints when input array size is 1 or empty.",
    ],
  };
}
