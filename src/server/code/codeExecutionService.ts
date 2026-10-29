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


/** Host execution is intentionally unavailable. Use a separately isolated worker. */
export function executeCodeLocally(..._args: unknown[]): never {
  throw new Error("Code execution is disabled until an isolated sandbox is configured.");
}
