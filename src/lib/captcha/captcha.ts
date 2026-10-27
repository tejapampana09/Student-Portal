import path from "path";
import { spawn } from "child_process";

export function solveWithPython(imageBuffer: Buffer): Promise<string | null> {
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
          console.error(`[Python Captcha (${pythonCmd})] Exit code ${code}:`, errorOutput);
          resolve(null);
        }
      });

      py.on("error", (err) => {
        console.error(`[Python Captcha (${pythonCmd})] Process spawn error:`, err.message);
        const fallbackCmd = pythonCmd === "python3" ? "python" : "python3";
        try {
          const fallbackPy = spawn(fallbackCmd, [scriptPath]);
          let fbOut = "";
          fallbackPy.stdout.on("data", (d) => { fbOut += d.toString(); });
          fallbackPy.on("close", (c) => {
            if (c === 0 && fbOut.trim()) {
              resolve(fbOut.trim().split("\n").pop()?.trim() || null);
            } else {
              resolve(null);
            }
          });
          fallbackPy.on("error", () => resolve(null));
          fallbackPy.stdin.write(imageBuffer);
          fallbackPy.stdin.end();
        } catch {
          resolve(null);
        }
      });

      py.stdin.write(imageBuffer);
      py.stdin.end();
    } catch (e) {
      console.error("[Python Captcha] Exception:", e);
      resolve(null);
    }
  });
}

export async function solveCaptcha(imageBuffer: Buffer): Promise<string | null> {
  return await solveWithPython(imageBuffer);
}
