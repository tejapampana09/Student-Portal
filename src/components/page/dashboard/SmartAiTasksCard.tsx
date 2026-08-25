"use client";
import React, { useState, useEffect } from "react";
import { Sparkles, CheckCircle2, Circle, RefreshCw, Plus, Clock, Loader2, ChevronDown, ChevronUp, CheckSquare, Square, Split } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/utils/useToast";
import API from "@/lib/api/axiosClient";

export interface SmartTaskItem {
  id: string;
  title: string;
  category: "class" | "attendance" | "coursera" | "coding" | "custom";
  priority: "high" | "medium" | "low";
  timeBlock?: "Morning" | "Afternoon" | "Evening" | "Night";
  timeEstimate?: string;
  completed: boolean;
  context?: string;
  subtasks?: Array<{ id: string; title: string; completed: boolean }>;
}

export const SmartAiTasksCard: React.FC = () => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<SmartTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [activeBlock, setActiveBlock] = useState<string>("All");
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [splittingTaskId, setSplittingTaskId] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await API.get("/ai/smart-tasks");
      if (res.data?.tasks) {
        setTasks(res.data.tasks);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleToggle = async (task: SmartTaskItem) => {
    const updated = tasks.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t));
    setTasks(updated);
    try {
      await API.post("/ai/smart-tasks", { action: "toggle", task });
    } catch {
      fetchTasks();
    }
  };

  const handleToggleSubtask = async (task: SmartTaskItem, subId: string) => {
    const updatedSubtasks = (task.subtasks || []).map((st) =>
      st.id === subId ? { ...st, completed: !st.completed } : st
    );
    const allDone = updatedSubtasks.every((st) => st.completed);
    const updated = tasks.map((t) =>
      t.id === task.id ? { ...t, subtasks: updatedSubtasks, completed: allDone ? true : t.completed } : t
    );
    setTasks(updated);
    try {
      await API.post("/ai/smart-tasks", { action: "save_all", tasks: updated });
    } catch {}
  };

  const handleSplitSubtasks = async (task: SmartTaskItem) => {
    try {
      setSplittingTaskId(task.id);
      const res = await API.post("/ai/smart-tasks", {
        action: "split_subtasks",
        taskTitle: task.title,
      });

      if (res.data?.subtasks) {
        const updated = tasks.map((t) =>
          t.id === task.id ? { ...t, subtasks: res.data.subtasks } : t
        );
        setTasks(updated);
        setExpandedTaskId(task.id);
        toast({ title: "AI Micro-Steps Created! ✨", description: "3 actionable 15-min subtasks generated." });
        await API.post("/ai/smart-tasks", { action: "save_all", tasks: updated });
      }
    } catch {
      toast({ title: "Error", description: "Failed to generate micro-tasks", variant: "destructive" });
    } finally {
      setSplittingTaskId(null);
    }
  };

  const handleRegenerate = async () => {
    try {
      setRegenerating(true);
      const res = await API.post("/ai/smart-tasks", { action: "regenerate" });
      if (res.data?.tasks) {
        setTasks(res.data.tasks);
        toast({ title: "Day Planned! ✨", description: "AI synthesized timetable, attendance, POTD & Coursera." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to regenerate schedule.", variant: "destructive" });
    } finally {
      setRegenerating(false);
    }
  };

  const handleAddCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: SmartTaskItem = {
      id: "custom-" + Date.now(),
      title: newTaskTitle.trim(),
      category: "custom",
      priority: "medium",
      timeBlock: "Evening",
      completed: false,
    };

    const updated = [newTask, ...tasks];
    setTasks(updated);
    setNewTaskTitle("");
    try {
      await API.post("/ai/smart-tasks", { action: "save_all", tasks: updated });
    } catch {}
  };

  const filteredTasks = activeBlock === "All" ? tasks : tasks.filter((t) => t.timeBlock === activeBlock);
  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="glass-card rounded-3xl p-6 border border-white/10 shadow-lg relative overflow-hidden flex flex-col justify-between">
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/15 border border-primary/30 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                AI Smart Schedule & Priorities
              </h3>
              <p className="text-xs text-muted-foreground">
                {completedCount}/{tasks.length} tasks completed today
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            disabled={regenerating}
            onClick={handleRegenerate}
            className="h-8 px-2.5 rounded-full hover:bg-white/10 text-xs font-semibold gap-1 text-primary"
          >
            {regenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            AI Plan Day
          </Button>
        </div>

        {/* Timeblock Tabs */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {["All", "Morning", "Afternoon", "Evening", "Night"].map((block) => (
            <button
              key={block}
              onClick={() => setActiveBlock(block)}
              className={`text-xs px-3 py-1 rounded-full font-semibold transition-all shrink-0 ${
                activeBlock === block
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-white/5 hover:bg-white/10 text-muted-foreground border border-white/5"
              }`}
            >
              {block}
            </button>
          ))}
        </div>

        {/* Quick Add Form */}
        <form onSubmit={handleAddCustom} className="mt-3 flex items-center gap-2">
          <Input
            placeholder="+ Add custom academic task..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="h-9 rounded-2xl border-white/10 bg-white/5 text-xs"
          />
          <Button type="submit" size="sm" className="h-9 px-3 rounded-2xl text-xs font-semibold shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        </form>

        {/* Task List */}
        <div className="mt-4 space-y-2.5 max-h-80 overflow-y-auto pr-1">
          {loading ? (
            <div className="p-6 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">No tasks in this time block.</div>
          ) : (
            filteredTasks.map((task) => {
              const isExpanded = expandedTaskId === task.id;
              const hasSubtasks = task.subtasks && task.subtasks.length > 0;

              return (
                <div
                  key={task.id}
                  className={`p-3 rounded-2xl border transition-all space-y-2 ${
                    task.completed
                      ? "bg-white/[0.02] border-white/5 opacity-50"
                      : "bg-white/[0.04] border-white/10 hover:bg-white/[0.07]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggle(task)}
                      className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      {task.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-xs font-semibold leading-snug ${
                            task.completed ? "line-through text-muted-foreground" : "text-foreground"
                          }`}
                        >
                          {task.title}
                        </p>
                        {task.timeEstimate && (
                          <span className="text-[10px] font-mono text-muted-foreground shrink-0 flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {task.timeEstimate}
                          </span>
                        )}
                      </div>
                      {task.context && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{task.context}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!hasSubtasks && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={splittingTaskId === task.id}
                          onClick={() => handleSplitSubtasks(task)}
                          className="h-6 px-1.5 text-[10px] text-primary hover:bg-primary/10 rounded-lg gap-0.5"
                        >
                          {splittingTaskId === task.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Split className="h-2.5 w-2.5" />}
                          Split
                        </Button>
                      )}
                      {hasSubtasks && (
                        <button
                          onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                          className="p-1 text-muted-foreground hover:text-foreground"
                        >
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandable Subtasks */}
                  {isExpanded && hasSubtasks && (
                    <div className="pl-6 pt-1 border-t border-white/5 space-y-1.5">
                      {task.subtasks!.map((st) => (
                        <div
                          key={st.id}
                          onClick={() => handleToggleSubtask(task, st.id)}
                          className="flex items-center gap-2 text-xs cursor-pointer hover:text-primary transition-colors"
                        >
                          {st.completed ? (
                            <CheckSquare className="h-3 w-3 text-emerald-400 shrink-0" />
                          ) : (
                            <Square className="h-3 w-3 text-muted-foreground shrink-0" />
                          )}
                          <span className={`text-[11px] ${st.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {st.title}
                          </span>
                        </div>
                      ))}
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
