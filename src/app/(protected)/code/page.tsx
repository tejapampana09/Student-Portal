"use client";
import React, { useState, useEffect } from "react";
import {
  Code2,
  Play,
  Send,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  Lightbulb,
  Cpu,
  Layers,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Award,
  Flame,
  Building,
  Terminal,
  Clock,
  HardDrive,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/utils/useToast";
import API from "@/lib/api/axiosClient";
import { CODING_PROBLEMS, CodingProblem } from "@/server/code/codingProblemsData";
import { ExecutionResult } from "@/server/code/codeExecutionService";
import { MentorFeedback } from "@/server/code/aiMentorService";

export default function CodingArenaPage() {
  const { toast } = useToast();

  const [problems, setProblems] = useState<CodingProblem[]>(CODING_PROBLEMS);
  const [selectedProblem, setSelectedProblem] = useState<CodingProblem>(CODING_PROBLEMS[0]);
  const [language, setLanguage] = useState<"python" | "cpp" | "java" | "javascript">("python");
  const [code, setCode] = useState<string>(CODING_PROBLEMS[0].starterCode.python);

  // Left Panel Tab
  const [leftTab, setLeftTab] = useState<"description" | "solution" | "ai_mentor">("description");

  // Execution State
  const [executing, setExecuting] = useState(false);
  const [execResult, setExecResult] = useState<ExecutionResult | null>(null);
  const [activeTestCaseIdx, setActiveTestCaseIdx] = useState(0);
  const [customInput, setCustomInput] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);

  // AI Mentor State
  const [mentorLoading, setMentorLoading] = useState(false);
  const [mentorFeedback, setMentorFeedback] = useState<MentorFeedback | null>(null);

  // Solved tracking
  const [solvedIds, setSolvedIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("srmap_solved_problems");
      if (stored) setSolvedIds(JSON.parse(stored));
    } catch {}
  }, []);

  // Update starter code when problem or language changes
  const handleSelectProblem = (prob: CodingProblem) => {
    setSelectedProblem(prob);
    setCode(prob.starterCode[language] || prob.starterCode.python);
    setExecResult(null);
    setMentorFeedback(null);
    setActiveTestCaseIdx(0);
  };

  const handleLanguageChange = (lang: "python" | "cpp" | "java" | "javascript") => {
    setLanguage(lang);
    setCode(selectedProblem.starterCode[lang] || selectedProblem.starterCode.python);
    setExecResult(null);
  };

  const handleResetCode = () => {
    setCode(selectedProblem.starterCode[language] || selectedProblem.starterCode.python);
    toast({ title: "Code Reset to Starter Template" });
  };

  const handleRunCode = async (isSubmit = false) => {
    try {
      setExecuting(true);
      const res = await API.post("/code/run", {
        language,
        code,
        problemId: selectedProblem.id,
        customInput: isCustomMode ? customInput : undefined,
      });

      if (res.data?.result) {
        const result: ExecutionResult = res.data.result;
        setExecResult(result);

        if (result.status === "Accepted") {
          toast({
            title: isSubmit ? "Accepted! 🎉 100% Testcases Passed" : "Sample Tests Passed ✅",
            description: `Runtime: ${result.runtimeMs}ms • Memory: ${(result.memoryKb / 1024).toFixed(1)}MB`,
          });

          if (isSubmit && !solvedIds.includes(selectedProblem.id)) {
            const updated = [...solvedIds, selectedProblem.id];
            setSolvedIds(updated);
            try {
              localStorage.setItem("srmap_solved_problems", JSON.stringify(updated));
            } catch {}
          }
        } else {
          toast({
            title: `${result.status} ❌`,
            description: result.errorMsg || `${result.passedTests}/${result.totalTests} testcases passed.`,
            variant: "destructive",
          });
        }
      }
    } catch (err: any) {
      toast({
        title: "Execution Error",
        description: err.response?.data?.message || err.message || "Failed to execute code.",
        variant: "destructive",
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleRequestAIMentor = async (feedbackType: "bug_fix" | "complexity" | "hint") => {
    try {
      setMentorLoading(true);
      setLeftTab("ai_mentor");
      const res = await API.post("/code/ai-mentor", {
        problemTitle: selectedProblem.title,
        problemDescription: selectedProblem.description,
        userCode: code,
        language,
        feedbackType,
        errorMessage: execResult?.errorMsg,
      });

      if (res.data?.feedback) {
        setMentorFeedback(res.data.feedback);
        toast({ title: "AI Mentor Insights Ready! ✨" });
      }
    } catch (err: any) {
      toast({ title: "Mentor Unavailable", description: "Could not fetch AI insights.", variant: "destructive" });
    } finally {
      setMentorLoading(false);
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "Easy":
        return "text-emerald-400 bg-emerald-500/15 border-emerald-500/30";
      case "Medium":
        return "text-amber-400 bg-amber-500/15 border-amber-500/30";
      case "Hard":
        return "text-rose-400 bg-rose-500/15 border-rose-500/30";
      default:
        return "text-muted-foreground";
    }
  };

  const currentIdx = problems.findIndex((p) => p.id === selectedProblem.id);

  return (
    <div className="h-full flex flex-col gap-4 pb-6 max-w-7xl mx-auto w-full">
      {/* 🚀 Top Problem Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/10 border border-amber-500/30 text-amber-400">
            <Code2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                SRMAP Coding Arena
              </h1>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-[10px] font-mono">
                LeetCode & Placement Mode
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Online Judge • Multi-Language Compiler • Gemini AI Code Mentor
            </p>
          </div>
        </div>

        {/* Problem Selector & Solved Counter */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-bold">
            <Award className="h-3.5 w-3.5" />
            <span>Solved: {solvedIds.length}/{problems.length}</span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              disabled={currentIdx <= 0}
              onClick={() => handleSelectProblem(problems[currentIdx - 1])}
              className="h-8 w-8 rounded-xl border-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <select
              value={selectedProblem.id}
              onChange={(e) => {
                const found = problems.find((p) => p.id === e.target.value);
                if (found) handleSelectProblem(found);
              }}
              className="h-8 px-3 text-xs bg-white/5 border border-white/10 rounded-xl text-foreground font-semibold focus:outline-none"
            >
              {problems.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-foreground">
                  {solvedIds.includes(p.id) ? "✅ " : ""}{p.title} ({p.difficulty})
                </option>
              ))}
            </select>
            <Button
              size="icon"
              variant="outline"
              disabled={currentIdx >= problems.length - 1}
              onClick={() => handleSelectProblem(problems[currentIdx + 1])}
              className="h-8 w-8 rounded-xl border-white/10"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 💻 Main Workspace: Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* 📖 Left Panel: Problem, Solution & AI Mentor (5 Cols) */}
        <div className="lg:col-span-5 glass-card rounded-3xl p-5 border border-white/10 flex flex-col justify-between space-y-4 max-h-[820px] overflow-y-auto">
          <div className="space-y-4">
            {/* Header badges */}
            <div className="flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getDifficultyColor(selectedProblem.difficulty)}`}>
                  {selectedProblem.difficulty}
                </span>
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-white/5 text-muted-foreground border border-white/10">
                  {selectedProblem.category}
                </span>
              </div>

              {/* Company Tags */}
              <div className="flex items-center gap-1 flex-wrap">
                {selectedProblem.companies.slice(0, 3).map((comp) => (
                  <span key={comp} className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 font-mono">
                    {comp}
                  </span>
                ))}
              </div>
            </div>

            {/* Left Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
              {[
                { id: "description", label: "Description", icon: BookOpen },
                { id: "solution", label: "Optimal Approach", icon: Lightbulb },
                { id: "ai_mentor", label: "✨ AI Mentor", icon: Sparkles, highlight: true },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = leftTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setLeftTab(tab.id as any)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                      active
                        ? "bg-amber-500 text-black shadow-sm font-bold"
                        : tab.highlight
                        ? "text-purple-400 hover:bg-purple-500/10"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab 1: Description */}
            {leftTab === "description" && (
              <div className="space-y-4 text-xs text-foreground/90 leading-relaxed">
                <h2 className="text-base font-bold text-foreground">{selectedProblem.title}</h2>
                <p className="whitespace-pre-line">{selectedProblem.description}</p>

                {/* Examples */}
                <div className="space-y-3 pt-2">
                  <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px]">Examples:</h4>
                  {selectedProblem.examples.map((ex, i) => (
                    <div key={i} className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5 font-mono text-[11px]">
                      <div>
                        <strong className="text-amber-400 font-sans">Input: </strong>
                        <span className="text-foreground">{ex.input}</span>
                      </div>
                      <div>
                        <strong className="text-emerald-400 font-sans">Output: </strong>
                        <span className="text-foreground">{ex.output}</span>
                      </div>
                      {ex.explanation && (
                        <div className="text-muted-foreground font-sans text-[11px] pt-0.5">
                          <strong>Explanation: </strong>{ex.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Constraints */}
                <div className="space-y-2 pt-2">
                  <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px]">Constraints:</h4>
                  <ul className="space-y-1 pl-4 list-disc font-mono text-[11px] text-muted-foreground">
                    {selectedProblem.constraints.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Tab 2: Optimal Solution */}
            {leftTab === "solution" && (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                  <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                    <Lightbulb className="h-4 w-4" />
                    Optimal Solution Strategy
                  </h3>
                  <div className="flex items-center gap-4 text-xs font-mono pt-1">
                    <span className="text-foreground"><strong>Time:</strong> {selectedProblem.optimalComplexity.time}</span>
                    <span className="text-foreground"><strong>Space:</strong> {selectedProblem.optimalComplexity.space}</span>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed pt-1">
                    {selectedProblem.optimalComplexity.approach}
                  </p>
                </div>
              </div>
            )}

            {/* Tab 3: AI Mentor */}
            {leftTab === "ai_mentor" && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="font-bold text-purple-300 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                    Gemini DSA Copilot
                  </span>
                  {mentorLoading && <Loader2 className="h-4 w-4 animate-spin text-purple-400" />}
                </div>

                {/* Mentor Action Triggers */}
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRequestAIMentor("bug_fix")}
                    disabled={mentorLoading}
                    className="h-8 rounded-xl text-[11px] font-semibold border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
                  >
                    🐞 Fix Bug
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRequestAIMentor("complexity")}
                    disabled={mentorLoading}
                    className="h-8 rounded-xl text-[11px] font-semibold border-sky-500/30 text-sky-300 hover:bg-sky-500/10"
                  >
                    ⏱️ Complexity
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRequestAIMentor("hint")}
                    disabled={mentorLoading}
                    className="h-8 rounded-xl text-[11px] font-semibold border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                  >
                    💡 Get Hint
                  </Button>
                </div>

                {/* Mentor Feedback Display */}
                {mentorFeedback ? (
                  <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-3">
                    <h4 className="text-xs font-bold text-purple-300">{mentorFeedback.title}</h4>
                    <p className="text-muted-foreground leading-relaxed">{mentorFeedback.explanation}</p>

                    {mentorFeedback.timeComplexity && (
                      <div className="flex items-center gap-3 font-mono text-[11px] text-purple-200">
                        <span>Time: <strong>{mentorFeedback.timeComplexity}</strong></span>
                        <span>Space: <strong>{mentorFeedback.spaceComplexity}</strong></span>
                      </div>
                    )}

                    {mentorFeedback.suggestions && mentorFeedback.suggestions.length > 0 && (
                      <ul className="space-y-1 text-[11px] text-purple-200/90 pl-4 list-disc">
                        {mentorFeedback.suggestions.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-muted-foreground bg-white/[0.02] rounded-2xl border border-dashed border-white/10">
                    Tap any button above to get instant AI debugging, complexity analysis, or strategic hints for your code!
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 💻 Right Panel: Code Editor & Execution Console (7 Cols) */}
        <div className="lg:col-span-7 glass-card rounded-3xl p-5 border border-white/10 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            {/* Editor Toolbar */}
            <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value as any)}
                  className="h-8 px-3 text-xs bg-white/5 border border-white/10 rounded-xl text-foreground font-semibold focus:outline-none"
                >
                  <option value="python" className="bg-slate-900 text-foreground">Python 3</option>
                  <option value="cpp" className="bg-slate-900 text-foreground">C++ (g++ 17)</option>
                  <option value="java" className="bg-slate-900 text-foreground">Java (OpenJDK 17)</option>
                  <option value="javascript" className="bg-slate-900 text-foreground">JavaScript (Node.js)</option>
                </select>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleResetCode}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </Button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRunCode(false)}
                  disabled={executing}
                  className="h-8 px-3.5 rounded-xl text-xs font-semibold border-white/15 gap-1.5 shadow-sm text-foreground"
                >
                  {executing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 text-amber-400" />}
                  Run Code
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleRunCode(true)}
                  disabled={executing}
                  className="h-8 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black shadow-md shadow-emerald-500/20 gap-1.5"
                >
                  {executing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Submit
                </Button>
              </div>
            </div>

            {/* Code Editor Area */}
            <div className="relative rounded-2xl bg-black/40 border border-white/10 p-3 font-mono text-xs overflow-hidden shadow-inner">
              <Textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={16}
                spellCheck={false}
                className="w-full bg-transparent border-0 resize-none font-mono text-xs text-emerald-300 focus-visible:ring-0 leading-relaxed p-0 selection:bg-emerald-500/30"
              />
            </div>
          </div>

          {/* Bottom Testcase & Execution Console */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            {/* Testcase Tabs */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {selectedProblem.testCases.map((tc, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setIsCustomMode(false);
                      setActiveTestCaseIdx(idx);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                      !isCustomMode && activeTestCaseIdx === idx
                        ? "bg-white/15 text-foreground border border-white/20"
                        : "text-muted-foreground hover:bg-white/5"
                    }`}
                  >
                    Case {idx + 1}
                  </button>
                ))}
                <button
                  onClick={() => setIsCustomMode(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                    isCustomMode
                      ? "bg-white/15 text-foreground border border-white/20 font-bold"
                      : "text-muted-foreground hover:bg-white/5"
                  }`}
                >
                  Custom
                </button>
              </div>

              {/* Execution status indicator */}
              {execResult && (
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className={`font-bold flex items-center gap-1 ${execResult.status === "Accepted" ? "text-emerald-400" : "text-rose-400"}`}>
                    {execResult.status === "Accepted" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    {execResult.status}
                  </span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {execResult.runtimeMs}ms
                  </span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <HardDrive className="h-3 w-3" />
                    {(execResult.memoryKb / 1024).toFixed(1)}MB
                  </span>
                </div>
              )}
            </div>

            {/* Testcase Input / Output Display */}
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 font-mono text-xs space-y-2">
              {isCustomMode ? (
                <div className="space-y-1.5">
                  <span className="text-[11px] text-muted-foreground font-sans font-semibold">Custom Test Input:</span>
                  <Textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    rows={3}
                    placeholder="Enter custom input parameters (e.g. [2,7,11,15]\n9)..."
                    className="h-16 text-xs bg-white/5 border-white/10 rounded-xl font-mono"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div>
                    <span className="text-[11px] text-muted-foreground font-sans font-semibold">Input: </span>
                    <span className="text-foreground">{selectedProblem.testCases[activeTestCaseIdx]?.input}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground font-sans font-semibold">Expected: </span>
                    <span className="text-emerald-400">{selectedProblem.testCases[activeTestCaseIdx]?.expectedOutput}</span>
                  </div>
                  {execResult?.testResults?.[activeTestCaseIdx] && (
                    <div>
                      <span className="text-[11px] text-muted-foreground font-sans font-semibold">Your Output: </span>
                      <span className={execResult.testResults[activeTestCaseIdx].passed ? "text-emerald-400" : "text-rose-400"}>
                        {execResult.testResults[activeTestCaseIdx].actual}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
