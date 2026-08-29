"use client";
import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  BookOpen,
  Calendar,
  Clock,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  RefreshCw,
  Copy,
  Layers,
  ChevronRight,
  HelpCircle,
  Flame,
  Award,
  BookCheck,
  ShieldCheck,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  FolderGit2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/utils/useToast";
import { useStudentData } from "@/context/StudentContext";
import API from "@/lib/api/axiosClient";
import { ClassroomCourse } from "@/server/classroom/classroomService";
import { SummaryResult } from "@/server/ai/notesSummarizerService";

export interface StudentAssignment {
  id: string;
  title: string;
  courseCode: string;
  courseName: string;
  dueDate: string;
  dueTime: string;
  dueFormatted: string;
  description?: string;
  type: "Assignment" | "Lab Task" | "Project" | "Quiz";
  status: "PENDING" | "COMPLETED";
}

export default function ClassroomPage() {
  const { toast } = useToast();
  const { subjects } = useStudentData();

  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [courses, setCourses] = useState<ClassroomCourse[]>([]);
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<"classrooms" | "assignments" | "ai_summarizer">("classrooms");

  // New Assignment Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCourseCode, setNewCourseCode] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newDueTime, setNewDueTime] = useState("23:59");
  const [newType, setNewType] = useState<"Assignment" | "Lab Task" | "Project" | "Quiz">("Assignment");
  const [newDescription, setNewDescription] = useState("");
  const [submittingTask, setSubmittingTask] = useState(false);

  // AI Summarizer State
  const [summarizerSubject, setSummarizerSubject] = useState("");
  const [summarizerExam, setSummarizerExam] = useState<"Mid-Sem" | "End-Sem" | "CLA">("End-Sem");
  const [summarizerContent, setSummarizerContent] = useState("");
  const [summarizing, setSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<SummaryResult | null>(null);

  const fetchClassroomData = async () => {
    try {
      setLoading(true);
      const [courseRes, assignRes] = await Promise.all([
        API.get("/classroom/courses"),
        API.get("/classroom/assignments").catch(() => ({ data: { assignments: [] } })),
      ]);

      if (courseRes.data) {
        setIsConnected(courseRes.data.isConnected);
        setUserEmail(courseRes.data.userEmail || "");
        setCourses(courseRes.data.courses || []);
        if (!newCourseCode && courseRes.data.courses?.length > 0) {
          setNewCourseCode(courseRes.data.courses[0].courseCode || "");
        }
      }

      if (assignRes.data?.assignments) {
        setAssignments(assignRes.data.assignments);
      }
    } catch {
      toast({ title: "Note", description: "Loaded current semester subjects." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassroomData();
  }, []);

  const handleConnectGoogle = async () => {
    try {
      const res = await API.get("/gmail/connect?returnTo=/classroom");
      if (res.data?.authUrl) {
        window.location.href = res.data.authUrl;
      }
    } catch {
      toast({ title: "Error", description: "Failed to initiate Google connection.", variant: "destructive" });
    }
  };

  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCourseCode) {
      toast({ title: "Required", description: "Please enter title and select a subject.", variant: "destructive" });
      return;
    }

    try {
      setSubmittingTask(true);
      const matched = courses.find((c) => c.courseCode === newCourseCode);
      const res = await API.post("/classroom/assignments", {
        title: newTitle,
        courseCode: newCourseCode,
        courseName: matched?.name || newCourseCode,
        dueDate: newDueDate || new Date().toISOString().split("T")[0],
        dueTime: newDueTime || "23:59",
        type: newType,
        description: newDescription,
      });

      if (res.data?.assignment) {
        setAssignments((prev) => [res.data.assignment, ...prev]);
        toast({ title: "Assignment Added! 🚀", description: `Added to ${newCourseCode}` });
        setIsAddModalOpen(false);
        setNewTitle("");
        setNewDescription("");
      }
    } catch {
      toast({ title: "Error", description: "Failed to add assignment", variant: "destructive" });
    } finally {
      setSubmittingTask(false);
    }
  };

  const handleToggleAssignmentStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";
    try {
      setAssignments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: newStatus as any } : a))
      );

      await API.patch("/classroom/assignments", { id, status: newStatus });
      toast({
        title: newStatus === "COMPLETED" ? "Marked Completed! 🎉" : "Marked Pending ⏳",
      });
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    try {
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      await API.delete(`/classroom/assignments?id=${id}`);
      toast({ title: "Assignment Deleted" });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const handleQuickSummarizeCourse = (course: ClassroomCourse) => {
    setSummarizerSubject(course.courseCode || course.name);
    setSummarizerContent(`Module Syllabus & Key Topics for ${course.name}:\n\n- Class Lectures & Important Formulas\n- Textbook Derivations & Algorithm Implementations\n- Previous Exam Question Patterns.`);
    setActiveTab("ai_summarizer");
  };

  const handleQuickSummarizeAssignment = (assign: StudentAssignment) => {
    setSummarizerSubject(assign.courseCode);
    setSummarizerContent(`Assignment Topic: ${assign.title}\nSubject: ${assign.courseName}\n\nTask Details:\n${assign.description || "Explain and provide step-by-step solution, theoretical proofs, and code implementation for this assignment."}`);
    setActiveTab("ai_summarizer");
  };

  const handleGenerateSummary = async () => {
    if (!summarizerContent.trim() || summarizerContent.trim().length < 15) {
      toast({
        title: "Content Needed",
        description: "Please paste your lecture slide text, assignment prompt, or module syllabus.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSummarizing(true);
      const res = await API.post("/ai/summarize-notes", {
        content: summarizerContent,
        subjectName: summarizerSubject || "Current Subject",
        targetExam: summarizerExam,
      });

      if (res.data?.result) {
        setSummaryResult(res.data.result);
        toast({ title: "AI Study Notes Ready! ✨" });
      }
    } catch {
      toast({ title: "AI Error", description: "Could not generate summary.", variant: "destructive" });
    } finally {
      setSummarizing(false);
    }
  };

  const pendingAssignments = assignments.filter((a) => a.status !== "COMPLETED");
  const completedAssignments = assignments.filter((a) => a.status === "COMPLETED");

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-10">
      {/* 🎓 Header Card */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-500/10 via-orange-500/5 to-transparent blur-3xl pointer-events-none" />

        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-xs font-mono">
              Academic Year 2025-26 • Current Semester
            </Badge>
            {isConnected ? (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30 text-xs gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Google Connected ({userEmail || "SRMAP Account"})
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-white/5 text-muted-foreground border-white/10 text-xs">
                Portal Academic Sync
              </Badge>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Academic Classroom & Study Hub
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Current semester registered subjects • Real assignment tracker • Gemini 2.5 AI slide summarizer & exam question predictor.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 relative z-10 flex-wrap">
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="rounded-2xl h-10 px-4 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black shadow-lg shadow-amber-500/20 gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add Assignment / Lab Task
          </Button>

          {!isConnected && (
            <Button
              variant="outline"
              onClick={handleConnectGoogle}
              className="rounded-2xl h-10 px-4 text-xs font-semibold border-white/15 hover:bg-white/10 gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Connect Google
            </Button>
          )}

          <a
            href="https://classroom.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="h-10 px-4 rounded-2xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-foreground flex items-center gap-1.5 transition-all"
          >
            Google Classroom
            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </a>
        </div>
      </div>

      {/* 📑 Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 max-w-md">
        <button
          onClick={() => setActiveTab("classrooms")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === "classrooms"
              ? "bg-amber-500 text-black shadow-md"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Subjects ({courses.length})
        </button>

        <button
          onClick={() => setActiveTab("assignments")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === "assignments"
              ? "bg-amber-500 text-black shadow-md"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookCheck className="h-4 w-4" />
          Assignments ({pendingAssignments.length})
        </button>

        <button
          onClick={() => setActiveTab("ai_summarizer")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === "ai_summarizer"
              ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md"
              : "text-purple-400 hover:text-purple-300"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          AI Exam Prep
        </button>
      </div>

      {/* 📚 TAB 1: Registered Semester Subjects */}
      {activeTab === "classrooms" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
              Enrolled Semester Courses
            </h2>
            <span className="text-xs text-muted-foreground font-mono">
              Strictly filtered to active semester
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-44 rounded-3xl glass-card border border-white/5 animate-pulse" />
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="glass-card rounded-3xl p-12 text-center border border-white/10 space-y-3">
              <GraduationCap className="h-10 w-10 text-muted-foreground mx-auto" />
              <h3 className="text-base font-bold text-foreground">No subjects found</h3>
              <p className="text-xs text-muted-foreground">Log into the student portal to refresh your semester courses.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="glass-card rounded-3xl p-5 border border-white/10 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4 group shadow-lg shadow-black/20"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[11px] font-mono">
                        {course.courseCode || course.name.split(" ")[0]}
                      </Badge>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                        Active Enrolled
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-foreground group-hover:text-amber-300 transition-colors line-clamp-2">
                      {course.name}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {course.section || "Academic Section"} • {course.room || "SRMAP Campus"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickSummarizeCourse(course)}
                      className="flex-1 h-8 rounded-xl text-xs font-semibold border-purple-500/30 text-purple-300 hover:bg-purple-500/10 gap-1.5"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                      AI Notes
                    </Button>

                    <a
                      href={course.alternateLink || "https://classroom.google.com"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 px-3 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground hover:text-foreground flex items-center gap-1 transition-all"
                    >
                      Open
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 📝 TAB 2: Assignments & Deadlines Tracker */}
      {activeTab === "assignments" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                Assignments & Lab Tasks Tracker
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Keep track of lab codes, theory assignments, and semester projects.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="rounded-xl h-8 px-3 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Task
            </Button>
          </div>

          {assignments.length === 0 ? (
            <div className="glass-card rounded-3xl p-12 text-center border border-white/10 space-y-4 max-w-md mx-auto">
              <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 w-fit mx-auto">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">No Assignments Tracked Yet</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Add your upcoming lab assignments, mini-projects, or theory homework to get deadline reminders and AI solutions!
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setIsAddModalOpen(true)}
                className="rounded-xl h-9 px-4 text-xs font-bold bg-amber-500 text-black shadow-md shadow-amber-500/20 gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Add Your First Assignment
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Pending Tasks */}
              {pendingAssignments.map((assign) => (
                <div
                  key={assign.id}
                  className="glass-card rounded-2xl p-4 border border-white/10 hover:border-amber-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggleAssignmentStatus(assign.id, assign.status)}
                      className="mt-0.5 text-muted-foreground hover:text-amber-400 transition-colors"
                    >
                      <Square className="h-5 w-5" />
                    </button>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-[10px] font-mono">
                          {assign.courseCode}
                        </Badge>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 font-semibold border border-rose-500/20">
                          {assign.type}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Due: {assign.dueFormatted}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-foreground">{assign.title}</h4>
                      {assign.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{assign.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickSummarizeAssignment(assign)}
                      className="h-8 rounded-xl text-xs font-semibold border-purple-500/30 text-purple-300 hover:bg-purple-500/10 gap-1.5"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                      Solve with AI
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteAssignment(assign.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Completed Tasks */}
              {completedAssignments.length > 0 && (
                <div className="pt-4 space-y-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Completed Submissions ({completedAssignments.length})
                  </h4>
                  {completedAssignments.map((assign) => (
                    <div
                      key={assign.id}
                      className="glass-card rounded-2xl p-3.5 border border-white/5 opacity-60 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleAssignmentStatus(assign.id, assign.status)}
                          className="text-emerald-400"
                        >
                          <CheckSquare className="h-5 w-5" />
                        </button>
                        <span className="text-xs font-medium line-through text-muted-foreground">
                          {assign.title} ({assign.courseCode})
                        </span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteAssignment(assign.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-rose-400"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ✨ TAB 3: AI Lecture Notes Summarizer & Exam Predictor */}
      {activeTab === "ai_summarizer" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Input Panel (5 Cols) */}
          <div className="lg:col-span-5 glass-card rounded-3xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
              <div className="p-2 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Gemini 2.5 Exam Engine</h3>
                <p className="text-xs text-muted-foreground">Turns raw lecture text into predicted 2M/10M exam questions</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Target Subject:</label>
                <select
                  value={summarizerSubject}
                  onChange={(e) => setSummarizerSubject(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-white/5 border border-white/10 rounded-xl text-foreground font-semibold focus:outline-none"
                >
                  <option value="" className="bg-slate-900 text-foreground">Select Subject...</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.courseCode || c.name} className="bg-slate-900 text-foreground">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Exam Scope:</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Mid-Sem", "End-Sem", "CLA"] as const).map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setSummarizerExam(ex)}
                      className={`py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        summarizerExam === ex
                          ? "bg-purple-500 text-white font-bold shadow-md shadow-purple-500/20"
                          : "bg-white/5 text-muted-foreground hover:bg-white/10"
                      }`}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Paste Slide Text, Notes, or Syllabus:</label>
                <Textarea
                  value={summarizerContent}
                  onChange={(e) => setSummarizerContent(e.target.value)}
                  rows={8}
                  placeholder="Paste PPT slide content, assignment description, professor lecture notes, or key textbook topics..."
                  className="text-xs bg-white/5 border-white/10 rounded-xl leading-relaxed"
                />
              </div>

              <Button
                onClick={handleGenerateSummary}
                disabled={summarizing}
                className="w-full h-10 rounded-2xl text-xs font-bold bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/20 gap-2"
              >
                {summarizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate 5-Min Summary & Exam Predictor ✨
              </Button>
            </div>
          </div>

          {/* AI Output Display (7 Cols) */}
          <div className="lg:col-span-7 glass-card rounded-3xl p-6 border border-white/10 space-y-5">
            {summaryResult ? (
              <div className="space-y-5 text-xs">
                {/* Title & Bullet Points */}
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-2">
                  <h4 className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4" />
                    {summaryResult.title || "Exam Concept Revision"}:
                  </h4>
                  <ul className="space-y-1.5 pl-4 list-disc text-foreground/90 leading-relaxed">
                    {(summaryResult.summaryBulletPoints || []).map((bp, i) => (
                      <li key={i}>{bp}</li>
                    ))}
                  </ul>
                </div>

                {/* Predicted 2-Mark Short Questions */}
                {summaryResult.predictedQuestions?.shortQuestions && summaryResult.predictedQuestions.shortQuestions.length > 0 && (
                  <div className="space-y-2.5 pt-2 border-t border-white/10">
                    <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-emerald-400" />
                      Predicted 2-Mark Conceptual Questions:
                    </h4>
                    <div className="space-y-2">
                      {summaryResult.predictedQuestions.shortQuestions.map((q, i) => (
                        <div key={i} className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-emerald-300">{q.question}</span>
                            <Badge className="text-[10px] bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                              {q.marks}M
                            </Badge>
                          </div>
                          <p className="text-muted-foreground leading-relaxed pt-0.5 font-mono text-[11px]">
                            <strong>Ans: </strong>{q.answer}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Predicted 10-Mark Long Questions */}
                {summaryResult.predictedQuestions?.longQuestions && summaryResult.predictedQuestions.longQuestions.length > 0 && (
                  <div className="space-y-2.5 pt-2 border-t border-white/10">
                    <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-amber-400" />
                      Predicted 10-Mark Core Questions:
                    </h4>
                    <div className="space-y-2.5">
                      {summaryResult.predictedQuestions.longQuestions.map((q, i) => (
                        <div key={i} className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-300">{q.question}</span>
                            <Badge className="text-[10px] bg-amber-500/15 text-amber-300 border-amber-500/30">
                              {q.marks}M
                            </Badge>
                          </div>
                          <p className="text-muted-foreground leading-relaxed pt-1">
                            <strong className="text-foreground">Model Answer: </strong>{q.modelAnswer}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-80 flex flex-col items-center justify-center text-center space-y-3 text-muted-foreground">
                <Sparkles className="h-10 w-10 text-purple-400 opacity-60" />
                <h4 className="text-sm font-bold text-foreground">AI Exam Predictor Ready</h4>
                <p className="text-xs max-w-sm">
                  Select your subject and paste lecture notes on the left to get instant predicted exam questions and model solutions!
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ➕ Add Assignment Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md w-[92vw] sm:w-full border-white/15 p-6 rounded-3xl backdrop-blur-2xl shadow-2xl space-y-4">
          <DialogHeader className="text-left pb-2 border-b border-white/10">
            <DialogTitle className="text-base font-bold text-foreground">
              Add Academic Assignment / Lab Task
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Set deadlines and track coursework for this semester
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddAssignment} className="space-y-3.5 text-xs">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Assignment Title:</label>
              <Input
                placeholder="e.g. Lab 4 - Binary Search Tree Implementation"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                className="h-9 text-xs bg-white/5 border-white/10 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Subject:</label>
                <select
                  value={newCourseCode}
                  onChange={(e) => setNewCourseCode(e.target.value)}
                  required
                  className="w-full h-9 px-3 text-xs bg-white/5 border border-white/10 rounded-xl text-foreground font-semibold focus:outline-none"
                >
                  <option value="" className="bg-slate-900 text-foreground">Select Subject...</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.courseCode || c.name} className="bg-slate-900 text-foreground">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Type:</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full h-9 px-3 text-xs bg-white/5 border border-white/10 rounded-xl text-foreground font-semibold focus:outline-none"
                >
                  <option value="Assignment" className="bg-slate-900 text-foreground">Assignment</option>
                  <option value="Lab Task" className="bg-slate-900 text-foreground">Lab Task</option>
                  <option value="Project" className="bg-slate-900 text-foreground">Project</option>
                  <option value="Quiz" className="bg-slate-900 text-foreground">Quiz</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Due Date:</label>
                <Input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="h-9 text-xs bg-white/5 border-white/10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Due Time:</label>
                <Input
                  type="time"
                  value={newDueTime}
                  onChange={(e) => setNewDueTime(e.target.value)}
                  className="h-9 text-xs bg-white/5 border-white/10 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Notes / Description (Optional):</label>
              <Textarea
                placeholder="Paste questions or lab submission instructions..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
                className="text-xs bg-white/5 border-white/10 rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setIsAddModalOpen(false)}
                className="h-9 text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingTask}
                className="h-9 px-4 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black shadow-md shadow-amber-500/20"
              >
                {submittingTask ? "Saving..." : "Add Assignment 🚀"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
