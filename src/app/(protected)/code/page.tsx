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
  ExternalLink,
  Eye,
  EyeOff,
  Key,
  ShieldCheck,
  Zap,
  Check,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/utils/useToast";
import API from "@/lib/api/axiosClient";
import { CODING_PROBLEMS, CodingProblem } from "@/server/code/codingProblemsData";
import { ExecutionResult } from "@/server/code/codeExecutionService";
import { MentorFeedback } from "@/server/code/aiMentorService";
import { LeetCodeSubmissionResponse } from "@/server/code/leetcodeSubmitService";

export default function CodingArenaPage() {
  const { toast } = useToast();

  const [problems, setProblems] = useState<CodingProblem[]>(CODING_PROBLEMS);
  const [selectedProblem, setSelectedProblem] = useState<CodingProblem>(CODING_PROBLEMS[0]);
  const [language, setLanguage] = useState<"python" | "cpp" | "java" | "javascript">("python");
  const [code, setCode] = useState<string>(CODING_PROBLEMS[0].starterCode.python);

  // Left Panel Tab
  const [leftTab, setLeftTab] = useState<"description" | "solution" | "ai_mentor">("description");
  const [showSolutionCode, setShowSolutionCode] = useState(false);

  // Local Execution State
  const [executing, setExecuting] = useState(false);
  const [execResult, setExecResult] = useState<ExecutionResult | null>(null);
  const [activeTestCaseIdx, setActiveTestCaseIdx] = useState(0);
  const [customInput, setCustomInput] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Direct LeetCode Cloud Submission State
  const [submittingToLC, setSubmittingToLC] = useState(false);
  const [lcResult, setLcResult] = useState<LeetCodeSubmissionResponse | null>(null);
  const [isLCConnected, setIsLCConnected] = useState(false);
  const [lcUsername, setLcUsername] = useState<string | null>(null);
  const [isLCModalOpen, setIsLCModalOpen] = useState(false);
  const [lcSessionInput, setLcSessionInput] = useState("");
  const [connectingLC, setConnectingLC] = useState(false);

  // AI Mentor State
  const [mentorLoading, setMentorLoading] = useState(false);
  const [mentorFeedback, setMentorFeedback] = useState<MentorFeedback | null>(null);

  // Solved tracking
  const [solvedIds, setSolvedIds] = useState<string[]>([]);

  const fetchLCStatus = async () => {
    try {
      const res = await API.get("/code/submit-leetcode");
      if (res.data?.isConnected) {
        setIsLCConnected(true);
        setLcUsername(res.data.leetcodeUsername || "Connected");
      } else {
        setIsLCConnected(false);
        setLcUsername(null);
      }
    } catch {}
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem("srmap_solved_problems");
      if (stored) setSolvedIds(JSON.parse(stored));
    } catch {}

    fetchLCStatus();
  }, []);

  const handleSelectProblem = (prob: CodingProblem) => {
    setSelectedProblem(prob);
    setCode(prob.starterCode[language] || prob.starterCode.python);
    setExecResult(null);
    setLcResult(null);
    setMentorFeedback(null);
    setShowSolutionCode(false);
    setActiveTestCaseIdx(0);
  };

  const handleLanguageChange = (lang: "python" | "cpp" | "java" | "javascript") => {
    setLanguage(lang);
    setCode(selectedProblem.starterCode[lang] || selectedProblem.starterCode.python);
    setExecResult(null);
    setLcResult(null);
  };

  const handleResetCode = () => {
    setCode(selectedProblem.starterCode[language] || selectedProblem.starterCode.python);
    toast({ title: "Code Reset to Unsolved Starter Template" });
  };

  // Connect LeetCode Account Modal Action
  const handleConnectLeetCodeAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lcSessionInput.trim()) {
      toast({ title: "Session Cookie Needed", variant: "destructive" });
      return;
    }

    try {
      setConnectingLC(true);
      const res = await API.post("/code/submit-leetcode", {
        action: "connect",
        sessionCookie: lcSessionInput.trim(),
      });

      if (res.data?.success) {
        setIsLCConnected(true);
        setLcUsername(res.data.leetcodeUsername || "Connected");
        setIsLCModalOpen(false);
        setLcSessionInput("");
        toast({
          title: "LeetCode Connected! 🎉",
          description: `Account linked as @${res.data.leetcodeUsername || "User"}. Automatic submissions enabled!`,
        });
      }
    } catch (err: any) {
      toast({
        title: "Connection Failed",
        description: err.response?.data?.message || "Invalid session cookie.",
        variant: "destructive",
      });
    } finally {
      setConnectingLC(false);
    }
  };

  const handleDisconnectLeetCode = async () => {
    try {
      await API.post("/code/submit-leetcode", { action: "disconnect" });
      setIsLCConnected(false);
      setLcUsername(null);
      toast({ title: "LeetCode Account Disconnected" });
    } catch {}
  };

  // Local In-Portal Runner
  const handleRunCode = async (isSubmit = false) => {
    try {
      setExecuting(true);
      setLcResult(null);
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

  // Direct Automatic Cloud Submission to Real LeetCode.com
  const handleDirectLeetCodeSubmit = async () => {
    if (!isLCConnected) {
      setIsLCModalOpen(true);
      return;
    }

    try {
      setSubmittingToLC(true);
      setExecResult(null);

      const res = await API.post("/code/submit-leetcode", {
        slug: selectedProblem.slug,
        questionId: selectedProblem.questionId,
        code,
        language,
      });

      if (res.data?.result) {
        const result: LeetCodeSubmissionResponse = res.data.result;
        setLcResult(result);

        if (result.statusDisplay === "Accepted") {
          toast({
            title: "Accepted on LeetCode.com! 🎉",
            description: `Runtime: ${result.statusRuntime} (Beats ${result.runtimePercentile || 85}%) • Memory: ${result.statusMemory}`,
          });

          if (!solvedIds.includes(selectedProblem.id)) {
            const updated = [...solvedIds, selectedProblem.id];
            setSolvedIds(updated);
            try {
              localStorage.setItem("srmap_solved_problems", JSON.stringify(updated));
            } catch {}
          }
        } else {
          toast({
            title: `LeetCode Verdict: ${result.statusDisplay} ❌`,
            description: result.message || `${result.totalCorrect || 0}/${result.totalTestcases || 0} testcases passed on LeetCode.`,
            variant: "destructive",
          });
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to submit to LeetCode.";
      toast({
        title: "LeetCode Submission Error",
        description: msg,
        variant: "destructive",
      });
      if (err.response?.status === 401 || msg.includes("connect") || msg.includes("cookie")) {
        setIsLCConnected(false);
        setIsLCModalOpen(true);
      }
    } finally {
      setSubmittingToLC(false);
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
        errorMessage: execResult?.errorMsg || lcResult?.compileError || lcResult?.runtimeError,
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
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                SRMAP Coding Arena
              </h1>
              {isLCConnected ? (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30 text-[10px] font-mono gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  LeetCode Sync: @{lcUsername}
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-[10px] font-mono">
                  Placement & LeetCode Mode
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Solve from scratch • Run local testcases • 1-Click automatic submit to LeetCode
            </p>
          </div>
        </div>

        {/* Problem Selector & Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          {/* LeetCode Connection Pill */}
          {isLCConnected ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDisconnectLeetCode}
              title="Click to disconnect LeetCode"
              className="h-8 px-2.5 text-xs text-emerald-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl gap-1"
            >
              <Check className="h-3 w-3" />
              @{lcUsername}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsLCModalOpen(true)}
              className="h-8 px-3 rounded-xl text-xs font-semibold border-amber-500/30 text-amber-300 hover:bg-amber-500/10 gap-1.5"
            >
              <Zap className="h-3.5 w-3.5 fill-amber-400" />
              Connect LeetCode
            </Button>
          )}

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

                {/* Reveal Solution Code Toggle */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Solution Code:</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowSolutionCode(!showSolutionCode)}
                      className="text-xs h-7 text-amber-400 hover:text-amber-300 gap-1.5"
                    >
                      {showSolutionCode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {showSolutionCode ? "Hide Solution" : "Reveal Solution Code"}
                    </Button>
                  </div>

                  {showSolutionCode ? (
                    <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 font-mono text-xs text-emerald-300 overflow-x-auto">
                      <pre>{selectedProblem.solutionCode?.[language === "javascript" ? "python" : language] || selectedProblem.solutionCode?.python}</pre>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-muted-foreground bg-white/[0.02] rounded-2xl border border-dashed border-white/10">
                      💡 Attempt solving the problem in the editor first! Reveal this solution when you are ready to review.
                    </div>
                  )}
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
                    Write your code in the editor and tap any button above to get real-time AI debugging, complexity analysis, or strategic hints!
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
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRunCode(false)}
                  disabled={executing || submittingToLC}
                  className="h-8 px-3.5 rounded-xl text-xs font-semibold border-white/15 gap-1.5 shadow-sm text-foreground"
                >
                  {executing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 text-amber-400" />}
                  Run Tests
                </Button>

                {/* Direct 1-Click Automatic LeetCode Cloud Submission Button */}
                <Button
                  size="sm"
                  onClick={handleDirectLeetCodeSubmit}
                  disabled={executing || submittingToLC}
                  className="h-8 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black shadow-md shadow-amber-500/20 gap-1.5 transition-all"
                >
                  {submittingToLC ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Evaluating on LeetCode...
                    </>
                  ) : (
                    <>
                      <Zap className="h-3.5 w-3.5 fill-black" />
                      Submit to LeetCode 🚀
                    </>
                  )}
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
                placeholder="// Write your solution here from scratch..."
                className="w-full bg-transparent border-0 resize-none font-mono text-xs text-emerald-300 focus-visible:ring-0 leading-relaxed p-0 selection:bg-emerald-500/30"
              />
            </div>
          </div>

          {/* Bottom Testcase & Execution Console */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            {/* Testcase Tabs */}
            <div className="flex items-center justify-between flex-wrap gap-2">
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

              {/* Real LeetCode Cloud Result Banner */}
              {lcResult && (
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className={`font-bold flex items-center gap-1 ${lcResult.statusDisplay === "Accepted" ? "text-emerald-400" : "text-rose-400"}`}>
                    {lcResult.statusDisplay === "Accepted" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    LeetCode: {lcResult.statusDisplay}
                  </span>
                  {lcResult.statusRuntime && (
                    <span className="text-amber-300 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {lcResult.statusRuntime}
                    </span>
                  )}
                  {lcResult.statusMemory && (
                    <span className="text-sky-300 flex items-center gap-1">
                      <HardDrive className="h-3 w-3" />
                      {lcResult.statusMemory}
                    </span>
                  )}
                </div>
              )}

              {/* Local Execution status indicator */}
              {!lcResult && execResult && (
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className={`font-bold flex items-center gap-1 ${execResult.status === "Accepted" ? "text-emerald-400" : "text-rose-400"}`}>
                    {execResult.status === "Accepted" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    {execResult.status}
                  </span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {execResult.runtimeMs}ms
                  </span>
                </div>
              )}
            </div>

            {/* Testcase Input / Output Display */}
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 font-mono text-xs space-y-2">
              {lcResult ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-amber-300 font-sans font-bold">Official LeetCode.com Cloud Result:</span>
                    {lcResult.runtimePercentile && (
                      <span className="text-[11px] text-emerald-400">
                        ⚡ Beats <strong>{lcResult.runtimePercentile}%</strong> of submissions
                      </span>
                    )}
                  </div>
                  {lcResult.compileError && (
                    <div className="text-rose-400 whitespace-pre-wrap">{lcResult.compileError}</div>
                  )}
                  {lcResult.runtimeError && (
                    <div className="text-rose-400 whitespace-pre-wrap">{lcResult.runtimeError}</div>
                  )}
                  {lcResult.statusDisplay === "Accepted" && (
                    <p className="text-muted-foreground text-[11px] font-sans">
                      🎉 Problem solved directly on your official LeetCode profile! Daily streak updated.
                    </p>
                  )}
                </div>
              ) : isCustomMode ? (
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

      {/* 🔐 Connect LeetCode Account Dialog */}
      <Dialog open={isLCModalOpen} onOpenChange={setIsLCModalOpen}>
        <DialogContent className="max-w-md w-[92vw] sm:w-full border-white/15 p-6 rounded-3xl backdrop-blur-2xl shadow-2xl space-y-4">
          <DialogHeader className="text-left pb-2 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <Zap className="h-5 w-5 fill-amber-400" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Connect LeetCode Account
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Enable 1-click automatic submissions directly to your LeetCode profile
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleConnectLeetCodeAccount} className="space-y-3 text-xs">
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5 text-[11px] text-muted-foreground leading-relaxed">
              <strong className="text-foreground block">30-Second Quick Setup:</strong>
              <p>1. Open <a href="https://leetcode.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline">leetcode.com</a> and log in.</p>
              <p>2. Press <strong>F12</strong> (Inspect) → <strong>Application</strong> → <strong>Cookies</strong> → <code className="text-amber-300">leetcode.com</code>.</p>
              <p>3. Copy the value of <strong className="text-foreground">LEETCODE_SESSION</strong>.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">LEETCODE_SESSION Cookie:</label>
              <Input
                type="password"
                placeholder="Paste LEETCODE_SESSION value here..."
                value={lcSessionInput}
                onChange={(e) => setLcSessionInput(e.target.value)}
                required
                className="h-9 text-xs bg-white/5 border-white/10 rounded-xl font-mono"
              />
            </div>

            <p className="text-[10px] text-muted-foreground">
              🔒 <strong>Encrypted Storage</strong>: Token is encrypted with AES-256 in MongoDB and used strictly to submit your code on demand.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setIsLCModalOpen(false)}
                className="h-9 text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={connectingLC || !lcSessionInput.trim()}
                className="h-9 px-4 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black shadow-md shadow-amber-500/20"
              >
                {connectingLC ? "Connecting..." : "Connect Account 🚀"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
