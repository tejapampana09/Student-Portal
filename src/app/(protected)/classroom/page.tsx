"use client";

import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  BookOpen,
  Clock,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Zap,
  Unlink,
  Check,
  Megaphone,
  BookCheck,
  FolderOpen,
  Award,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/utils/useToast";
import { useSearchParams } from "next/navigation";
import API from "@/lib/api/axiosClient";
import {
  ClassroomCourseItem,
  ClassroomAssignment,
  ClassroomAnnouncement,
  ClassroomMaterialAttachment,
} from "@/server/classroom/classroomService";

interface AISummaryResult {
  title: string;
  keyTakeaways: string[];
  predictedShortQuestions: Array<{ question: string; marks: number; answer: string }>;
  predictedLongQuestions: Array<{ question: string; marks: number; modelAnswer: string }>;
  cheatSheetFormulas: string[];
}

export default function ClassroomPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [courses, setCourses] = useState<ClassroomCourseItem[]>([]);
  const [assignments, setAssignments] = useState<ClassroomAssignment[]>([]);
  const [announcements, setAnnouncements] = useState<ClassroomAnnouncement[]>([]);
  const [materials, setMaterials] = useState<ClassroomMaterialAttachment[]>([]);

  const [activeTab, setActiveTab] = useState<"classes" | "assignments" | "materials" | "announcements">("classes");

  // AI Summarizer Modal State
  const [selectedMaterial, setSelectedMaterial] = useState<ClassroomMaterialAttachment | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [aiResult, setAiResult] = useState<AISummaryResult | null>(null);
  const [examScope, setExamScope] = useState<"End-Sem" | "Mid-Sem" | "CLA">("End-Sem");

  const fetchClassroomData = async (isManualSync = false) => {
    try {
      if (isManualSync) setSyncing(true);
      else setLoading(true);

      const res = await API.get(isManualSync ? "/classroom?refresh=true" : "/classroom");
      if (res.data) {
        setIsConnected(!!res.data.isConnected);
        setUserEmail(res.data.userEmail || "");
        setCourses(res.data.courses || []);
        setAssignments(res.data.allAssignments || []);
        setAnnouncements(res.data.allAnnouncements || []);
        setMaterials(res.data.allMaterials || []);

        if (isManualSync) {
          toast({
            title: "Classroom Synced! 🔄",
            description: `Fetched ${res.data.courses?.length || 0} classes & ${res.data.allMaterials?.length || 0} study materials/PDFs.`,
          });
        }
      }
    } catch {
      toast({ title: "Note", description: "Connect Google Classroom to sync your live classes." });
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchClassroomData();
    if (searchParams.get("google") === "connected" || searchParams.get("gmail") === "connected") {
      toast({
        title: "Google Classroom Connected! 🎓",
        description: "Your official classes, PDF slides, and assignments are now synced.",
      });
    }
  }, [searchParams]);

  const handleConnectGoogle = async () => {
    try {
      const res = await API.get("/google/connect?returnTo=/classroom");
      if (res.data?.authUrl) {
        window.location.href = res.data.authUrl;
      } else {
        toast({
          title: "Classroom Sync Not Configured",
          description: res.data?.message || "Google OAuth credentials are not configured on this server.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Connection Notice",
        description: err.response?.data?.message || err.message || "Failed to initiate Google connection.",
        variant: "destructive",
      });
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      setDisconnecting(true);
      await API.post("/google/disconnect");
      setIsConnected(false);
      setUserEmail("");
      setCourses([]);
      setAssignments([]);
      setAnnouncements([]);
      setMaterials([]);
      toast({ title: "Google Classroom Disconnected" });
    } catch {
      toast({ title: "Failed to disconnect", variant: "destructive" });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleOpenAISummarizer = async (material: ClassroomMaterialAttachment) => {
    setSelectedMaterial(material);
    setIsAIModalOpen(true);
    setAiResult(null);
    generateAISummary(material, examScope);
  };

  const generateAISummary = async (material: ClassroomMaterialAttachment, targetExam: string) => {
    try {
      setSummarizing(true);
      const res = await API.post("/classroom/ai-summarize", {
        materialTitle: material.title,
        courseName: material.courseName,
        description: material.description || `Study material and lecture slides for ${material.title}`,
        fileUrl: material.alternateLink,
        targetExam,
      });

      if (res.data?.result) {
        setAiResult(res.data.result);
        toast({ title: "AI Study Notes Ready! ✨" });
      }
    } catch (err: any) {
      toast({ title: "AI Generation Error", description: "Could not generate summary.", variant: "destructive" });
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-28">
      {/* 🎓 Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Google Classroom
            </h1>
            {isConnected ? (
              <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                <span>Connected</span>
              </span>
            ) : (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                Not Connected
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {isConnected ? userEmail : "Live classes, assignments, lecture slides & Gemini exam question predictor"}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {isConnected ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => fetchClassroomData(true)}
                disabled={syncing || loading}
                className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 border border-border/70"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                <span>{syncing ? "Syncing..." : "Sync"}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnectGoogle}
                disabled={disconnecting}
                className="h-8 px-2.5 rounded-xl text-xs font-medium text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 gap-1"
              >
                <Unlink className="h-3.5 w-3.5" />
                <span>Disconnect</span>
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={handleConnectGoogle}
              className="h-8 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm gap-1.5"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Connect Classroom</span>
            </Button>
          )}

          <a
            href="https://classroom.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 px-3 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground border border-border/70 inline-flex items-center gap-1 transition-colors"
          >
            <span>Open Web</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* ⚠️ If Not Connected */}
      {!isConnected && !loading && (
        <div className="py-12 px-6 rounded-2xl border border-border/60 bg-muted/20 text-center flex flex-col items-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">Sync Google Classroom</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Link your university Google account to view active course materials, deadlines, and get AI exam question predictions.
          </p>
          <Button
            size="sm"
            onClick={handleConnectGoogle}
            className="mt-4 h-9 px-5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm gap-1.5"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Connect Now</span>
          </Button>
        </div>
      )}

      {/* Connected Workspace */}
      {isConnected && (
        <div className="flex flex-col gap-4">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/50 border border-border/60 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab("classes")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "classes"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Classes ({courses.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("assignments")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "assignments"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookCheck className="h-3.5 w-3.5" />
              <span>Assignments ({assignments.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("materials")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "materials"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-500" />
              <span>PDFs & Slides ({materials.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("announcements")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "announcements"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Megaphone className="h-3.5 w-3.5" />
              <span>Notices ({announcements.length})</span>
            </button>
          </div>

          {/* 📚 TAB 1: Classes */}
          {activeTab === "classes" && (
            <div className="flex flex-col gap-2">
              {courses.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  No active courses found on classroom.google.com.
                </div>
              ) : (
                <div className="divide-y divide-border/40 rounded-2xl border border-border/60 bg-card overflow-hidden">
                  {courses.map((course) => (
                    <div
                      key={course.id}
                      className="flex items-center justify-between gap-3 p-4 hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                            {course.section || "Class"}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {course.materials.length} Materials
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-foreground truncate">
                          {course.name}
                        </h3>
                        {course.descriptionHeading && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {course.descriptionHeading}
                          </p>
                        )}
                      </div>

                      {course.alternateLink && (
                        <a
                          href={course.alternateLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-8 px-3 rounded-xl text-xs font-semibold bg-muted/60 hover:bg-muted text-foreground flex items-center gap-1 transition-colors shrink-0"
                        >
                          <span>Open</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 📝 TAB 2: Assignments */}
          {activeTab === "assignments" && (
            <div className="flex flex-col gap-2">
              {assignments.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  Zero pending coursework! All tasks are completed.
                </div>
              ) : (
                <div className="divide-y divide-border/40 rounded-2xl border border-border/60 bg-card overflow-hidden">
                  {assignments.map((assign) => (
                    <div
                      key={assign.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                            {assign.courseName}
                          </span>
                          {assign.submissionState === "TURNED_IN" || assign.submissionState === "RETURNED" ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                              Turned In ✅
                            </span>
                          ) : assign.isOverdue ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400">
                              Overdue ⚠️
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                              Due: {assign.dueFormatted}
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-semibold text-foreground">{assign.title}</h4>
                        {assign.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {assign.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        {assign.attachments && assign.attachments.length > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenAISummarizer(assign.attachments![0])}
                            className="h-8 px-2.5 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 gap-1 border border-blue-500/20"
                          >
                            <Sparkles className="h-3 w-3" />
                            <span>AI Solver</span>
                          </Button>
                        )}
                        {assign.alternateLink && (
                          <a
                            href={assign.alternateLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-8 px-3 rounded-xl text-xs font-semibold bg-muted/60 hover:bg-muted text-foreground flex items-center gap-1 transition-colors"
                          >
                            <span>Turn In</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 📂 TAB 3: PDFs & Course Materials */}
          {activeTab === "materials" && (
            <div className="flex flex-col gap-2">
              {materials.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  No lecture slides or PDF materials found.
                </div>
              ) : (
                <div className="divide-y divide-border/40 rounded-2xl border border-border/60 bg-card overflow-hidden">
                  {materials.map((mat) => (
                    <div
                      key={mat.id}
                      className="flex items-center justify-between gap-3 p-4 hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                            {mat.type}
                          </span>
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold truncate">
                            {mat.courseName}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-foreground truncate mt-0.5">
                          {mat.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleOpenAISummarizer(mat)}
                          className="h-8 px-3 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white gap-1 shadow-sm"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>AI Summary</span>
                        </Button>

                        <a
                          href={mat.alternateLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-8 px-2.5 rounded-xl text-xs font-semibold bg-muted/60 hover:bg-muted text-foreground flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 📢 TAB 4: Announcements */}
          {activeTab === "announcements" && (
            <div className="flex flex-col gap-2">
              {announcements.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  No recent notices posted.
                </div>
              ) : (
                <div className="divide-y divide-border/40 rounded-2xl border border-border/60 bg-card overflow-hidden">
                  {announcements.map((ann) => (
                    <div key={ann.id} className="p-4 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                          {ann.courseName}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {new Date(ann.creationTime).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line">
                        {ann.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ✨ Gemini AI PDF & Material Summary Modal */}
      <Dialog open={isAIModalOpen} onOpenChange={setIsAIModalOpen}>
        <DialogContent className="max-w-2xl w-[94vw] sm:w-full border-border/60 p-6 rounded-3xl shadow-2xl max-h-[85vh] overflow-y-auto space-y-4">
          <DialogHeader className="text-left pb-2 border-b border-border/40">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-500" />
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">
                    Gemini AI Exam Notes & Summary
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {selectedMaterial?.title}
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {(["End-Sem", "Mid-Sem", "CLA"] as const).map((scope) => (
                  <button
                    key={scope}
                    onClick={() => {
                      setExamScope(scope);
                      if (selectedMaterial) generateAISummary(selectedMaterial, scope);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      examScope === scope
                        ? "bg-blue-600 text-white font-bold"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {scope}
                  </button>
                ))}
              </div>
            </div>
          </DialogHeader>

          {summarizing ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
              <h4 className="text-sm font-semibold text-foreground">Analyzing Slides & PDFs...</h4>
              <p className="text-xs text-muted-foreground max-w-sm">
                Extracting core formulas, key concepts, and exam questions.
              </p>
            </div>
          ) : aiResult ? (
            <div className="space-y-4 text-xs">
              {/* Core Concepts */}
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-2">
                <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" />
                  Key Revision Takeaways
                </h4>
                <ul className="space-y-1.5 pl-4 list-disc text-foreground/90 leading-relaxed">
                  {(aiResult.keyTakeaways || []).map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>

              {/* Predicted Questions */}
              {aiResult.predictedShortQuestions && aiResult.predictedShortQuestions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px]">
                    Predicted Short Questions
                  </h4>
                  <div className="space-y-2">
                    {aiResult.predictedShortQuestions.map((q, i) => (
                      <div key={i} className="p-3 rounded-xl bg-muted/40 border border-border/40 space-y-1">
                        <div className="flex items-center justify-between font-semibold">
                          <span>{q.question}</span>
                          <span className="text-[10px] text-blue-600 font-mono">{q.marks}M</span>
                        </div>
                        <p className="text-muted-foreground text-[11px]">
                          <strong>Ans: </strong>{q.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Direct PDF Link */}
              {selectedMaterial?.alternateLink && (
                <div className="pt-2 flex justify-between items-center border-t border-border/40">
                  <span className="text-[11px] text-muted-foreground">Original Document on Google Drive</span>
                  <a
                    href={selectedMaterial.alternateLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 px-3 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground inline-flex items-center gap-1"
                  >
                    Open PDF ↗
                  </a>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}