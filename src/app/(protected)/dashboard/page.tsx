"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStudentData } from "@/context/StudentContext";
import { toTitleCase } from "@/shared/utils/functions";
import { SubjectDialog } from "@/components/page/timetable/SubjectDialog";
import { useSubjectMaps } from "@/hooks/timetable/useSubjectMaps";
import { useCurrentClass } from "@/hooks/timetable/useCurrentClass";
import { useSubjectDialog } from "@/hooks/timetable/useSubjectDialog";
import { TIME_SLOTS, ALL_DAYS, parseSubject, formatCountdown } from "@/shared/utils/timetable";
import { 
  MapPin, 
  Sun,
  Sunset,
  Moon,
  Clock,
  ArrowRight,
} from "lucide-react";
import StudentEmailCard from "@/components/page/dashboard/StudentEmailCard";
import {
  CustomizeDashboardModal,
  DashboardWidgetsConfig,
  DEFAULT_WIDGETS_CONFIG,
} from "@/components/page/dashboard/CustomizeDashboardModal";

const Dashboard = () => {
  const { profile, attendance, timetable, subjects } = useStudentData();
  const router = useRouter();

  const { subjectCodeToName, subjectCodeToAttendance } = useSubjectMaps(subjects ?? [], attendance);

  const currentDay = ALL_DAYS[new Date().getDay()];
  const isWeekend = currentDay === "Saturday" || currentDay === "Sunday";

  const { ongoingClass, upcomingClass } = useCurrentClass(
    timetable,
    currentDay,
    subjectCodeToName,
    isWeekend
  );

  const [countdown, setCountdown] = useState<number | null>(null);
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const minsNow = now.getHours() * 60 + now.getMinutes();
      setCountdown(ongoingClass ? (ongoingClass.endsAt - minsNow) * 60 - now.getSeconds() : null);
    }, 1000);
    return () => clearInterval(interval);
  }, [ongoingClass]);

  const { dialogOpen, setDialogOpen, selectedSubject, selectedSubjectAttendance, handleSubjectClick } =
    useSubjectDialog(subjectCodeToName, subjectCodeToAttendance);

  // Overall Attendance Calculation
  const { overallPercentage } = useMemo(() => {
    if (!attendance || attendance.length === 0) {
      return { overallPercentage: 0 };
    }

    let totalAttended = 0;
    let totalClasses = 0;

    for (const sub of attendance) {
      const att = typeof sub.present === "number" ? sub.present : parseInt(sub.present || "0", 10);
      const tot = typeof sub.classes_conducted === "number" ? sub.classes_conducted : parseInt(sub.classes_conducted || "0", 10);

      if (tot > 0) {
        totalAttended += att;
        totalClasses += tot;
      }
    }

    const overall =
      totalClasses > 0
        ? (totalAttended / totalClasses) * 100
        : attendance.reduce((acc, s) => acc + parseFloat(s.attendance_percentage || "0"), 0) /
          attendance.length;

    return {
      overallPercentage: isNaN(overall) ? 0 : overall,
    };
  }, [attendance]);

  const todayClasses = useMemo(() => {
    if (isWeekend) return [];
    const dayData = timetable.find((t) => t.day === currentDay);
    if (!dayData) return [];
    return dayData.subjects
      .map((subj: string, idx: number) => {
        const { code, venue } = parseSubject(subj);
        return code ? { code, venue, timeSlot: TIME_SLOTS[idx], slotIdx: idx } : null;
      })
      .filter(Boolean);
  }, [timetable, currentDay, isWeekend]);

  const activeClassDisplay = ongoingClass || upcomingClass;

  const [widgetsConfig, setWidgetsConfig] = useState<DashboardWidgetsConfig>(DEFAULT_WIDGETS_CONFIG);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("srmap_dashboard_widgets_v3");
      if (saved) {
        setWidgetsConfig((prev) => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch {}
  }, []);

  const handleWidgetsChange = (newConfig: DashboardWidgetsConfig) => {
    setWidgetsConfig(newConfig);
    try {
      localStorage.setItem("srmap_dashboard_widgets_v3", JSON.stringify(newConfig));
    } catch {}
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const GreetingIcon = hour < 12 ? Sun : hour < 17 ? Sunset : Moon;

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date());

  return (
    <div className="flex flex-col gap-6 pb-28 max-w-4xl mx-auto w-full">
      {/* 🔵 ONLY Top Royal Blue Greeting Banner (Paina Matram Blue) */}
      <div className="relative rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 p-5 sm:p-6 text-white shadow-md overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <GreetingIcon className="h-4 w-4 text-white/90" />
              <span className="text-xs font-semibold uppercase tracking-wider text-white/90">
                {greeting}
              </span>
              <span className="text-xs text-white/60">·</span>
              <span className="text-xs text-white/85">{formattedDate}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white truncate font-sans">
              Welcome back, {toTitleCase(profile?.studentName || "Student")}
            </h1>
            <p className="text-xs text-white/80 mt-0.5">
              {profile?.program || profile?.institution || "SRM University AP"} {profile?.semester ? `· Sem ${profile.semester}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <CustomizeDashboardModal config={widgetsConfig} onChange={handleWidgetsChange} />
            {profile?.registerNo && (
              <span className="px-3 py-1.5 rounded-xl bg-white/15 border border-white/20 text-xs font-mono font-bold text-white">
                {profile.registerNo}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ⚡ Live Class Section — Completely Seamless & Non-Card */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                ongoingClass
                  ? "bg-emerald-500 animate-pulse"
                  : upcomingClass
                  ? "bg-blue-500"
                  : "bg-muted-foreground/40"
              }`}
            />
            <span
              className={`text-xs uppercase tracking-wider ${
                ongoingClass
                  ? "text-emerald-600 dark:text-emerald-400 font-bold"
                  : upcomingClass
                  ? "text-blue-600 dark:text-blue-400 font-bold"
                  : "text-muted-foreground font-semibold"
              }`}
            >
              {ongoingClass ? "Live Class Now" : upcomingClass ? "Next Class" : "Today's Status"}
            </span>

            {ongoingClass && countdown !== null && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 font-bold">
                {formatCountdown(countdown)} left
              </span>
            )}
          </div>

          {/* Quick Attendance overview */}
          <button
            onClick={() => router.push("/attendance")}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
          >
            <span>Overall Attendance:</span>
            <span
              className={`font-mono font-bold ${
                overallPercentage >= 75
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {overallPercentage.toFixed(1)}%
            </span>
            <span className="text-[10px] text-muted-foreground group-hover:text-blue-500 transition-colors">
              ({overallPercentage >= 75 ? "Safe" : "Low"}) →
            </span>
          </button>
        </div>

        {activeClassDisplay ? (
          <div className="flex flex-col gap-1 mt-0.5">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-snug">
              {subjectCodeToName[activeClassDisplay.code] || activeClassDisplay.code}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-0.5">
              <span className="font-mono font-semibold px-2 py-0.5 rounded-md bg-muted text-foreground">
                {activeClassDisplay.code}
              </span>
              <span>·</span>
              <span className="font-semibold text-foreground/90 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                {activeClassDisplay.timeSlot}
              </span>
              {activeClassDisplay.venue && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="text-foreground font-medium">{activeClassDisplay.venue}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-0.5">
            <h2 className="text-lg font-bold text-foreground">
              {isWeekend ? "Weekend Mode" : "All Classes Completed"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isWeekend
                ? "No lectures scheduled for today. Take time to relax and review."
                : "You have completed all scheduled classes for today!"}
            </p>
          </div>
        )}
      </div>

      {/* Clean Divider Line */}
      <div className="border-t border-border/60" />

      {/* 📅 Today's Schedule — Non-Card Flat List */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Today&apos;s Schedule ({todayClasses.length})
          </p>
          <button
            onClick={() => router.push("/timetable")}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-0.5 cursor-pointer"
          >
            <span>Full timetable</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {todayClasses.length > 0 ? (
          <div className="divide-y divide-border/40">
            {(todayClasses as any[]).map(({ code, venue, timeSlot, slotIdx }) => {
              const isOngoing = ongoingClass?.code === code && ongoingClass?.timeSlot === timeSlot;
              return (
                <div
                  key={slotIdx}
                  onClick={() => handleSubjectClick(code, venue, currentDay, timeSlot)}
                  className={`flex items-center justify-between gap-3 py-3 transition-colors cursor-pointer hover:bg-black/[0.015] dark:hover:bg-white/[0.015] ${
                    isOngoing ? "bg-emerald-500/5 px-2.5 rounded-xl font-medium" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        isOngoing ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {subjectCodeToName[code] || code}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                        {code} {venue ? `· ${venue}` : ""}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-mono font-medium shrink-0 ${
                      isOngoing ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-muted-foreground"
                    }`}
                  >
                    {timeSlot}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-muted-foreground text-xs">
            {isWeekend ? "Weekend — No scheduled lectures today" : "No classes scheduled today"}
          </div>
        )}
      </div>

      {/* 📬 Student Communications / Emails (Divider + Flat Section) */}
      {widgetsConfig.studentEmails && (
        <>
          <div className="border-t border-border/60" />
          <div className="w-full">
            <StudentEmailCard />
          </div>
        </>
      )}

      <SubjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        subject={selectedSubject}
        attendance={selectedSubjectAttendance}
      />
    </div>
  );
};

export default Dashboard;