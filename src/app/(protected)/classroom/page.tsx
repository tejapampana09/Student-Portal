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
  Layers,
  ChevronRight,
  ShieldCheck,
  Zap,
  Unlink,
  Check,
  Bell,
  Megaphone,
  BookCheck,
  FileCode,
  FolderOpen,
  Download,
  Award,
  BookMarked,
  Lightbulb,
  Copy,
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
      }
    } catch {
      toast({ title: "Error", description: "Failed to initiate Google connection.", variant: "destructive" });
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
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-10">
      {/* 🎓 Top Header Card */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-500/10 via-orange-500/5 to-transparent blur-3xl pointer-events-none" />

        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-xs font-mono">
              Current Semester Filtered 🎯
            </Badge>
            {isConnected ? (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30 text-xs gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Connected: {userEmail || "Google Account"}
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-white/5 text-muted-foreground border-white/10 text-xs">
                Not Connected
              </Badge>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Google Classroom & AI Study Hub
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Live classes • Coursework & Lab deadlines • PDF slides & Drive materials • Gemini 2.5 1-Click AI exam question predictor.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 relative z-10 flex-wrap">
          {isConnected ? (
            <>
              <Button
                onClick={() => fetchClassroomData(true)}
                disabled={syncing || loading}
                className="rounded-2xl h-10 px-4 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black shadow-lg shadow-amber-500/20 gap-1.5"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing..." : "Sync Classroom 🔄"}
              </Button>

              <Button
                variant="outline"
                onClick={handleDisconnectGoogle}
                disabled={disconnecting}
                className="rounded-2xl h-10 px-3 text-xs font-semibold border-rose-500/30 text-rose-300 hover:bg-rose-500/10 gap-1.5"
              >
                <Unlink className="h-3.5 w-3.5" />
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              onClick={handleConnectGoogle}
              className="rounded-2xl h-10 px-5 text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black shadow-lg shadow-amber-500/20 gap-2"
            >
              <Zap className="h-4 w-4 fill-black" />
              Connect Google Classroom 🚀
            </Button>
          )}

          <a
            href="https://classroom.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="h-10 px-4 rounded-2xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-foreground flex items-center gap-1.5 transition-all"
          >
            Open Web ↗
          </a>
        </div>
      </div>

      {/* ⚠️ If Not Connected */}
      {!isConnected && !loading && (
        <div className="glass-card rounded-3xl p-8 border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-black/20 to-transparent text-center space-y-4 max-w-xl mx-auto">
          <div className="p-4 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-400 w-fit mx-auto">
            <GraduationCap className="h-10 w-10" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Sync Your Google Classroom</h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-md mx-auto">
              Connect your student Google account to view active classes, coursework deadlines, uploaded PDF materials, and get 1-Click AI exam question predictions!
            </p>
          </div>
          <Button
            onClick={handleConnectGoogle}
            className="h-11 px-6 rounded-2xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black shadow-lg shadow-amber-500/20 gap-2"
          >
            <Zap className="h-4 w-4 fill-black" />
            Connect Google Classroom Now
          </Button>
        </div>
      )}

      {/* Connected Workspace */}
      {isConnected && (
        <>
          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 max-w-xl flex-wrap">
            <button
              onClick={() => setActiveTab("classes")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-w-[100px] ${
                activeTab === "classes"
                  ? "bg-amber-500 text-black shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Classes ({courses.length})
            </button>

            <button
              onClick={() => setActiveTab("assignments")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-w-[100px] ${
                activeTab === "assignments"
                  ? "bg-amber-500 text-black shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookCheck className="h-4 w-4" />
              Assignments ({assignments.length})
            </button>

            <button
              onClick={() => setActiveTab("materials")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-w-[120px] ${
                activeTab === "materials"
                  ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md font-bold"
                  : "text-purple-400 hover:text-purple-300"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              PDFs & Slides ({materials.length})
            </button>

            <button
              onClick={() => setActiveTab("announcements")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-w-[90px] ${
                activeTab === "announcements"
                  ? "bg-amber-500 text-black shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Megaphone className="h-4 w-4" />
              Notices ({announcements.length})
            </button>
          </div>

          {/* 📚 TAB 1: Classes */}
          {activeTab === "classes" && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                Active Enrolled Classes ({courses.length})
              </h2>

              {courses.length === 0 ? (
                <div className="glass-card rounded-3xl p-12 text-center border border-white/10 space-y-3">
                  <BookOpen className="h-10 w-10 text-muted-foreground mx-auto" />
                  <h3 className="text-base font-bold text-foreground">No active semester Google Classroom courses</h3>
                  <p className="text-xs text-muted-foreground">Make sure you are enrolled in classes on classroom.google.com.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {courses.map((course) => (
                    <div
                      key={course.id}
                      className="glass-card rounded-3xl p-5 border border-white/10 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4 group shadow-lg shadow-black/20"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[11px] font-mono">
                            {course.section || "Active Class"}
                          </Badge>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                            {course.materials.length} Materials
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-foreground group-hover:text-amber-300 transition-colors line-clamp-2">
                          {course.name}
                        </h3>
                        {course.descriptionHeading && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{course.descriptionHeading}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                        <span className="text-muted-foreground text-[11px]">
                          {course.room || "SRMAP"}
                        </span>
                        {course.alternateLink && (
                          <a
                            href={course.alternateLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-8 px-3 rounded-xl font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-foreground flex items-center gap-1 transition-all"
                          >
                            Open Class
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

          {/* 📝 TAB 2: Assignments */}
          {activeTab === "assignments" && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                Coursework & Deadlines ({assignments.length})
              </h2>

              {assignments.length === 0 ? (
                <div className="glass-card rounded-3xl p-12 text-center border border-white/10 space-y-4 max-w-md mx-auto">
                  <div className="p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 w-fit mx-auto">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Zero Pending Coursework!</h3>
                    <p className="text-xs text-muted-foreground mt-1">All tasks are turned in or none assigned.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {assignments.map((assign) => (
                    <div
                      key={assign.id}
                      className="glass-card rounded-2xl p-4 border border-white/10 hover:border-amber-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-[10px] font-mono">
                            {assign.courseName}
                          </Badge>
                          {assign.submissionState === "TURNED_IN" || assign.submissionState === "RETURNED" ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              {assign.submissionState === "RETURNED" ? `Graded ${assign.assignedGrade !== undefined ? `(${assign.assignedGrade} pts)` : "✅"}` : "Turned In ✅"}
                            </span>
                          ) : assign.isOverdue ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 font-bold border border-rose-500/30">
                              Missing / Overdue ⚠️
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30">
                              Assigned ⏳
                            </span>
                          )}
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

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {assign.attachments && assign.attachments.length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenAISummarizer(assign.attachments![0])}
                            className="h-8 rounded-xl text-xs font-semibold border-purple-500/30 text-purple-300 hover:bg-purple-500/10 gap-1.5"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                            AI Solver
                          </Button>
                        )}
                        {assign.alternateLink && (
                          <a
                            href={assign.alternateLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-8 px-4 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
                          >
                            Turn In ↗
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 📂 TAB 3: PDFs & Course Materials (With 1-Click AI Summarizer) */}
          {activeTab === "materials" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                  Classroom PDFs, Lecture Slides & Drive Files ({materials.length})
                </h2>
                <Badge variant="outline" className="bg-purple-500/15 text-purple-300 border-purple-500/30 text-[11px] gap-1 font-mono">
                  <Sparkles className="h-3.5 w-3.5" />
                  Gemini 2.5 Exam Predictor Ready
                </Badge>
              </div>

              {materials.length === 0 ? (
                <div className="glass-card rounded-3xl p-12 text-center border border-white/10 space-y-3">
                  <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto" />
                  <h3 className="text-base font-bold text-foreground">No course materials or PDFs found</h3>
                  <p className="text-xs text-muted-foreground">Uploaded PPTs, Drive attachments, and PDF manuals will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {materials.map((mat) => (
                    <div
                      key={mat.id}
                      className="glass-card rounded-3xl p-5 border border-white/10 hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-4 group shadow-lg shadow-black/20"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/30 text-[10px] font-mono">
                            {mat.type}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(mat.uploadedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                          </span>
                        </div>

                        <div>
                          <span className="text-[11px] text-amber-300 font-semibold block">{mat.courseName}</span>
                          <h4 className="text-sm font-bold text-foreground group-hover:text-purple-300 transition-colors line-clamp-2 mt-0.5">
                            {mat.title}
                          </h4>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                        <Button
                          size="sm"
                          onClick={() => handleOpenAISummarizer(mat)}
                          className="flex-1 h-8 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white gap-1.5 shadow-md shadow-purple-500/20"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          AI Summary ✨
                        </Button>

                        <a
                          href={mat.alternateLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-8 px-3 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-foreground flex items-center gap-1 transition-all"
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

          {/* 📢 TAB 4: Announcements */}
          {activeTab === "announcements" && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                Classroom Announcements ({announcements.length})
              </h2>

              {announcements.length === 0 ? (
                <div className="glass-card rounded-3xl p-12 text-center border border-white/10 space-y-3">
                  <Megaphone className="h-10 w-10 text-muted-foreground mx-auto" />
                  <h3 className="text-base font-bold text-foreground">No recent announcements</h3>
                </div>
              ) : (
                <div className="space-y-3">
                  {announcements.map((ann) => (
                    <div key={ann.id} className="glass-card rounded-2xl p-4 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px] font-mono">
                          {ann.courseName}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(ann.creationTime).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line">{ann.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ✨ Gemini AI PDF & Material Summary Modal */}
      <Dialog open={isAIModalOpen} onOpenChange={setIsAIModalOpen}>
        <DialogContent className="max-w-2xl w-[94vw] sm:w-full border-white/15 p-6 rounded-3xl backdrop-blur-2xl shadow-2xl max-h-[85vh] overflow-y-auto space-y-5">
          <DialogHeader className="text-left pb-3 border-b border-white/10">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">
                    Gemini 2.5 Exam Predictor & Notes
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {selectedMaterial?.title} • {selectedMaterial?.courseName}
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {(["End-Sem", "Mid-Sem", "CLA"] as const).map((scope) => (
                  <button
                    key={scope}
                    onClick={() => {
                      setExamScope(scope);
                      if (selectedMaterial) generateAISummary(selectedMaterial, scope);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all ${
                      examScope === scope
                        ? "bg-purple-500 text-white font-bold"
                        : "bg-white/5 text-muted-foreground hover:bg-white/10"
                    }`}
                  >
                    {scope}
                  </button>
                ))}
              </div>
            </div>
          </DialogHeader>

          {summarizing ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="h-10 w-10 text-purple-400 animate-spin" />
              <h4 className="text-sm font-bold text-foreground">Analyzing Classroom Material with Gemini 2.5...</h4>
              <p className="text-xs text-muted-foreground max-w-sm">
                Synthesizing key formulas, extracting core concepts, and predicting 2M & 10M examination questions.
              </p>
            </div>
          ) : aiResult ? (
            <div className="space-y-5 text-xs">
              {/* Core Concepts */}
              <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-2">
                <h4 className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" />
                  5-Minute Revision Takeaways:
                </h4>
                <ul className="space-y-1.5 pl-4 list-disc text-foreground/90 leading-relaxed">
                  {(aiResult.keyTakeaways || []).map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>

              {/* Predicted 2-Mark Questions */}
              {aiResult.predictedShortQuestions && aiResult.predictedShortQuestions.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-emerald-400" />
                    Predicted 2-Mark Short Questions:
                  </h4>
                  <div className="space-y-2">
                    {aiResult.predictedShortQuestions.map((q, i) => (
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

              {/* Predicted 10-Mark Questions */}
              {aiResult.predictedLongQuestions && aiResult.predictedLongQuestions.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-amber-400" />
                    Predicted 10-Mark Core Analytical Questions:
                  </h4>
                  <div className="space-y-2.5">
                    {aiResult.predictedLongQuestions.map((q, i) => (
                      <div key={i} className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-300">{q.question}</span>
                          <Badge className="text-[10px] bg-amber-500/15 text-amber-300 border-amber-500/30">
                            {q.marks}M
                          </Badge>
                        </div>
                        <p className="text-muted-foreground leading-relaxed pt-1 whitespace-pre-line">
                          <strong className="text-foreground">Model Answer: </strong>{q.modelAnswer}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Direct PDF Link */}
              {selectedMaterial?.alternateLink && (
                <div className="pt-2 flex justify-between items-center border-t border-white/10">
                  <span className="text-[11px] text-muted-foreground">Original Document on Google Drive</span>
                  <a
                    href={selectedMaterial.alternateLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 px-3 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-foreground inline-flex items-center gap-1"
                  >
                    Open Original PDF ↗
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
