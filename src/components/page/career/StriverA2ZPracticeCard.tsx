"use client";
import React, { useState, useEffect } from "react";
import { Code2, Sparkles, ExternalLink, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/utils/useToast";
import API from "@/lib/api/axiosClient";
import { StriverProblem } from "@/server/career/striverA2ZData";

export const StriverA2ZPracticeCard: React.FC = () => {
  const { toast } = useToast();
  const [problems, setProblems] = useState<StriverProblem[]>([]);
  const [solvedIds, setSolvedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "Easy" | "Medium" | "Hard">("all");

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
      if (res.data?.problems) {
        setProblems(res.data.problems);
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
      const res = await API.post("/career/dsa-practice", {
        action: "generate_variation",
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

  const filtered = activeTab === "all" ? problems : problems.filter((p) => p.difficulty === activeTab);
  const solvedCount = problems.filter((p) => solvedIds.includes(p.id)).length;
  const progressPercent = problems.length > 0 ? Math.round((solvedCount / problems.length) * 100) : 0;

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
                <h3 className="text-base font-bold text-foreground">Striver's A2Z: Hashing Mastery</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Concept 1
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Curated LeetCode problems, company tags & AI optimal intuition
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateVariation}
              className="h-8 px-3 rounded-full text-xs font-semibold border-amber-500/30 text-amber-300 hover:bg-amber-500/10 gap-1.5 shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              AI Interview Variation
            </Button>
          </div>
        </div>

        {/* Progress & Difficulty Filter */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {(["all", "Easy", "Medium", "Hard"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-xs px-3 py-1 rounded-full font-semibold transition-all ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-white/5 hover:bg-white/10 text-muted-foreground border border-white/5"
                }`}
              >
                {tab === "all" ? "All Problems" : tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
            <span>Progress: {solvedCount} / {problems.length} solved</span>
            <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="font-mono font-bold text-amber-400">{progressPercent}%</span>
          </div>
        </div>

        {/* Problems Grid / List */}
        <div className="mt-4 space-y-2.5 max-h-96 overflow-y-auto pr-1">
          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
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
                      Striver's Intuition
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
              Optimal Approach: {selectedProblem?.title}
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
                <p className="text-xs text-muted-foreground">Generating fresh Hashing interview problem...</p>
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
