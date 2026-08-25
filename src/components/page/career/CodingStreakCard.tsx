"use client";
import React, { useState } from "react";
import { Flame, Code2, Github, Trophy, ExternalLink, Settings2, Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/utils/useToast";
import API from "@/lib/api/axiosClient";

interface CodingStreakCardProps {
  handles: { leetcode?: string; github?: string; codeforces?: string };
  stats: any;
  onRefresh: () => void;
}

export const CodingStreakCard: React.FC<CodingStreakCardProps> = ({ handles, stats, onRefresh }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [leetcodeInput, setLeetcodeInput] = useState(handles.leetcode || "");
  const [githubInput, setGithubInput] = useState(handles.github || "");
  const [codeforcesInput, setCodeforcesInput] = useState(handles.codeforces || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await API.post("/career/coding-stats", {
        leetcode: leetcodeInput,
        github: githubInput,
        codeforces: codeforcesInput,
      });
      toast({ title: "Profiles Updated! 🚀", description: "Your coding handles have been saved." });
      setOpen(false);
      onRefresh();
    } catch (err: any) {
      toast({ title: "Save Error", description: err.message || "Failed to save handles", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const lc = stats?.leetcode;
  const gh = stats?.github;
  const cf = stats?.codeforces;

  return (
    <div className="glass-card rounded-3xl p-6 border border-white/10 shadow-lg relative overflow-hidden flex flex-col justify-between">
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500">
              <Flame className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                Coding Streak & Profiles
              </h3>
              <p className="text-xs text-muted-foreground">LeetCode, GitHub & Codeforces</p>
            </div>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-white/10">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md w-[92vw] sm:w-full border-white/15 p-6 rounded-3xl backdrop-blur-2xl shadow-2xl">
              <DialogHeader className="text-left pb-2 border-b border-white/10">
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Connect Coding Profiles
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4 pt-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">LeetCode Username</label>
                  <Input
                    placeholder="e.g. tejapampana"
                    value={leetcodeInput}
                    onChange={(e) => setLeetcodeInput(e.target.value)}
                    className="rounded-xl border-white/10 bg-white/5"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">GitHub Username</label>
                  <Input
                    placeholder="e.g. tejapampana09"
                    value={githubInput}
                    onChange={(e) => setGithubInput(e.target.value)}
                    className="rounded-xl border-white/10 bg-white/5"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Codeforces Handle</label>
                  <Input
                    placeholder="e.g. tourist"
                    value={codeforcesInput}
                    onChange={(e) => setCodeforcesInput(e.target.value)}
                    className="rounded-xl border-white/10 bg-white/5"
                  />
                </div>
                <Button type="submit" disabled={saving} className="w-full rounded-2xl mt-4 font-semibold">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Profiles
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* LeetCode Section */}
        <div className="mt-5 space-y-4">
          {lc ? (
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">LeetCode</span>
                  <a
                    href={`https://leetcode.com/${lc.username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-0.5"
                  >
                    @{lc.username} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs font-bold">
                  <Flame className="h-3.5 w-3.5" />
                  {lc.streak || 0} Day Streak
                </div>
              </div>

              {/* Solved numbers */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-[10px] text-muted-foreground font-semibold">Total</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">{lc.totalSolved}</p>
                </div>
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <p className="text-[10px] font-semibold">Easy</p>
                  <p className="text-sm font-bold mt-0.5">{lc.easySolved}</p>
                </div>
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <p className="text-[10px] font-semibold">Med</p>
                  <p className="text-sm font-bold mt-0.5">{lc.mediumSolved}</p>
                </div>
                <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                  <p className="text-[10px] font-semibold">Hard</p>
                  <p className="text-sm font-bold mt-0.5">{lc.hardSolved}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center">
              <p className="text-xs text-muted-foreground">No LeetCode profile connected.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(true)}
                className="mt-2 h-7 text-xs rounded-full border-white/10"
              >
                Connect Handle
              </Button>
            </div>
          )}

          {/* GitHub & Codeforces stats */}
          <div className="grid grid-cols-2 gap-3">
            {gh ? (
              <a
                href={gh.profileUrl}
                target="_blank"
                rel="noreferrer"
                className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Github className="h-4 w-4 text-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">GitHub</p>
                    <p className="text-[10px] text-muted-foreground truncate">{gh.publicRepos} Repos</p>
                  </div>
                </div>
                <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-foreground shrink-0" />
              </a>
            ) : null}

            {cf ? (
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Trophy className="h-4 w-4 text-sky-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">Codeforces</p>
                    <p className="text-[10px] text-sky-400 font-mono font-semibold truncate">{cf.rating} ({cf.rank})</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
