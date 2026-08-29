import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { errorResponse, requireAuthResponse } from "@/server/utils/functions";

export async function POST(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { materialTitle, courseName, description, fileUrl, targetExam } = body;

    if (!materialTitle && !description) {
      return errorResponse("Material title or content is required.");
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
      return errorResponse("Gemini API key is not configured.", {}, 500);
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
You are an expert SRM University AP (SRMAP) Computer Science Professor and Academic Exam Evaluator.
Analyze the following Google Classroom course material / lecture PDF topic and generate high-yield study notes and predicted exam questions:

Course Name: ${courseName || "Academic Course"}
Material Title: ${materialTitle || "Lecture Material / PDF"}
Description / Topics: ${description || "Comprehensive module concepts and lab practicals"}
Target Exam Scope: ${targetExam || "End-Semester Examination (100 Marks)"}

Please output a structured JSON response with the following exact keys:
{
  "title": "Clear concise topic title",
  "keyTakeaways": [
    "Core concept 1 explained with technical precision",
    "Core concept 2 with key formulas/algorithms",
    "Important architectural or mathematical point",
    "Exam high-weightage topic summary"
  ],
  "predictedShortQuestions": [
    {
      "question": "Predicted 2-mark conceptual question?",
      "marks": 2,
      "answer": "Crisp 2-line model answer with key terminology"
    },
    {
      "question": "Another predicted 2-mark question?",
      "marks": 2,
      "answer": "Crisp model answer"
    },
    {
      "question": "Third predicted 2-mark definition/difference question?",
      "marks": 2,
      "answer": "Crisp model answer"
    }
  ],
  "predictedLongQuestions": [
    {
      "question": "Predicted 10-mark in-depth derivation / algorithm / system design question?",
      "marks": 10,
      "modelAnswer": "Complete step-by-step explanation including algorithm steps, mathematical proof/derivation, time/space complexity, and practical example."
    },
    {
      "question": "Second predicted 10-mark comprehensive question?",
      "marks": 10,
      "modelAnswer": "Comprehensive model answer."
    }
  ],
  "cheatSheetFormulas": [
    "Key formula / theorem 1",
    "Key time complexity / constraint rule"
  ]
}

Return strictly raw valid JSON. Do not include markdown codeblocks (\`\`\`json).
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    let rawText = response.text || "";
    rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const parsed = JSON.parse(rawText);
      return NextResponse.json({ success: true, result: parsed });
    } catch (parseErr) {
      return NextResponse.json({
        success: true,
        result: {
          title: materialTitle,
          keyTakeaways: [rawText.slice(0, 300)],
          predictedShortQuestions: [],
          predictedLongQuestions: [],
          cheatSheetFormulas: [],
        },
      });
    }
  } catch (error: any) {
    console.error("Error in AI Material Summarizer:", error);
    return errorResponse(error?.message || "Failed to generate AI study summary", {}, 500);
  }
}
