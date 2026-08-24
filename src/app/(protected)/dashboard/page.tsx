"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStudentData } from "@/context/StudentContext";
import { toTitleCase } from "@/shared/utils/functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubjectDialog } from "@/components/page/timetable/SubjectDialog";
import { useSubjectMaps } from "@/hooks/timetable/useSubjectMaps";
import { useCurrentClass } from "@/hooks/timetable/useCurrentClass";
import { useSubjectDialog } from "@/hooks/timetable/useSubjectDialog";
import { TIME_SLOTS, ALL_DAYS, parseSubject } from "@/shared/utils/timetable";
import { MapPin, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

const Dashboard = () => {
  const { profile, attendance, timetable, subjects } = useStudentData();
  const router = useRouter();
  const [warningsOpen, setWarningsOpen] = useState(false);

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

  const lowAttendanceSubjects = attendance.filter(
    (s) => parseFloat(s.attendance_percentage) < 75
  );

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

  return (
    <div className="flex flex-col gap-2.5 pb-4">
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Welcome back</p>
          <h2 className="text-xl font-bold tracking-tight truncate">
            {toTitleCase(profile?.studentName || "Student")}
          </h2>
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-white/10 dark:border-white/[0.07] overflow-hidden shadow-md">
        <button
          onClick={() => setWarningsOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3.5 bg-white/10 dark:bg-white/[0.02] hover:bg-white/20 dark:hover:bg-white/5 active:bg-white/30 transition-colors text-left touch-manipulation backdrop-blur-md"
        >
          <div className="flex items-center gap-2.5">
            {lowAttendanceSubjects.length > 0 ? (
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            )}
            <span className="text-sm font-semibold text-foreground">Attendance Health</span>
            {lowAttendanceSubjects.length > 0 ? (
              <Badge variant="destructive" className="text-xs h-5 px-2 rounded-full">
                {lowAttendanceSubjects.length} Low
              </Badge>
            ) : (
              <Badge variant="glass-success" className="text-xs h-5 px-2 rounded-full">
                All Good
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {lowAttendanceSubjects.length === 0 && (
              <span className="text-xs text-emerald-500 font-medium hidden sm:inline">Above 75%</span>
            )}
            {warningsOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>
        {warningsOpen && (
          <div className="border-t border-white/10 dark:border-white/[0.06] bg-white/5 dark:bg-white/[0.02] backdrop-blur-md">
            {lowAttendanceSubjects.length > 0 ? (
              <div className="divide-y divide-white/10 dark:divide-white/[0.06] max-h-56 overflow-y-auto p-1">
                {lowAttendanceSubjects.map((subject) => {
                  const pct = parseFloat(subject.attendance_percentage);
                  return (
                    <div key={subject.subject_code} className="flex items-center justify-between px-3.5 py-3 gap-3 rounded-xl hover:bg-white/10 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-foreground truncate leading-tight">{subject.subject_name}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">{subject.subject_code}</div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-16 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                          <div className="h-full rounded-full bg-red-500" style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className="text-sm font-bold text-red-500 tabular-nums w-12 text-right">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div className="p-2">
                  <Button size="sm" variant="glass" onClick={() => router.push("/attendance")} className="text-xs h-9 w-full touch-manipulation">
                    View Full Attendance Breakdown
                  </Button>
                </div>
              </div>
            ) : (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">All subjects are comfortably above 75% attendance!</p>
                <Button size="sm" variant="glass" onClick={() => router.push("/attendance")} className="mt-3 text-xs h-8 touch-manipulation">
                  View Full Report
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <SubjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        subject={selectedSubject}
        attendance={selectedSubjectAttendance}
      />

      <Card className="glass-card rounded-2xl border border-white/10 dark:border-white/[0.07] shadow-md">
        <CardHeader className="pb-3 px-4 pt-4 border-b border-white/10 dark:border-white/[0.06]">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary shrink-0" />
              {isWeekend ? "Weekend Vibes" : `Today's Schedule — ${currentDay}`}
              {!isWeekend && todayClasses.length > 0 && (
                <span className="text-xs text-muted-foreground font-normal">({todayClasses.length} slots)</span>
              )}
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={() => router.push("/timetable")} className="text-xs h-7 text-primary hover:text-primary hover:bg-primary/10 px-2.5 rounded-lg touch-manipulation">
              Full Timetable →
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          {isWeekend ? (
            <div className="text-center py-6"><p className="text-muted-foreground text-sm">Enjoy your weekend recharge!</p></div>
          ) : todayClasses.length === 0 ? (
            <div className="text-center py-6"><p className="text-muted-foreground text-sm">No scheduled classes today.</p></div>
          ) : (
            <div className="space-y-2">
              {(todayClasses as any[]).map(({ code, venue, timeSlot, slotIdx }) => {
                const isOngoing = ongoingClass?.code === code && ongoingClass?.timeSlot === timeSlot;
                const isNext = upcomingClass?.code === code && upcomingClass?.timeSlot === timeSlot;
                return (
                  <div
                    key={slotIdx}
                    onClick={() => handleSubjectClick(code, venue, currentDay, timeSlot)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
                      isOngoing
                        ? "bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 shadow-sm"
                        : isNext
                        ? "bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/30 shadow-sm"
                        : "bg-white/10 dark:bg-white/[0.03] hover:bg-white/20 dark:hover:bg-white/5 border border-white/10 dark:border-white/[0.06]"
                    }`}
                  >
                    <div className="text-xs font-semibold text-muted-foreground font-mono w-12 shrink-0 leading-tight">
                      {timeSlot.split("-")[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate leading-snug">{subjectCodeToName[code] || code}</div>
                      {venue && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80 mt-0.5">
                          <MapPin className="h-3 w-3 shrink-0 text-primary/70" />
                          <span className="truncate">{venue}</span>
                        </div>
                      )}
                    </div>
                    {isOngoing && (
                      <Badge variant="glass-success" className="text-xs h-6 px-2.5 rounded-full shrink-0 font-bold animate-pulse">
                        Ongoing
                      </Badge>
                    )}
                    {isNext && !isOngoing && (
                      <Badge variant="glass-info" className="text-xs h-6 px-2.5 rounded-full shrink-0 font-semibold">
                        Next Up
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
};

export default Dashboard;
