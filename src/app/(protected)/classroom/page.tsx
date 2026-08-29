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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/utils/useToast";
import { useSearchParams } from "next/navigation";
import API from "@/lib/api/axiosClient";
import { ClassroomCourseItem, ClassroomAssignment, ClassroomAnnouncement } from "@/server/classroom/classroomService";

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

  const [activeTab, setActiveTab] = useState<"classes" | "assignments" | "announcements">("classes");

  const fetchClassroomData = async (isManualSync = false) => {
    try {
      if (isManualSync) setSyncing(true);
      else setLoading(true);

      const res = await API.get("/classroom");
      if (res.data) {
        setIsConnected(!!res.data.isConnected);
        setUserEmail(res.data.userEmail || "");
        setCourses(res.data.courses || []);
        setAssignments(res.data.allAssignments || []);
        setAnnouncements(res.data.allAnnouncements || []);

        if (isManualSync) {
          toast({
            title: "Classroom Synced! 🔄",
            description: `Fetched ${res.data.courses?.length || 0} active classes & ${res.data.allAssignments?.length || 0} assignments.`,
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
    if (searchParams.get("google") === "connected") {
      toast({
        title: "Google Classroom Connected! 🎓",
        description: "Your official classes and assignments are now synced.",
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
      toast({ title: "Google Classroom Disconnected" });
    } catch {
      toast({ title: "Failed to disconnect", variant: "destructive" });
    } finally {
      setDisconnecting(false);
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
              Google Classroom API v1
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
            Google Classroom Hub
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Live classes • Coursework & Lab deadlines • Submission status tracking • Announcements & Notes.
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

      {/* ⚠️ If Not Connected: Connect Promo Banner */}
      {!isConnected && !loading && (
        <div className="glass-card rounded-3xl p-8 border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-black/20 to-transparent text-center space-y-4 max-w-xl mx-auto">
          <div className="p-4 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-400 w-fit mx-auto">
            <GraduationCap className="h-10 w-10" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Sync Your Google Classroom</h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-md mx-auto">
              Connect your SRM student account (or Google account) to automatically view active classes, coursework deadlines, lab tasks, and faculty announcements in one place!
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
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 max-w-md">
            <button
              onClick={() => setActiveTab("classes")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
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
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "assignments"
                  ? "bg-amber-500 text-black shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookCheck className="h-4 w-4" />
              Assignments ({assignments.length})
            </button>

            <button
              onClick={() => setActiveTab("announcements")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "announcements"
                  ? "bg-amber-500 text-black shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Megaphone className="h-4 w-4" />
              Notices ({announcements.length})
            </button>
          </div>

          {/* 📚 TAB 1: Enrolled Classes */}
          {activeTab === "classes" && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                Active Enrolled Classes ({courses.length})
              </h2>

              {courses.length === 0 ? (
                <div className="glass-card rounded-3xl p-12 text-center border border-white/10 space-y-3">
                  <BookOpen className="h-10 w-10 text-muted-foreground mx-auto" />
                  <h3 className="text-base font-bold text-foreground">No active Google Classroom courses</h3>
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
                            {course.assignments.length} Tasks
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

          {/* 📝 TAB 2: Coursework & Due Assignments */}
          {activeTab === "assignments" && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                Coursework, Labs & Deadlines ({assignments.length})
              </h2>

              {assignments.length === 0 ? (
                <div className="glass-card rounded-3xl p-12 text-center border border-white/10 space-y-4 max-w-md mx-auto">
                  <div className="p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 w-fit mx-auto">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Zero Pending Coursework!</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      You have turned in all coursework or no tasks have been assigned yet.
                    </p>
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
                          {assign.submissionState === "TURNED_IN" ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              Turned In
                            </span>
                          ) : assign.isOverdue ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 font-bold border border-rose-500/30">
                              Overdue
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30">
                              Assigned
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Due: {assign.dueFormatted}
                          </span>
                          {assign.maxPoints && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ({assign.maxPoints} pts)
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-foreground">{assign.title}</h4>
                        {assign.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{assign.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {assign.alternateLink && (
                          <a
                            href={assign.alternateLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-8 px-4 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
                          >
                            Submit in Classroom
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

          {/* 📢 TAB 3: Announcements */}
          {activeTab === "announcements" && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                Classroom Announcements & Materials ({announcements.length})
              </h2>

              {announcements.length === 0 ? (
                <div className="glass-card rounded-3xl p-12 text-center border border-white/10 space-y-3">
                  <Megaphone className="h-10 w-10 text-muted-foreground mx-auto" />
                  <h3 className="text-base font-bold text-foreground">No recent announcements</h3>
                  <p className="text-xs text-muted-foreground">Classroom notices will appear here once posted by faculty.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {announcements.map((ann) => (
                    <div
                      key={ann.id}
                      className="glass-card rounded-2xl p-4 border border-white/10 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px] font-mono">
                          {ann.courseName}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(ann.creationTime).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line">{ann.text}</p>
                      {ann.alternateLink && (
                        <a
                          href={ann.alternateLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-amber-400 hover:underline inline-flex items-center gap-1 pt-1"
                        >
                          View Attachment in Classroom ↗
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
