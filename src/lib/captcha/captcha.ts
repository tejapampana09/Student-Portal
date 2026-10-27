import { createWorker, Worker } from "tesseract.js";
import path from "path";
import { spawn } from "child_process";

let cachedWorker: Worker | null = null;
let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (cachedWorker) return cachedWorker;
  if (workerPromise) return await workerPromise;

  workerPromise = (async () => {
    try {
      const worker = await createWorker("eng");
      await worker.setParameters({
        tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      });
      cachedWorker = worker;
      return worker;
    } catch (err) {
      workerPromise = null;
      throw err;
    }
  })();

  return await workerPromise;
}

async function solveWithTesseract(imageBuffer: Buffer): Promise<string | null> {
  try {
    const worker = await getWorker();
    const ret = await worker.recognize(imageBuffer);
    const cleaned = ret.data.text.trim().replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (cleaned.length >= 4 && cleaned.length <= 6) {
      return cleaned;
    }
    return cleaned || null;
  } catch (err) {
    console.warn("[Tesseract Captcha] Error:", err);
    cachedWorker = null;
    workerPromise = null;
    return null;
  }
}

function solveWithPython(imageBuffer: Buffer): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const scriptPath = path.join(process.cwd(), "scripts", "solve_captcha.py");
      const pythonCmd = process.platform === "win32" ? "python" : "python3";
      const py = spawn(pythonCmd, [scriptPath]);
      let output = "";
      let errorOutput = "";

      py.stdout.on("data", (data) => {
        output += data.toString();
      });

      py.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      py.on("close", (code) => {
        if (code === 0 && output.trim()) {
          const lines = output.trim().split("\n");
          const lastLine = lines[lines.length - 1].trim();
          resolve(lastLine || null);
        } else {
          resolve(null);
        }
      });

      py.on("error", () => {
        resolve(null);
      });

      py.stdin.write(imageBuffer);
      py.stdin.end();
    } catch {
      resolve(null);
    }
  });
}

export async function solveCaptcha(imageBuffer: Buffer): Promise<string | null> {
  // 1. Primary: Fast in-process Tesseract WebAssembly OCR (Node.js native, 0 dependencies on Python/external APIs)
  const result = await solveWithTesseract(imageBuffer);
  if (result) return result;

  // 2. Secondary fallback: Local Python script (if Python runtime is available)
  return await solveWithPython(imageBuffer);
}
