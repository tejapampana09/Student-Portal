"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Radio, Mic, ChevronDown, ChevronUp, Clock, MapPin, BookOpen, Fingerprint, Lock, ShieldCheck, Loader2, Sparkles, Volume2 } from "lucide-react";
import { useStudentData } from "@/context/StudentContext";
import { getLiveClassStatus, LiveClassInfo } from "@/shared/utils/liveClassTracker";
import VoiceAssistantModal from "@/components/voice/VoiceAssistantModal";
import API from "@/lib/api/axiosClient";
import { useToast } from "@/hooks/utils/useToast";
import { useLocalStorageContext } from "@/context/LocalStorageContext";

const SILENT_WAV = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAP8A/w==";

export default function DynamicIslandWidget() {
  const { toast } = useToast();
  const { timetable, subjects, attendance, profile } = useStudentData();
  const { profile: lProfile, updateAccountsSessions } = useLocalStorageContext();

  const [liveInfo, setLiveInfo] = useState<LiveClassInfo>(() =>
    getLiveClassStatus(timetable, subjects, attendance)
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [quickCode, setQuickCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLockscreenActive, setIsLockscreenActive] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Update live status every 15 seconds
  useEffect(() => {
    const update = () => {
      const status = getLiveClassStatus(timetable, subjects, attendance);
      setLiveInfo(status);
    };

    update();
    const interval = setInterval(update, 15000);
    return () => clearInterval(interval);
  }, [timetable, subjects, attendance]);

  // Sync with Lockscreen MediaSession
  useEffect(() => {
    if (!isLockscreenActive || typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }

    try {
      const title = liveInfo.status === "ongoing"
        ? `🔴 Now: ${liveInfo.subjectName} (${liveInfo.venue})`
        : liveInfo.status === "upcoming"
        ? `⏰ Next: ${liveInfo.subjectName} in ${liveInfo.minutesUntilStart}m`
        : liveInfo.subjectName;

      const artist = liveInfo.attendancePercentage
        ? `Attendance: ${liveInfo.attendancePercentage} • Safe Bunks: ${liveInfo.safeBunks ?? 0}`
        : `${liveInfo.venue} • SRM University AP`;

      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist,
        album: "SRM AP Campus Live Lockscreen",
        artwork: [
          { src: "/icons/192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/512x512.png", sizes: "512x512", type: "image/png" },
        ],
      });
    } catch (e) {
      console.warn("MediaSession update error:", e);
    }
  }, [liveInfo, isLockscreenActive]);

  // Toggle Lockscreen Live Widget
  const toggleLockscreenWidget = async () => {
    if (!isLockscreenActive) {
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio(SILENT_WAV);
          audioRef.current.loop = true;
        }
        await audioRef.current.play();
        setIsLockscreenActive(true);
        toast({
          title: "Lockscreen Widget Enabled 📱",
          description: "Live class countdown & room will now stay active on your phone's lock screen & Dynamic Island!",
        });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Audio Permission Needed",
          description: "Tap again to allow lockscreen media tracking.",
        });
      }
    } else {
      try {
        audioRef.current?.pause();
      } catch {}
      setIsLockscreenActive(false);
      toast({ title: "Lockscreen Widget Disabled" });
    }
  };

  // Quick Attendance Mark from Dynamic Island
  const handleQuickSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = quickCode.trim().toUpperCase();
    if (!code || !/^[A-Z]\d{6}$/.test(code)) {
      toast({ title: "Invalid Code", description: "Format: 1 letter + 6 numbers (e.g. A123456)", variant: "destructive" });
      return;
    }

    const savedAccounts = Array.isArray(lProfile.accounts) ? lProfile.accounts : [];
    const accountsToMark = savedAccounts.length > 0 ? savedAccounts : [{ username: profile?.registerNo || "me", sessionId: lProfile.sessionId }];

    setIsSubmitting(true);
    try {
      const promises = accountsToMark.map(async (acc: any) => {
        try {
          const res = await API.post("/srmapi/attendance/mark", {
            code,
            sessionid: acc.sessionId,
            username: acc.username,
          });
          return { username: acc.username, success: !!res.data?.success, message: res.data?.message };
        } catch (err: any) {
          return { username: acc.username, success: false, message: err?.response?.data?.message || "Failed" };
        }
      });

      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;

      if (successCount > 0) {
        toast({
          title: "Attendance Captured! 🎯",
          description: `Successfully marked for ${successCount} account(s) via Dynamic Island!`,
        });
        setQuickCode("");
        setIsExpanded(false);
      } else {
        toast({
          variant: "destructive",
          title: "Attendance Failed",
          description: results[0]?.message || "Could not mark attendance.",
        });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: "Failed to mark attendance." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Dynamic Island Floating Capsule */}
      <div className="fixed top-2.5 sm:top-3 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ease-out select-none">
        <div
          className={`relative rounded-3xl bg-black/90 dark:bg-black/95 text-white border border-white/15 shadow-2xl backdrop-blur-2xl transition-all duration-300 overflow-hidden ${
            isExpanded ? "w-[92vw] max-w-md p-4" : "px-3.5 py-1.5 flex items-center gap-2 cursor-pointer hover:border-white/30 active:scale-98"
          }`}
          onClick={() => !isExpanded && setIsExpanded(true)}
        >
          {/* Subtle Top Specular Reflection */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

          {!isExpanded ? (
            /* COMPACT DYNAMIC ISLAND */
            <div className="flex items-center gap-2 text-xs font-sans">
              {/* Pulsing Status Dot */}
              <div className="relative flex items-center justify-center">
                <span
                  className={`h-2 w-2 rounded-full ${
                    liveInfo.status === "ongoing"
                      ? "bg-emerald-400 animate-pulse"
                      : liveInfo.status === "upcoming"
                      ? "bg-cyan-400"
                      : "bg-muted-foreground"
                  }`}
                />
              </div>

              {/* Pill Content */}
              <div className="flex items-center gap-1.5 font-medium tracking-tight">
                {liveInfo.status === "ongoing" ? (
                  <>
                    <span className="font-bold text-emerald-400">Now:</span>
                    <span className="truncate max-w-[120px] sm:max-w-[160px] font-semibold">{liveInfo.subjectName}</span>
                    <span className="text-[10px] opacity-75 font-mono">({liveInfo.venue})</span>
                  </>
                ) : liveInfo.status === "upcoming" ? (
                  <>
                    <span className="font-bold text-cyan-400">Next:</span>
                    <span className="truncate max-w-[110px] sm:max-w-[150px]">{liveInfo.subjectName}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                      {liveInfo.minutesUntilStart}m
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground text-[11px]">{liveInfo.subjectName}</span>
                )}
              </div>

              {/* Quick Action Icons */}
              <div className="flex items-center gap-1 ml-1 pl-1.5 border-l border-white/20">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsVoiceOpen(true);
                  }}
                  className="p-1 rounded-full hover:bg-white/15 text-cyan-300 transition-colors"
                  title="Voice Assistant"
                >
                  <Mic className="h-3 w-3" />
                </button>
                <ChevronDown className="h-3 w-3 text-muted-foreground opacity-60" />
              </div>
            </div>
          ) : (
            /* EXPANDED DYNAMIC ISLAND */
            <div className="flex flex-col gap-3 font-sans">
              {/* Header: Status + Minimize */}
              <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      liveInfo.status === "ongoing"
                        ? "bg-emerald-400 animate-pulse"
                        : liveInfo.status === "upcoming"
                        ? "bg-cyan-400"
                        : "bg-muted-foreground"
                    }`}
                  />
                  <span className="font-bold uppercase tracking-wider text-[10px] text-white/80">
                    {liveInfo.status === "ongoing"
                      ? "Ongoing Class"
                      : liveInfo.status === "upcoming"
                      ? `Starts in ${liveInfo.minutesUntilStart} mins`
                      : "Campus Live Tracker"}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsVoiceOpen(true);
                    }}
                    className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-cyan-300 flex items-center gap-1 text-[10px] px-2"
                  >
                    <Mic className="h-3 w-3" />
                    <span>Voice</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    className="p-1 rounded-lg hover:bg-white/15 text-white/70 hover:text-white"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Subject Details */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">
                    {liveInfo.subjectName}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-white/70 mt-0.5">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-rose-400" />
                      <strong>{liveInfo.venue}</strong>
                    </span>
                    {liveInfo.timeRange && (
                      <span className="flex items-center gap-1 font-mono text-white/60">
                        <Clock className="h-3 w-3" />
                        {liveInfo.timeRange}
                      </span>
                    )}
                  </div>
                </div>

                {/* Safe Bunk Badge */}
                {liveInfo.attendancePercentage && (
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      {liveInfo.attendancePercentage}
                    </span>
                    <p className="text-[10px] text-white/60 font-medium">
                      {liveInfo.safeBunks !== undefined && liveInfo.safeBunks > 0
                        ? `🛡️ ${liveInfo.safeBunks} safe bunks`
                        : "⚠️ Attend next"}
                    </p>
                  </div>
                )}
              </div>

              {/* Fast Attendance Code Entry */}
              <form onSubmit={handleQuickSubmit} className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  placeholder="Code e.g. A123456"
                  value={quickCode}
                  onChange={(e) => setQuickCode(e.target.value.toUpperCase())}
                  maxLength={7}
                  className="flex-1 h-9 px-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-xs font-mono font-bold uppercase tracking-widest text-center focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !quickCode}
                  className="h-9 px-3 rounded-xl font-bold text-xs bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white flex items-center gap-1.5 shadow-md disabled:opacity-50 active:scale-95 transition-all"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Fingerprint className="h-3.5 w-3.5" />
                  )}
                  <span>Mark</span>
                </button>
              </form>

              {/* Footer: Lockscreen Media Widget Toggle */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                <span className="text-white/60 flex items-center gap-1">
                  <Lock className="h-3 w-3 text-cyan-400" />
                  <span>Lockscreen Live Tracker</span>
                </span>

                <button
                  type="button"
                  onClick={toggleLockscreenWidget}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all flex items-center gap-1.5 ${
                    isLockscreenActive
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-white/10 hover:bg-white/15 text-white/80"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isLockscreenActive ? "bg-emerald-400 animate-pulse" : "bg-white/40"}`} />
                  <span>{isLockscreenActive ? "Active on Lockscreen" : "Enable Lockscreen"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Voice Assistant Modal */}
      <VoiceAssistantModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
      />
    </>
  );
}
