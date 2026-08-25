"use client";
import React, { useState } from "react";
import { BookOpen, Plus, Calendar, Trash2, Sparkles, Loader2, ChevronDown, ChevronUp, CheckSquare, Square, Link as LinkIcon, Zap, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/utils/useToast";
import API from "@/lib/api/axiosClient";

export interface CourseraCourse {
  id: string;
  title: string;
  platform?: string;
  totalModules: number;
  completedModules: number;
  deadline: string;
  url?: string;
  notes?: string;
  breakdown?: Array<{ moduleNum: number; tasks: string[] }>;
  completedTasks?: string[];
}

interface CourseraTrackerCardProps {
  courses: CourseraCourse[];
  onRefresh: () => void;
}

export const CourseraTrackerCard: React.FC<CourseraTrackerCardProps> = ({ courses, onRefresh }) => {
  const { toast } = useToast();
  const [quickUrl, setQuickUrl] = useState("");
  const [autoFetching, setAutoFetching] = useState(false);

  // Manual Dialog state
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("Coursera");
  const [totalModules, setTotalModules] = useState(4);
  const [completedModules, setCompletedModules] = useState(0);
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);

  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState<string | null>(null);

  // 1-Second Auto Fetch from URL
  const handleAutoFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUrl.trim()) {
      toast({ title: "Paste URL", description: "Please paste a Coursera course link.", variant: "destructive" });
      return;
    }

    try {
      setAutoFetching(true);
      const res = await API.post("/career/coursera/auto-import", {
        url: quickUrl.trim(),
      });

      if (res.data?.success) {
        toast({
          title: "Course & Tasks Auto-Imported! ⚡",
          description: `Auto-fetched: ${res.data.course.title} (${res.data.course.totalModules} Modules)`,
        });
        setQuickUrl("");
        onRefresh();
        if (res.data.course?.id) {
          setExpandedCourse(res.data.course.id);
        }
      }
    } catch (err: any) {
      toast({ title: "Import Error", description: err.message || "Failed to auto-fetch course", variant: "destructive" });
    } finally {
      setAutoFetching(false);
    }
  };

  const handleAddManualCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !deadline) {
      toast({ title: "Missing Details", description: "Please provide course title and deadline.", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      await API.post("/career/coursera", {
        action: "add",
        course: { title, platform, totalModules, completedModules, deadline },
      });
      toast({ title: "Course Added! 🎓", description: "Your certification progress is now tracked." });
      setOpen(false);
      setTitle("");
      setDeadline("");
      onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to add course", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleIncrement = async (course: CourseraCourse) => {
    if (course.completedModules >= course.totalModules) return;
    try {
      await API.post("/career/coursera", {
        action: "update",
        course: { ...course, completedModules: course.completedModules + 1 },
      });
      onRefresh();
    } catch {}
  };

  const handleDelete = async (courseId: string) => {
    try {
      await API.post("/career/coursera", {
        action: "delete",
        course: { id: courseId },
      });
      toast({ title: "Course Removed" });
      onRefresh();
    } catch {}
  };

  const handleGenerateBreakdown = async (course: CourseraCourse) => {
    try {
      setBreakdownLoading(course.id);
      const res = await API.post("/ai/coursera-breakdown", {
        title: course.title,
        totalModules: course.totalModules,
      });

      if (res.data?.breakdown) {
        await API.post("/career/coursera", {
          action: "update",
          course: { ...course, breakdown: res.data.breakdown },
        });
        toast({ title: "Tasks Generated! ✨", description: "AI generated micro-tasks for " + course.title });
        onRefresh();
      }
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to generate breakdown", variant: "destructive" });
    } finally {
      setBreakdownLoading(null);
    }
  };

  const handleToggleSubTask = async (course: CourseraCourse, taskStr: string) => {
    const currentCompleted = course.completedTasks || [];
    const isDone = currentCompleted.includes(taskStr);
    const updated = isDone
      ? currentCompleted.filter((t) => t !== taskStr)
      : [...currentCompleted, taskStr];

    try {
      await API.post("/career/coursera", {
        action: "update",
        course: { ...course, completedTasks: updated },
      });
      onRefresh();
    } catch {}
  };

  return (
    <div className="glass-card rounded-3xl p-6 border border-white/10 shadow-lg relative overflow-hidden flex flex-col justify-between">
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Coursera & Certification Hub</h3>
              <p className="text-xs text-muted-foreground">Paste URL to auto-fetch course & syllabus tasks in 1 second</p>
            </div>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 px-3 rounded-full text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground">
                <Plus className="h-3.5 w-3.5" />
                Manual Form
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md w-[92vw] sm:w-full border-white/15 p-6 rounded-3xl backdrop-blur-2xl shadow-2xl">
              <DialogHeader className="text-left pb-2 border-b border-white/10">
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Add Course Manually
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddManualCourse} className="space-y-4 pt-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Course Title</label>
                  <Input
                    placeholder="e.g. Deep Learning Specialization"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="rounded-xl border-white/10 bg-white/5"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Total Modules / Weeks</label>
                    <Input
                      type="number"
                      min={1}
                      value={totalModules}
                      onChange={(e) => setTotalModules(Number(e.target.value))}
                      className="rounded-xl border-white/10 bg-white/5"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Completed Modules</label>
                    <Input
                      type="number"
                      min={0}
                      value={completedModules}
                      onChange={(e) => setCompletedModules(Number(e.target.value))}
                      className="rounded-xl border-white/10 bg-white/5"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Submission Deadline</label>
                  <Input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="rounded-xl border-white/10 bg-white/5"
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full rounded-2xl mt-4 font-semibold">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Course
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* ⚡ 1-Second Auto Fetch URL Bar */}
        <form onSubmit={handleAutoFetch} className="mt-4 p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <LinkIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-sky-400" />
            <Input
              placeholder="Paste Coursera URL (e.g. https://www.coursera.org/learn/deep-neural-network)..."
              value={quickUrl}
              onChange={(e) => setQuickUrl(e.target.value)}
              className="pl-9 h-9 rounded-xl border-white/10 bg-black/30 text-xs text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={autoFetching}
            className="h-9 px-4 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white gap-1.5 shrink-0 shadow-md w-full sm:w-auto"
          >
            {autoFetching ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Auto-Fetching...
              </>
            ) : (
              <>
                <Zap className="h-3.5 w-3.5 fill-current" />
                1-Sec Auto Fetch
              </>
            )}
          </Button>
        </form>

        {/* Courses list */}
        <div className="mt-5 space-y-4">
          {courses.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center space-y-2">
              <p className="text-xs text-muted-foreground">No active Coursera courses tracked yet. Paste any Coursera link above!</p>
            </div>
          ) : (
            courses.map((course) => {
              const remaining = course.totalModules - course.completedModules;
              const percent = Math.round((course.completedModules / course.totalModules) * 100);
              const daysLeft = Math.ceil((new Date(course.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const isUrgent = daysLeft <= 3 && remaining > 0;
              const isExpanded = expandedCourse === course.id;

              return (
                <div
                  key={course.id}
                  className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-3 relative group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-foreground leading-snug">{course.title}</h4>
                        {course.url && (
                          <a
                            href={course.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-400 hover:text-sky-300"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="h-3 w-3" /> Due: {new Date(course.deadline).toLocaleDateString()}
                        </span>
                        <span>•</span>
                        <span className={`font-bold ${isUrgent ? "text-red-400 animate-pulse" : "text-sky-400"}`}>
                          {daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? "Due Today! 🚨" : "Overdue ⚠️"}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(course.id)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-semibold">
                        Modules: {course.completedModules} / {course.totalModules}
                      </span>
                      <span className="font-bold text-foreground font-mono">{percent}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Pacing */}
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px] text-muted-foreground">
                      {remaining > 0
                        ? `Pacing: Complete ~1 module every ${Math.max(1, Math.floor(Math.max(1, daysLeft) / remaining))} days`
                        : "Completed! 🎉"}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setExpandedCourse(isExpanded ? null : course.id)}
                        className="h-7 px-2 text-xs rounded-full text-muted-foreground hover:text-foreground gap-1"
                      >
                        Tasks {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </Button>

                      {remaining > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleIncrement(course)}
                          className="h-7 px-2.5 text-xs rounded-full border-sky-500/30 text-sky-400 hover:bg-sky-500/10 gap-1"
                        >
                          + 1 Module Done
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Expandable Module Tasks & AI Breakdown */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          Module Tasks & Assignments
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={breakdownLoading === course.id}
                          onClick={() => handleGenerateBreakdown(course)}
                          className="h-6 px-2 text-[10px] rounded-full border-white/10 text-primary gap-1"
                        >
                          {breakdownLoading === course.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Sparkles className="h-2.5 w-2.5" />}
                          AI Re-Generate Tasks
                        </Button>
                      </div>

                      {course.breakdown && course.breakdown.length > 0 ? (
                        <div className="space-y-2.5">
                          {course.breakdown.map((mod) => (
                            <div key={mod.moduleNum} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                              <p className="text-[11px] font-bold text-sky-400">Module {mod.moduleNum}</p>
                              <div className="space-y-1">
                                {mod.tasks.map((taskStr, tIdx) => {
                                  const isDone = (course.completedTasks || []).includes(taskStr);
                                  return (
                                    <div
                                      key={tIdx}
                                      onClick={() => handleToggleSubTask(course, taskStr)}
                                      className="flex items-center gap-2 text-xs cursor-pointer hover:text-primary transition-colors"
                                    >
                                      {isDone ? (
                                        <CheckSquare className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                      ) : (
                                        <Square className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                      )}
                                      <span className={`text-[11px] ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                        {taskStr}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 text-center text-xs text-muted-foreground bg-white/[0.02] rounded-xl border border-dashed border-white/5">
                          Tap <strong>"AI Re-Generate Tasks"</strong> to build a personalized task checklist for this course!
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
