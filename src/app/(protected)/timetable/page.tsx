"use client";
import { useEffect, useState } from "react";
import { useStudentData } from "@/context/StudentContext";
import { useLocalStorageContext } from "@/context/LocalStorageContext";
import { useSubjectMaps } from "@/hooks/timetable/useSubjectMaps";
import { useCurrentClass } from "@/hooks/timetable/useCurrentClass";
import { useSubjectDialog } from "@/hooks/timetable/useSubjectDialog";
import { SubjectDialog } from "@/components/page/timetable/SubjectDialog";
import { TIME_SLOTS, WEEK_DAYS, ALL_DAYS, parseSubject, formatCountdown } from "@/shared/utils/timetable";
import { trimText } from "@/shared/utils/functions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Clock, Calendar, Play } from "lucide-react";
import { CalendarSyncModal } from "@/components/page/timetable/CalendarSyncModal";

const Timetable = () => {
  const { timetable, subjects, attendance } = useStudentData();
  const { settings, updateSettings } = useLocalStorageContext();
  const { subjectCodeToName, subjectCodeToAttendance } = useSubjectMaps(subjects, attendance);

  const [countdown, setCountdown] = useState<number | null>(null);
  const [upcomingCountdown, setUpcomingCountdown] = useState<number | null>(null);

  const viewMode = (settings.timeTableViewMode as "old" | "new") || "old";

  const currentDay = ALL_DAYS[new Date().getDay()];
  const isWeekend = currentDay === "Saturday" || currentDay === "Sunday";

  const { ongoingClass, upcomingClass } = useCurrentClass(timetable, currentDay, subjectCodeToName, isWeekend);
  const { dialogOpen, setDialogOpen, selectedSubject, selectedSubjectAttendance, handleSubjectClick } = useSubjectDialog(subjectCodeToName, subjectCodeToAttendance);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const minsNow = now.getHours() * 60 + now.getMinutes();
      setCountdown(ongoingClass ? (ongoingClass.endsAt - minsNow) * 60 - now.getSeconds() : null);
      setUpcomingCountdown(upcomingClass ? (upcomingClass.startsAt - minsNow) * 60 - now.getSeconds() : null);
    }, 1000);
    return () => clearInterval(interval);
  }, [ongoingClass, upcomingClass]);

  return (
    <div className="h-full flex flex-col gap-4 pb-6 max-w-7xl mx-auto w-full">
      {/* 🍏 Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Academic Timetable
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Weekly class schedule & classroom locations
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <CalendarSyncModal />
          <div className="flex items-center space-x-1 rounded-2xl glass-dock p-1 border border-white/10">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-shrink-0">
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
                    <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-white/10 border border-white/10 text-muted-foreground">
                      {ongoingClass.code}
                    </span>
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
                    <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-white/10 border border-white/10 text-muted-foreground">
                      {upcomingClass.code}
                    </span>
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
          <Card className="col-span-1 glass-card p-6 rounded-3xl border border-white/10 shadow-lg md:col-span-2 text-center">
            <Calendar className="w-6 h-6 text-muted-foreground/60 mx-auto mb-2" />
            <div className="text-base font-semibold text-foreground">No More Classes Today</div>
            <p className="text-xs text-muted-foreground mt-1">You're all done for the day!</p>
          </Card>
        )}
      </div>

      <SubjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        subject={selectedSubject}
        attendance={selectedSubjectAttendance}
      />

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
                  const dayData = timetable.find((t) => t.day === day);
                  return (
                    <tr key={day} className="align-top">
                      <td className="sticky left-0 z-[1] rounded-xl glass-panel p-2 text-xs font-bold text-foreground border border-white/20">
                        {trimText(day, 3)}
                      </td>
                      {TIME_SLOTS.map((timeSlot, idx) => {
                        const subjStr = dayData?.subjects[idx] || "";
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
  );
};

export default Timetable;