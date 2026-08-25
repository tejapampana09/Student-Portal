"use client";
import React, { useState, useEffect } from "react";
import { Sparkles, CheckCircle2, Circle, RefreshCw, Plus, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/utils/useToast";
import API from "@/lib/api/axiosClient";

export interface SmartTaskItem {
  id: string;
  title: string;
  category: "class" | "attendance" | "coursera" | "coding" | "custom";
  priority: "high" | "medium" | "low";
  timeEstimate?: string;
  completed: boolean;
  context?: string;
}

export const SmartAiTasksCard: React.FC = () => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<SmartTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

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

  const handleRegenerate = async () => {
    try {
      setRegenerating(true);
      const res = await API.post("/ai/smart-tasks", { action: "regenerate" });
      if (res.data?.tasks) {
        setTasks(res.data.tasks);
        toast({ title: "Day Planned! ✨", description: "AI has synthesized your academic priorities." });
      }
    } catch {
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
      completed: false,
    };

    const updated = [newTask, ...tasks];
    setTasks(updated);
    setNewTaskTitle("");
    try {
      await API.post("/ai/smart-tasks", { action: "save_all", tasks: updated });
    } catch {}
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="glass-card rounded-3xl p-6 border border-white/10 shadow-lg relative overflow-hidden flex flex-col justify-between">
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/15 border border-primary/30 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                AI Smart Tasks & Priorities
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

        {/* Quick Add Form */}
        <form onSubmit={handleAddCustom} className="mt-4 flex items-center gap-2">
          <Input
            placeholder="+ Add personal task..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="h-9 rounded-2xl border-white/10 bg-white/5 text-xs"
          />
          <Button type="submit" size="sm" className="h-9 px-3 rounded-2xl text-xs font-semibold shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        </form>

        {/* Task List */}
        <div className="mt-4 space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {loading ? (
            <div className="p-6 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">No tasks scheduled for today.</div>
          ) : (
            tasks.map((task) => {
              return (
                <div
                  key={task.id}
                  onClick={() => handleToggle(task)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    task.completed
                      ? "bg-white/[0.02] border-white/5 opacity-50"
                      : "bg-white/[0.04] border-white/10 hover:bg-white/[0.07]"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {task.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    )}
                  </div>

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
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
