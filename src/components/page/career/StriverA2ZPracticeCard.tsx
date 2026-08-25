"use client";
import React, { useState, useEffect } from "react";
import { Code2, Sparkles, ExternalLink, CheckCircle2, Circle, Loader2, Trophy, Flame, CheckCheck, BookCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/utils/useToast";
import API from "@/lib/api/axiosClient";
import { StriverProblem } from "@/server/career/striverA2ZData";

export const StriverA2ZPracticeCard: React.FC = () => {
  const { toast } = useToast();
  const [problems, setProblems] = useState<StriverProblem[]>([]);
  const [steps, setSteps] = useState<Array<{ stepNum: number; name: string }>>([]);
  const [potd, setPotd] = useState<StriverProblem | null>(null);
  const [solvedIds, setSolvedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Default to Step 2 (Arrays) since user completed Step 1 (Basics & Hashing)
  const [selectedStep, setSelectedStep] = useState<number>(2);
  const [diffFilter, setDiffFilter] = useState<"all" | "Easy" | "Medium" | "Hard">("all");

  // AI Explanation modal state
  const [explainOpen, setExplainOpen] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<StriverProblem | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);

  // AI Variation state
  const [variationOpen, setVariationOpen] = useState(false);
  const [variation, setVariation] = useState<any>(null);
  const [variationLoading, setVariationLoading] = useState(false);

  const fetchProblems = async () => {
    try {
      setLoading(true);
      const res = await API.get("/career/dsa-practice");
      if (res.data) {
        setProblems(res.data.problems || []);
        setSteps(res.data.steps || []);
        setPotd(res.data.potd || null);
        setSolvedIds(res.data.solvedIds || []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblems();
  }, []);

  const handleToggleSolved = async (problemId: string) => {
    const updated = solvedIds.includes(problemId)
      ? solvedIds.filter((id) => id !== problemId)
      : [...solvedIds, problemId];
    setSolvedIds(updated);

    try {
      await API.post("/career/dsa-practice", {
        action: "toggle_solved",
        problemId,
      });
      if (!solvedIds.includes(problemId)) {
        toast({ title: "Problem Solved! 🎉", description: "Keep up the momentum in Striver's A2Z Sheet." });
      }
    } catch {
      fetchProblems();
    }
  };

  const handleMarkStep1Completed = async () => {
    try {
      const res = await API.post("/career/dsa-practice", {
        action: "mark_step_completed",
        stepNum: 1,
      });
      if (res.data?.solvedIds) {
        setSolvedIds(res.data.solvedIds);
        toast({ title: "Step 1 Mastered! 🏆", description: "All Hashing & Basic concepts marked completed." });
        setSelectedStep(2);
      }
    } catch {
      toast({ title: "Error", description: "Failed to mark step completed.", variant: "destructive" });
    }
  };

  const handleExplain = async (problem: StriverProblem) => {
    setSelectedProblem(problem);
    setExplainOpen(true);
    setExplanation(null);
    try {
      setExplainLoading(true);
      const res = await API.post("/career/dsa-practice", {
        action: "ai_explain",
        problemId: problem.id,
        problemTitle: problem.title,
      });
      if (res.data?.explanation) {
        setExplanation(res.data.explanation);
      }
    } catch {
      toast({ title: "Error", description: "Failed to load explanation.", variant: "destructive" });
    } finally {
      setExplainLoading(false);
    }
  };

  const handleGenerateVariation = async () => {
    setVariationOpen(true);
    setVariation(null);
    try {
      setVariationLoading(true);
      const currentStepObj = steps.find((s) => s.stepNum === selectedStep);
      const res = await API.post("/career/dsa-practice", {
        action: "generate_variation",
        topic: currentStepObj ? currentStepObj.name : "DSA",
      });
      if (res.data?.variation) {
        setVariation(res.data.variation);
      }
    } catch {
      toast({ title: "Error", description: "Failed to generate variation.", variant: "destructive" });
    } finally {
      setVariationLoading(false);
    }
  };

  // Filtered problem list
  const filtered = problems.filter((p) => {
    const matchesStep = selectedStep === 0 || p.stepNum === selectedStep;
    const matchesDiff = diffFilter === "all" || p.difficulty === diffFilter;
    return matchesStep && matchesDiff;
  });

  const solvedCount = problems.filter((p) => solvedIds.includes(p.id)).length;
  const progressPercent = problems.length > 0 ? Math.round((solvedCount / problems.length) * 100) : 0;
  const isPotdSolved = potd ? solvedIds.includes(potd.id) : false;

  const step1Problems = problems.filter((p) => p.stepNum === 1);
  const step1SolvedCount = step1Problems.filter((p) => solvedIds.includes(p.id)).length;
  const isStep1FullySolved = step1Problems.length > 0 && step1SolvedCount === step1Problems.length;

  return (
    <div className="glass-card rounded-3xl p-6 border border-white/10 shadow-lg relative overflow-hidden flex flex-col justify-between">
      <div className="absolute -top-12 -right-12 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Code2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">Striver's A2Z DSA Mastery Hub</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Step {selectedStep > 0 ? selectedStep : "All"}/12
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Complete A2Z Sheet • Daily Problem of the Day (POTD) • AI Intuition
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isStep1FullySolved && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkStep1Completed}
                className="h-8 px-3 rounded-full text-xs font-semibold border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 gap-1.5 shadow-sm"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark Step 1 (Hashing) Done
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateVariation}
              className="h-8 px-3 rounded-full text-xs font-semibold border-amber-500/30 text-amber-300 hover:bg-amber-500/10 gap-1.5 shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              AI Problem Variation
            </Button>
          </div>
        </div>

        {/* 🌟 Daily Problem of the Day (POTD) Hero Banner */}
        {potd && (
          <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative overflow-hidden">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                <Flame className="h-5 w-5 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                    Today's Active Goal: Next Striver POTD
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {potd.difficulty}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {potd.step.split(":")[0]}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-foreground mt-0.5 flex items-center gap-1.5">
                  {potd.title}
                  {isPotdSolved && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                  💡 {potd.keyIdea}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleExplain(potd)}
                className="h-7 px-2.5 text-xs rounded-full text-amber-300 hover:bg-amber-500/15 gap-1"
              >
                <Sparkles className="h-3 w-3 text-amber-400" />
                Approach
              </Button>
              <a
                href={potd.leetcodeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-7 px-3 text-xs rounded-full font-bold bg-amber-500 hover:bg-amber-600 text-black flex items-center gap-1 transition-all shadow-md"
              >
                Solve POTD
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}

        {/* Step Selector & Progress Bar */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span className="flex items-center gap-1.5 text-foreground">
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              A2Z Sheet Progress: {solvedCount} / {problems.length} Solved
            </span>
            <span className="font-mono font-bold text-amber-400">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Horizontal Step Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
            <button
              onClick={() => setSelectedStep(0)}
              className={`text-xs px-3 py-1.5 rounded-xl font-semibold shrink-0 transition-all ${
                selectedStep === 0
                  ? "bg-amber-500 text-black shadow-md font-bold"
                  : "bg-white/5 hover:bg-white/10 text-muted-foreground border border-white/5"
              }`}
            >
              All Steps ({problems.length})
            </button>
            {steps.map((s) => {
              const stepCount = problems.filter((p) => p.stepNum === s.stepNum).length;
              const stepSolved = problems.filter((p) => p.stepNum === s.stepNum && solvedIds.includes(p.id)).length;
              const isStepDone = stepCount > 0 && stepSolved === stepCount;

              return (
                <button
                  key={s.stepNum}
                  onClick={() => setSelectedStep(s.stepNum)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                    selectedStep === s.stepNum
                      ? "bg-amber-500 text-black shadow-md font-bold"
                      : isStepDone
                      ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
                      : "bg-white/5 hover:bg-white/10 text-muted-foreground border border-white/5"
                  }`}
                >
                  {isStepDone && <CheckCircle2 className="h-3 w-3" />}
                  {s.name} ({stepSolved}/{stepCount})
                </button>
              );
            })}
          </div>

          {/* Difficulty Filter */}
          <div className="flex items-center gap-2 pt-1">
            {(["all", "Easy", "Medium", "Hard"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setDiffFilter(tab)}
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold transition-all ${
                  diffFilter === tab
                    ? "bg-white/20 text-foreground border border-white/20"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "all" ? "All Levels" : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Problems List */}
        <div className="mt-4 space-y-2.5 max-h-96 overflow-y-auto pr-1">
          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground bg-white/[0.02] rounded-2xl border border-dashed border-white/5">
              No problems found for the selected filter.
            </div>
          ) : (
            filtered.map((problem) => {
              const isSolved = solvedIds.includes(problem.id);
              const diffColor =
                problem.difficulty === "Easy"
                  ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                  : problem.difficulty === "Medium"
                  ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
                  : "text-red-400 border-red-500/30 bg-red-500/10";

              return (
                <div
                  key={problem.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSolved
                      ? "bg-white/[0.02] border-white/5 opacity-70"
                      : "bg-white/[0.04] border-white/10 hover:bg-white/[0.07]"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => handleToggleSolved(problem.id)}
                      className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isSolved ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/5 text-muted-foreground">
                          {problem.step.split(":")[0]}
                        </span>
                        <a
                          href={problem.leetcodeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-xs font-bold hover:underline flex items-center gap-1 leading-snug ${
                            isSolved ? "line-through text-muted-foreground" : "text-foreground"
                          }`}
                        >
                          {problem.title}
                          <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                        </a>
                        <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${diffColor}`}>
                          {problem.difficulty}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {problem.optimalComplexity.time}
                        </span>
                      </div>

                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                        💡 {problem.keyIdea}
                      </p>

                      {/* Company tags */}
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {problem.companies.slice(0, 3).map((comp, idx) => (
                          <span
                            key={idx}
                            className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-white/5 border border-white/5 text-muted-foreground"
                          >
                            {comp}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleExplain(problem)}
                      className="h-7 px-2.5 rounded-full text-xs font-semibold text-amber-300 hover:bg-amber-500/10 gap-1"
                    >
                      <Sparkles className="h-3 w-3 text-amber-400" />
                      Approach
                    </Button>
                    <a
                      href={problem.leetcodeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-7 px-3 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/15 text-foreground flex items-center gap-1 transition-all"
                    >
                      Solve on LC
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* AI Explanation Dialog */}
      <Dialog open={explainOpen} onOpenChange={setExplainOpen}>
        <DialogContent className="max-w-2xl w-[92vw] sm:w-full border-white/15 p-6 rounded-3xl backdrop-blur-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="text-left pb-3 border-b border-white/10">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              Striver's Optimal Approach: {selectedProblem?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="pt-3">
            {explainLoading ? (
              <div className="p-8 flex flex-col items-center justify-center gap-2 text-center">
                <Loader2 className="h-7 w-7 animate-spin text-amber-400" />
                <p className="text-xs text-muted-foreground">Synthesizing Striver's optimal solution & code...</p>
              </div>
            ) : (
              <div className="prose prose-invert prose-sm max-w-none text-xs leading-relaxed space-y-3 whitespace-pre-line text-foreground/90 font-sans">
                {explanation}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Variation Dialog */}
      <Dialog open={variationOpen} onOpenChange={setVariationOpen}>
        <DialogContent className="max-w-xl w-[92vw] sm:w-full border-white/15 p-6 rounded-3xl backdrop-blur-2xl shadow-2xl">
          <DialogHeader className="text-left pb-3 border-b border-white/10">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-amber-300">
              <Sparkles className="h-4 w-4 text-amber-400" />
              AI Company Interview Variation
            </DialogTitle>
          </DialogHeader>

          <div className="pt-3">
            {variationLoading ? (
              <div className="p-8 flex flex-col items-center justify-center gap-2 text-center">
                <Loader2 className="h-7 w-7 animate-spin text-amber-400" />
                <p className="text-xs text-muted-foreground">Generating fresh interview problem...</p>
              </div>
            ) : variation ? (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-foreground">{variation.title}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {variation.difficulty}
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground">{variation.company}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2">
                  <p className="text-foreground leading-relaxed">{variation.problemStatement}</p>
                  <div className="font-mono text-[11px] bg-black/40 p-2.5 rounded-lg space-y-1 text-muted-foreground">
                    <p className="text-amber-300">Sample Input: {variation.sampleInput}</p>
                    <p className="text-emerald-400">{variation.sampleOutput}</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
                  <span className="font-bold block mb-1">💡 Optimal Striver Hint:</span>
                  <p className="text-[11px] leading-snug">{variation.optimalHint}</p>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
