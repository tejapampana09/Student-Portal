"use client";
import { useEffect, useState } from "react";
import { useStudentData } from "@/context/StudentContext";
import { useLocalStorageContext } from "@/context/LocalStorageContext";
import { useSubjectMaps } from "@/hooks/timetable/useSubjectMaps";
import { useCurrentClass } from "@/hooks/timetable/useCurrentClass";
import { useSubjectDialog } from "@/hooks/timetable/useSubjectDialog";
import { SubjectDialog } from "@/components/page/timetable/SubjectDialog";
import { TIME_SLOTS, WEEK_DAYS, ALL_DAYS, parseSubject, parseTime, formatCountdown } from "@/shared/utils/timetable";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trimText } from "@/shared/utils/functions";
import { CalendarSyncModal } from "@/components/page/timetable/CalendarSyncModal";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const Timetable = () => {
  const { timetable, subjects, attendance } = useStudentData();
  const { settings, updateSettings } = useLocalStorageContext();
  const { subjectCodeToName, subjectCodeToAttendance } = useSubjectMaps(subjects, attendance);

  const todayIndex = new Date().getDay();
  const defaultDayIdx = todayIndex >= 1 && todayIndex <= 5 ? todayIndex - 1 : 0;
  const [selectedDayIdx, setSelectedDayIdx] = useState(defaultDayIdx);

  const selectedDay = WEEK_DAYS[selectedDayIdx];
  const isWeekend = todayIndex === 0 || todayIndex === 6;
  const currentDay = ALL_DAYS[todayIndex];

  const viewMode = (settings.timeTableViewMode as "old" | "new") || "old";

  const { ongoingClass, upcomingClass } = useCurrentClass(timetable, currentDay, subjectCodeToName, isWeekend);
  const { dialogOpen, setDialogOpen, selectedSubject, selectedSubjectAttendance, handleSubjectClick } =
    useSubjectDialog(subjectCodeToName, subjectCodeToAttendance);

  const [countdown, setCountdown] = useState<number | null>(null);
  const [upcomingCountdown, setUpcomingCountdown] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const minsNow = now.getHours() * 60 + now.getMinutes();
      setCountdown(ongoingClass ? (ongoingClass.endsAt - minsNow) * 60 - now.getSeconds() : null);
      setUpcomingCountdown(upcomingClass ? (upcomingClass.startsAt - minsNow) * 60 - now.getSeconds() : null);
    }, 1000);
    return () => clearInterval(interval);
  }, [ongoingClass, upcomingClass]);

  const dayData = timetable.find((t) => t.day === selectedDay);

  // Build slot list for selected day (mobile view)
  const slots = TIME_SLOTS.map((timeSlot, idx) => {
    const subjStr = dayData?.subjects[idx] || "";
    const { code, venue } = parseSubject(subjStr);
    const [startStr, endStr] = timeSlot.split("-");
    const start = parseTime(startStr);
    const end = parseTime(endStr);
    const now = new Date();
    const minsNow = now.getHours() * 60 + now.getMinutes();
    const isNow = selectedDay === currentDay && minsNow >= start && minsNow < end;
    const isPast = selectedDay === currentDay && minsNow >= end;
    return { timeSlot, code, venue, start, end, isNow, isPast, idx };
  });

  const goLeft = () => setSelectedDayIdx((i) => Math.max(0, i - 1));
  const goRight = () => setSelectedDayIdx((i) => Math.min(WEEK_DAYS.length - 1, i + 1));

  return (
    <div className="h-full flex flex-col gap-4 pb-6 max-w-7xl mx-auto w-full">

      {/* ═══ HEADER — shared ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Academic Timetable
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {isWeekend ? "Weekend — no classes" : `Today is ${currentDay}`}
          </p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <CalendarSyncModal />
          {/* View toggle — desktop only */}
          <div className="hidden md:flex items-center space-x-1 rounded-2xl glass-dock p-1 border border-white/10">
            {(["old", "new"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => updateSettings({ timeTableViewMode: mode })}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 ${
                  viewMode === mode
                    ? "bg-white/20 dark:bg-white/15 text-foreground shadow-sm border border-white/15"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                }`}
              >
                {mode === "old" ? "Detailed View" : "Minimal View"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          MOBILE VIEW  (< md) — day-by-day list
          ═══════════════════════════════════════════ */}
      <div className="flex flex-col gap-3 md:hidden">

        {/* Ongoing banner */}
        {ongoingClass && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-emerald-500 dark:text-emerald-400">Live Now</p>
                <p className="text-sm font-bold text-foreground truncate">{ongoingClass.name || ongoingClass.code}</p>
                {ongoingClass.venue && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />{ongoingClass.venue}
                  </p>
                )}
              </div>
            </div>
            {countdown !== null && (
              <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/25 font-bold shrink-0">
                {formatCountdown(countdown)}
              </span>
            )}
          </div>
        )}

        {/* Day switcher strip */}
        <div className="flex items-center gap-2">
          <button
            onClick={goLeft}
            disabled={selectedDayIdx === 0}
            className="p-1.5 rounded-xl transition-colors disabled:opacity-30 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="flex flex-1 items-center justify-between gap-1 rounded-2xl bg-black/5 dark:bg-white/5 p-1">
            {DAY_LABELS.map((label, i) => {
              const isToday = i === defaultDayIdx && !isWeekend;
              const isSelected = i === selectedDayIdx;
              return (
                <button
                  key={label}
                  onClick={() => setSelectedDayIdx(i)}
                  className={`relative flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 ${
                    isSelected
                      ? "bg-white dark:bg-white/15 text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                  {isToday && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-blue-500" />
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={goRight}
            disabled={selectedDayIdx === WEEK_DAYS.length - 1}
            className="p-1.5 rounded-xl transition-colors disabled:opacity-30 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Day schedule vertical list */}
        <div className="flex flex-col gap-2">
          {slots.map(({ timeSlot, code, venue, isNow, isPast, idx }) => {
            const name = code ? (subjectCodeToName[code] || code) : null;
            const isFree = !code;
            return (
              <button
                key={idx}
                onClick={() => code && handleSubjectClick(code, venue, selectedDay, timeSlot)}
                disabled={isFree}
                className={`w-full text-left flex items-stretch gap-3 rounded-2xl px-4 py-3 transition-all duration-200 border ${
                  isNow
                    ? "border-emerald-500/40 bg-emerald-500/10 shadow-sm"
                    : isFree
                    ? "border-transparent bg-black/[0.03] dark:bg-white/[0.03] opacity-50 cursor-default"
                    : isPast
                    ? "border-transparent bg-black/[0.03] dark:bg-white/[0.03] opacity-55"
                    : "border-border/60 bg-card hover:bg-accent/40 active:scale-[0.99]"
                }`}
              >
                {/* Time column */}
                <div className="flex flex-col items-center justify-start pt-0.5 w-[58px] shrink-0">
                  <span className={`text-[10px] font-semibold leading-tight ${isNow ? "text-emerald-500 dark:text-emerald-400" : "text-muted-foreground"}`}>
                    {timeSlot.split("-")[0]}
                  </span>
                  <div className={`mt-1 w-px flex-1 min-h-[16px] ${isNow ? "bg-emerald-400/50" : "bg-border/50"}`} />
                  <span className="text-[10px] text-muted-foreground/60 leading-tight mt-1">
                    {timeSlot.split("-")[1]}
                  </span>
                </div>

                {/* Content */}
                {isFree ? (
                  <div className="flex items-center flex-1">
                    <span className="text-xs text-muted-foreground/60 italic">Free</span>
                  </div>
                ) : (
                  <div className="flex flex-col justify-center flex-1 min-w-0 gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-bold text-sm leading-tight ${isPast && !isNow ? "text-muted-foreground" : "text-foreground"}`}>
                        {name}
                      </span>
                      {isNow && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30">
                          NOW
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-mono">{code}</span>
                      {venue && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" />{venue}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          DESKTOP VIEW  (≥ md) — original grid table
          ═══════════════════════════════════════════ */}
      <div className="hidden md:flex flex-col gap-4 flex-1 min-h-0">

        {/* Ongoing / Next Up cards */}
        <div className="grid grid-cols-2 gap-4 flex-shrink-0">
          {(ongoingClass || upcomingClass) ? (
            <>
              <Card className={`glass-card p-5 rounded-3xl border shadow-lg ${ongoingClass ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/10"}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`h-2 w-2 rounded-full ${ongoingClass ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground"}`} />
                    <span className="text-sm font-bold text-foreground">Ongoing Class</span>
                  </div>
                  {ongoingClass && countdown !== null && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-bold">
                      {formatCountdown(countdown)}
                    </span>
                  )}
                </div>
                {ongoingClass ? (
                  <div className="space-y-2 mt-1">
                    <div className="font-bold text-lg leading-snug text-foreground">{ongoingClass.name}</div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-white/10 border border-white/10 text-muted-foreground">{ongoingClass.code}</span>
                      <span className="text-muted-foreground font-semibold">{ongoingClass.timeSlot}</span>
                    </div>
                    {ongoingClass.venue && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground/90">
                        <MapPin className="w-3.5 h-3.5 text-primary/70" /><span>{ongoingClass.venue}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-3 text-xs text-muted-foreground">Free Period</div>
                )}
              </Card>

              <Card className={`glass-card p-5 rounded-3xl border shadow-lg ${upcomingClass ? "border-blue-500/30 bg-blue-500/10" : "border-white/10"}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`h-2 w-2 rounded-full ${upcomingClass ? "bg-blue-400" : "bg-muted-foreground"}`} />
                    <span className="text-sm font-bold text-foreground">Next Up</span>
                  </div>
                  {upcomingClass && upcomingCountdown !== null && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-blue-500/15 text-blue-400 border border-blue-500/25 font-bold">
                      {formatCountdown(upcomingCountdown)}
                    </span>
                  )}
                </div>
                {upcomingClass ? (
                  <div className="space-y-2 mt-1">
                    <div className="font-bold text-lg leading-snug text-foreground">{upcomingClass.name}</div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-white/10 border border-white/10 text-muted-foreground">{upcomingClass.code}</span>
                      <span className="text-muted-foreground font-semibold">{upcomingClass.timeSlot}</span>
                    </div>
                    {upcomingClass.venue && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground/90">
                        <MapPin className="w-3.5 h-3.5 text-primary/70" /><span>{upcomingClass.venue}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-3 text-xs text-muted-foreground">Free Period</div>
                )}
              </Card>
            </>
          ) : (
            <Card className="col-span-2 glass-card p-6 rounded-3xl border border-white/10 shadow-lg text-center">
              <div className="text-base font-semibold text-foreground">No More Classes Today</div>
              <p className="text-xs text-muted-foreground mt-1">You&apos;re all done for the day!</p>
            </Card>
          )}
        </div>

        {/* Weekly grid table */}
        <Card className="glass-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 shadow-xl">
          <CardHeader className="flex-shrink-0 border-b border-white/10 px-5 py-4">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg font-bold tracking-tight">
              <Clock className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
              Weekly Schedule Matrix
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-2 md:p-3">
            <div className="max-h-full overflow-auto rounded-xl bg-white/10 dark:bg-white/5 p-1 border border-white/10">
              <table className="w-full border-separate border-spacing-1.5 table-fixed">
                <thead className="sticky top-0 z-[2]">
                  <tr>
                    <th className="sticky left-0 z-[3] w-16 min-w-[64px] rounded-xl glass-dock p-2 text-left md:w-20 md:min-w-[80px] border border-white/20">
                      <div className="font-bold text-xs text-foreground">Day / Time</div>
                    </th>
                    {TIME_SLOTS.map((time) => (
                      <th key={time} className={`rounded-xl glass-dock p-2 text-left border border-white/20 ${viewMode === "new" ? "w-20 md:w-24 min-w-[80px] md:min-w-[96px]" : "w-28 md:w-36 min-w-[112px] md:min-w-[140px]"}`}>
                        <div className="font-bold text-xs text-foreground">{time}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {WEEK_DAYS.map((day) => {
                    const dData = timetable.find((t) => t.day === day);
                    return (
                      <tr key={day} className="align-top">
                        <td className="sticky left-0 z-[1] rounded-xl glass-panel p-2 text-xs font-bold text-foreground border border-white/20">
                          {trimText(day, 3)}
                        </td>
                        {TIME_SLOTS.map((timeSlot, idx) => {
                          const subjStr = dData?.subjects[idx] || "";
                          const { code, venue } = parseSubject(subjStr);
                          return (
                            <td key={`${day}-${idx}`} className="p-0">
                              <div
                                onClick={() => handleSubjectClick(code, venue, day, timeSlot)}
                                className={`${viewMode === "new" ? "min-h-[90px] md:min-h-[64px] flex flex-col justify-center items-center" : ""} h-full rounded-xl cursor-pointer transition-all duration-200 p-2 ${
                                  code
                                    ? "glass-card border border-primary/30 bg-primary/10 hover:bg-primary/20 hover:border-primary/50 shadow-sm"
                                    : "border border-white/10 bg-white/5 dark:bg-white/[0.02] hover:bg-white/10"
                                }`}
                              >
                                {code ? (
                                  viewMode === "new" ? (
                                    <div className="space-y-1 text-center">
                                      <div className="font-bold text-xs leading-none text-foreground md:text-sm">{code}</div>
                                      {venue && (
                                        <div className="flex items-center gap-1 text-[10px] leading-none text-muted-foreground justify-center">
                                          <MapPin className="w-2.5 h-2.5 shrink-0 text-primary/70" /><span>{venue}</span>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="space-y-1 text-xs">
                                      <div title={subjectCodeToName[code]} className="truncate font-bold leading-tight text-foreground">{code}</div>
                                      <Badge variant="glass" className="w-full justify-start truncate px-1.5 text-[10px] font-semibold">
                                        {subjectCodeToName[code]}
                                      </Badge>
                                      {venue && (
                                        <div className="flex items-center gap-1 truncate text-[10px] text-muted-foreground">
                                          <MapPin className="w-2.5 h-2.5 shrink-0 text-primary/70" /><span>{venue}</span>
                                        </div>
                                      )}
                                    </div>
                                  )
                                ) : (
                                  <div className="text-center py-1">
                                    <Badge variant="outline" className="border-white/20 text-[10px] text-muted-foreground/60">Free</Badge>
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
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

export default Timetable;
