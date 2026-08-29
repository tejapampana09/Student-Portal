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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/utils/useToast";
import { useStudentData } from "@/context/StudentContext";
import API from "@/lib/api/axiosClient";
import { ClassroomCourse, ClassroomAssignment } from "@/server/classroom/classroomService";
import { SummaryResult } from "@/server/ai/notesSummarizerService";

export default function ClassroomPage() {
  const { toast } = useToast();
  const { subjects } = useStudentData();

  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [courses, setCourses] = useState<ClassroomCourse[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<"classrooms" | "assignments" | "ai_summarizer">("classrooms");

  // AI Summarizer State
  const [summarizerSubject, setSummarizerSubject] = useState("");
  const [summarizerExam, setSummarizerExam] = useState<"Mid-Sem" | "End-Sem" | "CLA">("End-Sem");
  const [summarizerContent, setSummarizerContent] = useState("");
  const [summarizing, setSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<SummaryResult | null>(null);

  const fetchClassroomData = async () => {
    try {
      setLoading(true);
      const res = await API.get("/classroom/courses");
      if (res.data) {
        setIsConnected(res.data.isConnected);
        setUserEmail(res.data.userEmail || "");
        setCourses(res.data.courses || []);
        setAssignments(res.data.assignments || []);
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

  const handleQuickSummarizeCourse = (course: ClassroomCourse) => {
    setSummarizerSubject(course.courseCode || course.name);
    setSummarizerContent(`Module Syllabus & Lecture Notes for ${course.name}:\n\nKey Topics covered in class lectures, textbook derivations, and practice problem sets.`);
    setActiveTab("ai_summarizer");
  };

  const handleGenerateSummary = async () => {
    if (!summarizerContent.trim() || summarizerContent.trim().length < 15) {
      toast({
        title: "Content Needed",
        description: "Please paste your lecture slide text, notes, or module syllabus.",
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
        toast({
          title: "Exam Summary Ready! 🧠",
          description: "High-yield revision notes & predicted questions generated.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Summarization Error",
        description: err.response?.data?.message || err.message || "Failed to generate summary.",
        variant: "destructive",
      });
    } finally {
      setSummarizing(false);
    }
  };

  const handleCopySummary = () => {
    if (!summaryResult) return;
    const text = `# ${summaryResult.title} (${summarizerExam})\n\n## 5-Minute High-Yield Summary\n${summaryResult.summaryBulletPoints.map((b) => `• ${b}`).join("\n")}\n\n## Key Flashcards\n${summaryResult.flashcards.map((f) => `• **${f.term}**: ${f.definition}`).join("\n")}\n\n## Predicted 2-Mark Questions\n${summaryResult.predictedQuestions.shortQuestions.map((q, i) => `${i + 1}. ${q.question}\n   Ans: ${q.answer}`).join("\n\n")}\n\n## Predicted 10-Mark Questions\n${summaryResult.predictedQuestions.longQuestions.map((q, i) => `${i + 1}. ${q.question}\n   Model Answer: ${q.modelAnswer}`).join("\n\n")}`;
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to Clipboard! 📋" });
  };

  return (
    <div className="h-full flex flex-col gap-5 pb-8 max-w-7xl mx-auto w-full">
      {/* 🎓 Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-emerald-400">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Classroom & AI Notes Hub
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                This Semester Only
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Active semester subjects • Live assignment tracker • AI Lecture Summarizer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {isConnected ? (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs py-1 px-3 gap-1.5 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Sync: {userEmail}
            </Badge>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                API.get("/gmail/connect").then((res) => {
                  if (res.data?.authUrl) window.location.href = res.data.authUrl;
                });
              }}
              className="h-8 px-3 rounded-xl text-xs font-semibold border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Connect Google Classroom
            </Button>
          )}
        </div>
      </div>

      {/* 📊 Top Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card p-4 rounded-2xl border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-semibold">Semester Subjects</span>
            <p className="text-xl font-bold text-foreground mt-0.5">{courses.length}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
            <BookOpen className="h-5 w-5" />
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-semibold">Pending Tasks</span>
            <p className="text-xl font-bold text-emerald-400 mt-0.5">{assignments.length}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-semibold">Classroom Status</span>
            <p className="text-xs font-bold text-foreground mt-1">
              {isConnected ? "Connected ✅" : "Local Sync ⚡"}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-semibold">AI Exam Prep</span>
            <p className="text-xl font-bold text-purple-400 mt-0.5">Gemini 2.5</p>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 🧭 Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-white/10">
        {[
          { id: "classrooms", label: `Current Subjects (${courses.length})`, icon: BookOpen },
          { id: "assignments", label: `Assignments (${assignments.length})`, icon: Clock },
          { id: "ai_summarizer", label: "🧠 AI Lecture Summarizer", icon: Sparkles, highlight: true },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-2 ${
                active
                  ? "bg-emerald-500 text-black shadow-md font-bold"
                  : tab.highlight
                  ? "bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25"
                  : "bg-white/5 hover:bg-white/10 text-muted-foreground border border-white/5"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 📚 Tab 1: Current Semester Classrooms */}
      {activeTab === "classrooms" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing <strong>only current semester enrolled subjects</strong> ({courses.length} subjects).
            </p>
          </div>

          {loading ? (
            <div className="p-12 flex items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-emerald-400" />
            </div>
          ) : courses.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
              No current semester subjects found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="glass-card rounded-3xl p-5 border border-white/10 flex flex-col justify-between space-y-4 hover:border-emerald-500/30 transition-all shadow-lg"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {course.courseCode || "Current Sem"}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">{course.room || "Campus Section"}</span>
                    </div>

                    <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2">
                      {course.name}
                    </h3>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {course.section || "Active Semester Enrolled"}
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                      <span>Live Tasks:</span>
                      <span className="font-bold text-foreground">{course.assignments?.length || 0} Due</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickSummarizeCourse(course)}
                      className="flex-1 h-8 rounded-xl text-[11px] font-semibold border-purple-500/30 text-purple-300 hover:bg-purple-500/10 gap-1.5 shadow-sm"
                    >
                      <Sparkles className="h-3 w-3 text-purple-400" />
                      AI Summarize
                    </Button>
                    <a
                      href={course.alternateLink || "https://classroom.google.com"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 px-3 rounded-xl text-[11px] font-bold bg-white/10 hover:bg-white/15 text-foreground flex items-center gap-1 transition-all"
                    >
                      Open
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ⏳ Tab 2: Assignment Timeline */}
      {activeTab === "assignments" && (
        <div className="space-y-3">
          {assignments.length === 0 ? (
            <div className="glass-card p-8 rounded-3xl border border-white/10 text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">All Clear! No Pending Assignments Due 🎉</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                You have no active pending homework or assignments due across your current semester subjects.
              </p>
              {!isConnected && (
                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      API.get("/gmail/connect").then((res) => {
                        if (res.data?.authUrl) window.location.href = res.data.authUrl;
                      });
                    }}
                    className="text-xs h-8 px-4 rounded-xl border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                  >
                    Sync Live with Google Classroom
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {assignments.map((asg) => (
                <div
                  key={asg.id}
                  className="glass-card p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.04] transition-all"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0 mt-0.5">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-white/10 text-foreground">
                          {asg.courseCode || "Course"}
                        </span>
                        <h4 className="text-xs font-bold text-foreground">{asg.title}</h4>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{asg.description || "Course Assignment"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {asg.dueFormatted}
                    </span>
                    <a
                      href={asg.alternateLink || "https://classroom.google.com"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-7 px-3 rounded-full text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-black flex items-center gap-1 transition-all"
                    >
                      Submit
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 🧠 Tab 3: AI Lecture Slide & Notes Summarizer */}
      {activeTab === "ai_summarizer" && (
        <div className="space-y-6">
          <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  AI Lecture Slide & Exam Notes Summarizer
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Powered by Gemini 2.5 Flash • 5-Min Revision • Flashcards • 2-Mark & 10-Mark Predicted Exam Questions
                </p>
              </div>

              <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 self-end sm:self-auto">
                {(["End-Sem", "Mid-Sem", "CLA"] as const).map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setSummarizerExam(ex)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      summarizerExam === ex
                        ? "bg-purple-500 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Select Current Semester Subject:</label>
                <select
                  value={summarizerSubject}
                  onChange={(e) => setSummarizerSubject(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-white/5 border border-white/10 rounded-xl text-foreground focus:outline-none focus:border-purple-500/50"
                >
                  <option value="" className="bg-slate-900 text-foreground">Select Subject...</option>
                  {(subjects || []).map((s: any) => (
                    <option key={s.code} value={s.name || s.code} className="bg-slate-900 text-foreground">
                      {s.code} — {s.name || s.code}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Or Enter Custom Subject / Unit Name:</label>
                <Input
                  type="text"
                  placeholder="e.g. Unit 3: Dynamic Programming & Shortest Paths"
                  value={summarizerSubject}
                  onChange={(e) => setSummarizerSubject(e.target.value)}
                  className="h-9 text-xs bg-white/5 border-white/10 rounded-xl text-foreground"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Paste Lecture Slide Text, Syllabus Points, or Notes:
              </label>
              <Textarea
                placeholder="Paste PPT slide bullet points, derivations, textbook excerpts, or faculty notes here..."
                value={summarizerContent}
                onChange={(e) => setSummarizerContent(e.target.value)}
                rows={5}
                className="text-xs bg-white/5 border-white/10 rounded-2xl font-mono leading-relaxed"
              />
            </div>

            <div className="flex justify-end pt-1">
              <Button
                onClick={handleGenerateSummary}
                disabled={summarizing}
                className="h-10 px-5 rounded-2xl font-bold text-xs bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/25 flex items-center gap-2 transition-all"
              >
                {summarizing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-purple-200" />
                    Synthesizing SRM AP Exam Pack...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-purple-200" />
                    Generate 5-Min Exam Pack
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* 🌟 Generated Exam Pack Display */}
          {summaryResult && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <BookCheck className="h-5 w-5 text-emerald-400" />
                    {summaryResult.title}
                  </h3>
                  <span className="text-xs text-muted-foreground">Tailored for SRM AP {summarizerExam} Examination</span>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopySummary}
                  className="h-8 px-3 rounded-xl text-xs font-semibold border-white/15 gap-1.5 text-foreground"
                >
                  <Copy className="h-3.5 w-3.5 text-purple-400" />
                  Copy All
                </Button>
              </div>

              {/* 1. 5-Minute High-Yield Summary */}
              <div className="glass-card rounded-3xl p-5 border border-white/10 space-y-3">
                <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="h-4 w-4 text-amber-400" />
                  5-Minute High-Yield Summary
                </h4>
                <ul className="space-y-2 text-xs text-foreground/90 leading-relaxed">
                  {summaryResult.summaryBulletPoints.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-purple-400 font-bold">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 2. Flashcards */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-emerald-400" />
                  Key Definitions & Formulas Flashcards
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {summaryResult.flashcards.map((fc, idx) => (
                    <div key={idx} className="glass-card p-4 rounded-2xl border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-foreground">{fc.term}</h5>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">Concept #{idx + 1}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{fc.definition}</p>
                      <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
                        💡 <strong>Exam Tip:</strong> {fc.examTip}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Predicted 2-Mark & 10-Mark Questions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-card p-5 rounded-3xl border border-white/10 space-y-3">
                  <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                    📌 Predicted 2-Mark Questions (Short Answers)
                  </h4>
                  <div className="space-y-3">
                    {summaryResult.predictedQuestions.shortQuestions.map((sq, idx) => (
                      <div key={idx} className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between font-bold text-foreground">
                          <span>Q{idx + 1}: {sq.question}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 shrink-0">2M</span>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">{sq.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card p-5 rounded-3xl border border-white/10 space-y-3">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    📌 Predicted 10-Mark Questions (Detailed Steps)
                  </h4>
                  <div className="space-y-3">
                    {summaryResult.predictedQuestions.longQuestions.map((lq, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2 text-xs">
                        <div className="flex items-center justify-between font-bold text-foreground">
                          <span>Q{idx + 1}: {lq.question}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 shrink-0">10M</span>
                        </div>
                        <p className="text-muted-foreground whitespace-pre-line leading-relaxed">{lq.modelAnswer}</p>
                        {lq.keySteps && lq.keySteps.length > 0 && (
                          <div className="pt-1 border-t border-white/5">
                            <span className="text-[10px] font-bold text-indigo-300 block mb-1">Key Step Marks Breakdown:</span>
                            <ul className="text-[11px] text-muted-foreground space-y-0.5">
                              {lq.keySteps.map((step, sIdx) => (
                                <li key={sIdx}>• {step}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Common Exam Mistakes */}
              {summaryResult.commonMistakes && summaryResult.commonMistakes.length > 0 && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-200 text-xs space-y-2">
                  <h4 className="font-bold flex items-center gap-1.5 text-rose-300">
                    <AlertCircle className="h-4 w-4 text-rose-400" />
                    Common Student Traps / Mistakes in SRM AP Exams:
                  </h4>
                  <ul className="space-y-1 text-[11px] text-rose-200/90 pl-4 list-disc">
                    {summaryResult.commonMistakes.map((m, idx) => (
                      <li key={idx}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
