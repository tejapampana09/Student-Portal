"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStudentData } from "@/context/StudentContext";
import { toTitleCase } from "@/shared/utils/functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubjectDialog } from "@/components/page/timetable/SubjectDialog";
import { useSubjectMaps } from "@/hooks/timetable/useSubjectMaps";
import { useCurrentClass } from "@/hooks/timetable/useCurrentClass";
import { useSubjectDialog } from "@/hooks/timetable/useSubjectDialog";
import { TIME_SLOTS, ALL_DAYS, parseSubject } from "@/shared/utils/timetable";
import { MapPin, ArrowUpRight, GraduationCap, Calendar, Clock, BookOpen, PartyPopper } from "lucide-react";
import UpcomingHolidaysCard from "@/components/page/dashboard/UpcomingHolidaysCard";
import StudentEmailCard from "@/components/page/dashboard/StudentEmailCard";

// 🍏 Clean Apple-style Circular Progress Ring
const CircularProgress = ({
  value,
  size = 170,
  strokeWidth = 14,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(value, 0), 100);
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center mx-auto" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-white/10 dark:text-white/[0.08]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-white transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-sans">
          {value.toFixed(1)}%
        </span>
        <span className="text-[11px] text-muted-foreground font-medium mt-0.5">
          Overall Attendance
        </span>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { profile, attendance, timetable, subjects, cgpa } = useStudentData();
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

  const { dialogOpen, setDialogOpen, selectedSubject, selectedSubjectAttendance, handleSubjectClick } =
    useSubjectDialog(subjectCodeToName, subjectCodeToAttendance);

  // 📊 Calculate Overall Attendance & Safe Bunks
  const { overallPercentage, totalSafeBunks, totalLowSubjects } = useMemo(() => {
    if (!attendance || attendance.length === 0) {
      return { overallPercentage: 0, totalSafeBunks: 0, totalLowSubjects: 0 };
    }

    let totalAttended = 0;
    let totalClasses = 0;
    let safeBunksSum = 0;
    let lowCount = 0;

    for (const sub of attendance) {
      const att = typeof sub.present === "number" ? sub.present : parseInt(sub.present || "0", 10);
      const tot = typeof sub.classes_conducted === "number" ? sub.classes_conducted : parseInt(sub.classes_conducted || "0", 10);
      const pct = parseFloat(sub.attendance_percentage || "0");

      if (pct < 75) lowCount++;

      if (tot > 0) {
        totalAttended += att;
        totalClasses += tot;
        if (pct >= 75) {
          const safe = Math.floor((4 * att - 3 * tot) / 3);
          safeBunksSum += Math.max(0, safe);
        }
      }
    }

    const overall =
      totalClasses > 0
        ? (totalAttended / totalClasses) * 100
        : attendance.reduce((acc, s) => acc + parseFloat(s.attendance_percentage || "0"), 0) /
          attendance.length;

    return {
      overallPercentage: isNaN(overall) ? 0 : overall,
      totalSafeBunks: safeBunksSum,
      totalLowSubjects: lowCount,
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

  // Current active or next display class
  const activeClassDisplay = ongoingClass || upcomingClass;

  // 🎓 Strictly Real CGPA resolution (No hardcoded/fallback mock numbers)
  const realCgpa = useMemo(() => {
    if (typeof cgpa === "number" && !isNaN(cgpa)) return cgpa > 0 ? cgpa : null;
    if (typeof cgpa === "string") {
      const p = parseFloat(cgpa.trim());
      return !isNaN(p) && p > 0 ? p : null;
    }
    if (cgpa && typeof cgpa === "object") {
      const str = (cgpa as any).cgpa;
      if (typeof str === "string" || typeof str === "number") {
        const p = parseFloat(String(str).trim());
        return !isNaN(p) && p > 0 ? p : null;
      }
    }
    return null;
  }, [cgpa]);

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="flex flex-col gap-4 pb-8 max-w-7xl mx-auto w-full">
      {/* 🍏 Top Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Welcome back, {toTitleCase(profile?.studentName || "Student")}!
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{formattedDate}</p>
        </div>
        {profile?.registerNo && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-white/10 dark:bg-white/[0.06] border border-white/10 text-muted-foreground backdrop-blur-md">
              {profile.registerNo}
            </span>
          </div>
        )}
      </div>

      {/* 🍏 Top Grid: Attendance Summary & Upcoming Class */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* 1. Overall Attendance Card */}
        <div className="md:col-span-5 glass-card rounded-3xl p-6 flex flex-col justify-between border border-white/10 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold tracking-tight text-foreground">Attendance</h3>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/10 dark:bg-white/[0.06] border border-white/10 text-foreground backdrop-blur-md">
              {totalSafeBunks > 0 ? `${totalSafeBunks} safe bunks` : `${totalLowSubjects} low courses`}
            </span>
          </div>

          <div className="my-3">
            <CircularProgress value={overallPercentage} size={180} strokeWidth={15} />
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Threshold Status</span>
            <span className={`text-xs font-semibold ${overallPercentage >= 75 ? "text-emerald-400" : "text-amber-400"}`}>
              {overallPercentage >= 75 ? "Comfortably Safe (≥ 75%)" : "Attention Required (< 75%)"}
            </span>
          </div>
        </div>

        {/* 2. Upcoming Class Card */}
        <div className="md:col-span-7 glass-card rounded-3xl p-6 sm:p-7 flex flex-col justify-between border border-white/10 shadow-lg relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Upcoming Class
              </span>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {ongoingClass ? "Live Now" : "Next Up"}
              </div>
            </div>

            {activeClassDisplay ? (
              <div className="space-y-2 mt-2">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-snug">
                  {subjectCodeToName[activeClassDisplay.code] || activeClassDisplay.code}
                </h2>
                <p className="text-sm font-medium text-muted-foreground">
                  {activeClassDisplay.timeSlot}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                  {activeClassDisplay.venue && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-primary/80" />
                      {activeClassDisplay.venue}
                    </span>
                  )}
                  <span className="font-mono text-[11px] opacity-75">{activeClassDisplay.code}</span>
                </div>
              </div>
            ) : (
              <div className="py-6 space-y-1">
                <h2 className="text-xl font-bold text-foreground">
                  {isWeekend ? "No Classes Today" : "All Classes Completed"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {isWeekend ? "Enjoy your weekend recharge!" : "You have no more classes scheduled for today."}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between pt-4 border-t border-white/10">
            <span className="text-xs text-muted-foreground">
              {todayClasses.length} sessions scheduled today
            </span>
            {activeClassDisplay && (
              <Button
                size="sm"
                variant="glass"
                onClick={() =>
                  handleSubjectClick(
                    activeClassDisplay.code,
                    activeClassDisplay.venue || "",
                    currentDay,
                    activeClassDisplay.timeSlot
                  )
                }
                className="text-xs h-8 px-3.5 rounded-xl font-semibold touch-manipulation gap-1"
              >
                <span>View Details</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 🍏 Row 1: CGPA, Daily Timetable, Course Attendance */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* 3. Current CGPA Widget */}
        <div className="md:col-span-4 glass-card rounded-3xl p-6 flex flex-col justify-between border border-white/10 shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                Current CGPA
              </h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.push("/cgpa")}
                className="text-xs h-6 px-2 text-muted-foreground hover:text-foreground"
              >
                Analytics →
              </Button>
            </div>

            <div className="my-4">
              <div className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-sans">
                {realCgpa !== null ? (
                  <>
                    {realCgpa.toFixed(2)}{" "}
                    <span className="text-sm font-normal text-muted-foreground">CGPA</span>
                  </>
                ) : (
                  <span className="text-2xl sm:text-3xl text-muted-foreground font-medium">N/A</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {realCgpa !== null ? "Cumulative Grade Point Average" : "CGPA not yet published on portal"}
              </p>
            </div>
          </div>

          <div>
            <div className="w-full bg-white/10 dark:bg-white/[0.08] rounded-full h-2 overflow-hidden mb-2">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-700"
                style={{ width: `${realCgpa !== null ? Math.min((realCgpa / 10) * 100, 100) : 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
              <span>{realCgpa !== null ? "0.00" : "Semester 1"}</span>
              <span>{realCgpa !== null ? `${realCgpa.toFixed(2)} / 10.0` : "Scale 10.0"}</span>
            </div>
          </div>
        </div>

        {/* 4. Daily Timetable Widget */}
        <div className="md:col-span-4 glass-card rounded-3xl p-6 flex flex-col justify-between border border-white/10 shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Daily Timetable
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Today · {currentDay}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.push("/timetable")}
                className="text-xs h-6 px-2 text-muted-foreground hover:text-foreground"
              >
                Full →
              </Button>
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {todayClasses.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No classes scheduled for today.
                </div>
              ) : (
                (todayClasses as any[]).map(({ code, venue, timeSlot, slotIdx }) => {
                  const isOngoing = ongoingClass?.code === code && ongoingClass?.timeSlot === timeSlot;
                  return (
                    <div
                      key={slotIdx}
                      onClick={() => handleSubjectClick(code, venue, currentDay, timeSlot)}
                      className={`flex items-center justify-between p-2.5 rounded-xl transition-colors cursor-pointer border ${
                        isOngoing
                          ? "bg-emerald-500/10 border-emerald-500/30"
                          : "bg-white/5 hover:bg-white/10 border-white/5"
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="text-xs font-semibold text-foreground truncate">
                          {subjectCodeToName[code] || code}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span>{timeSlot.split("-")[0]}</span>
                          {venue && <span>· {venue}</span>}
                        </div>
                      </div>
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${
                          isOngoing ? "bg-emerald-400 animate-pulse" : "bg-white/20"
                        }`}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 5. Course Attendance Breakdown Widget */}
        <div className="md:col-span-4 glass-card rounded-3xl p-6 flex flex-col justify-between border border-white/10 shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  Course Attendance
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{attendance.length} enrolled subjects</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.push("/attendance")}
                className="text-xs h-6 px-2 text-muted-foreground hover:text-foreground"
              >
                All →
              </Button>
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {attendance.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No attendance records found.
                </div>
              ) : (
                attendance.map((sub) => {
                  const pct = parseFloat(sub.attendance_percentage || "0");
                  const isSafe = pct >= 75;
                  return (
                    <div
                      key={sub.subject_code}
                      onClick={() =>
                        handleSubjectClick(sub.subject_code, "", currentDay, "")
                      }
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="text-xs font-semibold text-foreground truncate">
                          {sub.subject_name || sub.subject_code}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          {sub.present || 0}/{sub.classes_conducted || 0} classes
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold font-mono text-foreground">{pct.toFixed(0)}%</span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isSafe
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {isSafe ? "Active" : "Low"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 🍏 Row 2: Upcoming Holidays & Student Email / Circulars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* 6. Upcoming Holidays & Long Weekends Widget */}
        <UpcomingHolidaysCard />

        {/* 7. Student Email & Placement Notices Widget */}
        <StudentEmailCard />
      </div>

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
