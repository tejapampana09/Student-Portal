import sharp from "sharp";
import path from "path";
import { spawn } from "child_process";
import * as tf from "@tensorflow/tfjs";
import { captchaModelPath } from "@/static/captcha/captchaModel";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_";
const IDX_TO_CHAR: Record<number, string> = {};
for (let i = 0; i < CHARS.length; i++) {
    IDX_TO_CHAR[i] = CHARS[i];
}

let cachedModel: any = null;
let loadingPromise: Promise<any> | null = null;

export async function getCaptchaModel(): Promise<any> {
    if (cachedModel) return cachedModel;
    if (loadingPromise) return await loadingPromise;

    loadingPromise = (async () => {
        try {
            console.log("[Captcha Solver] Loading model from:- ", captchaModelPath);
            const tfliteModule: any = await import("tfjs-tflite-node");
            const loadTFLiteModel = tfliteModule?.loadTFLiteModel || tfliteModule?.default?.loadTFLiteModel;
            if (typeof loadTFLiteModel !== "function") {
                throw new Error("Captcha model loader function not available!");
            }
            cachedModel = await loadTFLiteModel(captchaModelPath);
            console.log("[Captcha Solver] Model successfully loaded and cached!");
            return cachedModel;
        } catch (error) {
            console.error("[Captcha Solver] Failed to load TFLite model:", error);
            loadingPromise = null;
            throw error;
        }
    })();

    return await loadingPromise;
}

export async function preprocessCaptcha(imageBuffer: Buffer): Promise<tf.Tensor4D> {
    const { data, info } = await sharp(imageBuffer)
        .extract({ left: 0, top: 0, width: 120, height: 25 })
        .grayscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const floatArray = new Float32Array(info.width * info.height);
    for (let i = 0; i < data.length; i++) {
        floatArray[i] = data[i] / 255.0;
    }

    return tf.tensor4d(floatArray, [1, 25, 120, 1], "float32");
}

export function decodeCaptchaOutput(outputTensor: tf.Tensor): string {
    const data = outputTensor.dataSync();
    let predictedText = "";

    for (let charIdx = 0; charIdx < 5; charIdx++) {
        let maxVal = -Infinity;
        let maxClass = 0;
        const offset = charIdx * 37;

        for (let classIdx = 0; classIdx < 37; classIdx++) {
            const val = data[offset + classIdx];
            if (val > maxVal) {
                maxVal = val;
                maxClass = classIdx;
            }
        }

        predictedText += IDX_TO_CHAR[maxClass] || "";
    }

    return predictedText.replace(/_/g, "");
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
                    console.error(`[Python Captcha (${pythonCmd})] Exit code ${code}:`, errorOutput);
                    resolve(null);
                }
            });

            py.on("error", (err) => {
                console.error(`[Python Captcha (${pythonCmd})] Process spawn error:`, err.message);
                // Secondary fallback attempt if python3 vs python mismatch
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
    try {
        const model = await getCaptchaModel();
        const inputTensor = await preprocessCaptcha(imageBuffer);
        const outputTensor = model.predict(inputTensor) as tf.Tensor;

        const captchaText = decodeCaptchaOutput(outputTensor);

        inputTensor.dispose();
        outputTensor.dispose();

        return captchaText || null;
    } catch (error: any) {
        console.log("[Captcha Solver] In-process model unavailable, using Python LiteRT engine fallback...");
        return await solveWithPython(imageBuffer);
    }
}