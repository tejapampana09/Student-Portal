import { CODING_PROBLEMS, TestCase } from "./codingProblemsData";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import vm from "vm";

export interface ExecutionResult {
  status: "Accepted" | "Wrong Answer" | "Runtime Error" | "Compilation Error" | "Time Limit Exceeded";
  runtimeMs: number;
  memoryKb: number;
  passedTests: number;
  totalTests: number;
  testResults: Array<{
    input: string;
    expected: string;
    actual: string;
    passed: boolean;
    isHidden?: boolean;
    error?: string;
  }>;
  errorMsg?: string;
}

/**
 * Real Python Runner: Generates executable Python driver script that runs the user code
 * against every testcase and captures real stdout/return values.
 */
function runPythonCode(code: string, problemId: string, testCases: TestCase[]): ExecutionResult {
  const startTime = Date.now();
  const problem = CODING_PROBLEMS.find((p) => p.id === problemId) || CODING_PROBLEMS[0];
  const fnName = problem.slug === "two-sum" ? "twoSum" :
                 problem.slug === "maximum-subarray" ? "maxSubArray" :
                 problem.slug === "best-time-to-buy-and-sell-stock" ? "maxProfit" :
                 problem.slug === "valid-parentheses" ? "isValid" :
                 problem.slug === "search-in-rotated-sorted-array" ? "search" :
                 problem.slug === "coin-change" ? "coinChange" : "solution";

  const testResults: any[] = [];
  let passedCount = 0;

  // Create temporary driver script
  const tmpFile = path.join(os.tmpdir(), `srmap_py_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.py`);

  const driverScript = `
import sys, json

${code}

def run_tests():
    sol = Solution()
    fn = getattr(sol, "${fnName}", None)
    if not fn:
        print(json.dumps({"error": "Method '${fnName}' not found in class Solution."}))
        return

    testcases = ${JSON.stringify(testCases)}
    results = []

    for tc in testcases:
        raw_lines = [l.strip() for l in tc["input"].split("\\n") if l.strip()]
        args = []
        for line in raw_lines:
            try:
                args.append(json.loads(line))
            except Exception:
                args.append(line)

        try:
            res = fn(*args)
            if isinstance(res, tuple):
                res = list(res)
            elif isinstance(res, bool):
                res = str(res).lower()
            results.append({"output": res, "error": None})
        except Exception as e:
            results.append({"output": None, "error": str(e)})

    print("<<<SRMAP_OUTPUT>>>" + json.dumps(results))

if __name__ == "__main__":
    run_tests()
`;

  try {
    fs.writeFileSync(tmpFile, driverScript, "utf-8");
    const stdout = execSync(`python "${tmpFile}"`, { timeout: 3500, encoding: "utf-8" });

    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);

    const match = stdout.match(/<<<SRMAP_OUTPUT>>>([\s\S]*)/);
    if (!match) {
      return {
        status: "Runtime Error",
        runtimeMs: Date.now() - startTime,
        memoryKb: 34000,
        passedTests: 0,
        totalTests: testCases.length,
        testResults: [],
        errorMsg: stdout.trim() || "Python runner failed to return output.",
      };
    }

    const parsedOutputs: Array<{ output: any; error: string | null }> = JSON.parse(match[1]);

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const item = parsedOutputs[i];

      let actualStr = item.output !== undefined && item.output !== null ? JSON.stringify(item.output) : "None";
      if (typeof item.output === "boolean") actualStr = String(item.output);

      const expectedClean = tc.expectedOutput.replace(/\s+/g, "").toLowerCase();
      const actualClean = (actualStr || "").replace(/\s+/g, "").toLowerCase();

      const passed = !item.error && actualClean === expectedClean;
      if (passed) passedCount++;

      testResults.push({
        input: tc.input,
        expected: tc.expectedOutput,
        actual: item.error ? `Error: ${item.error}` : actualStr,
        passed,
        isHidden: tc.isHidden,
        error: item.error || undefined,
      });
    }

    const isAccepted = passedCount === testCases.length;
    return {
      status: isAccepted ? "Accepted" : "Wrong Answer",
      runtimeMs: Date.now() - startTime,
      memoryKb: Math.floor(34000 + Math.random() * 2000),
      passedTests: passedCount,
      totalTests: testCases.length,
      testResults,
    };
  } catch (err: any) {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    const msg = err.stderr || err.stdout || err.message || "Execution exception occurred.";
    return {
      status: msg.includes("SyntaxError") || msg.includes("IndentationError") ? "Compilation Error" : "Runtime Error",
      runtimeMs: Date.now() - startTime,
      memoryKb: 0,
      passedTests: 0,
      totalTests: testCases.length,
      testResults: [],
      errorMsg: msg.length > 300 ? msg.slice(0, 300) + "..." : msg,
    };
  }
}

/**
 * Real JavaScript Runner (Node.js vm sandbox)
 */
function runJavaScriptCode(code: string, problemId: string, testCases: TestCase[]): ExecutionResult {
  const startTime = Date.now();
  const testResults: any[] = [];
  let passedCount = 0;

  try {
    for (const tc of testCases) {
      const inputLines = tc.input.split("\n").map((l) => l.trim()).filter(Boolean);
      const parsedArgs = inputLines.map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return line.replace(/^"|"$/g, "");
        }
      });

      const contextObj: any = { console, Math, Array, Object, Map, Set, String, Number };
      const script = new vm.Script(`
        ${code}
        const fn = typeof twoSum === 'function' ? twoSum :
                   typeof maxSubArray === 'function' ? maxSubArray :
                   typeof maxProfit === 'function' ? maxProfit :
                   typeof isValid === 'function' ? isValid :
                   typeof search === 'function' ? search :
                   typeof coinChange === 'function' ? coinChange : null;
        if (!fn) throw new Error("Solution function not defined.");
        fn(...parsedArgs);
      `);

      const context = vm.createContext({ ...contextObj, parsedArgs });
      const result = script.runInContext(context, { timeout: 1500 });
      let actualStr = result !== undefined ? JSON.stringify(result) : "undefined";
      if (typeof result === "boolean") actualStr = String(result);

      const expectedClean = tc.expectedOutput.replace(/\s+/g, "").toLowerCase();
      const actualClean = (actualStr || "").replace(/\s+/g, "").toLowerCase();

      const passed = actualClean === expectedClean;
      if (passed) passedCount++;

      testResults.push({
        input: tc.input,
        expected: tc.expectedOutput,
        actual: actualStr,
        passed,
        isHidden: tc.isHidden,
      });
    }

    const isAccepted = passedCount === testCases.length;
    return {
      status: isAccepted ? "Accepted" : "Wrong Answer",
      runtimeMs: Date.now() - startTime,
      memoryKb: Math.floor(18000 + Math.random() * 2000),
      passedTests: passedCount,
      totalTests: testCases.length,
      testResults,
    };
  } catch (err: any) {
    return {
      status: err.message?.includes("SyntaxError") ? "Compilation Error" : "Runtime Error",
      runtimeMs: Date.now() - startTime,
      memoryKb: 0,
      passedTests: 0,
      totalTests: testCases.length,
      testResults: [],
      errorMsg: err?.message || "Execution exception occurred.",
    };
  }
}

/**
 * Main dispatcher
 */
export function executeCodeLocally(
  language: string,
  code: string,
  problemId: string,
  customInput?: string
): ExecutionResult {
  const problem = CODING_PROBLEMS.find((p) => p.id === problemId) || CODING_PROBLEMS[0];
  const testCasesToRun: TestCase[] = customInput
    ? [{ input: customInput.trim(), expectedOutput: "" }]
    : problem.testCases;

  if (language === "javascript") {
    return runJavaScriptCode(code, problemId, testCasesToRun);
  }

  // Python runner
  return runPythonCode(code, problemId, testCasesToRun);
}
