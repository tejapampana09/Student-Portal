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
    <div className="h-full flex flex-col gap-3 pb-4">
      <div className="flex justify-end">
        <div className="flex items-center space-x-1 rounded-2xl glass-dock p-1 border border-white/20">
          {(["old", "new"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => updateSettings({ timeTableViewMode: mode })}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 ${
                viewMode === mode
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/10"
              }`}
            >
              {mode === "old" ? "Detailed View" : "Minimal View"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-shrink-0">
        {(ongoingClass || upcomingClass) ? (
          <>
            <Card className={`glass-card p-4 rounded-2xl border shadow-lg ${ongoingClass ? "border-emerald-500/40 bg-emerald-500/10 shadow-emerald-500/10" : "border-white/20 dark:border-white/10"}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 mb-2">
                  <Play className={`w-4 h-4 md:w-5 md:h-5 ${ongoingClass ? "text-emerald-500 animate-pulse" : "text-muted-foreground"}`} />
                  <span className="text-sm md:text-base font-bold text-foreground">Ongoing Class</span>
                </div>
                {ongoingClass && countdown !== null && (
                  <Badge variant="glass-success" className="text-xs px-2.5 py-0.5 rounded-full font-mono">{formatCountdown(countdown)}</Badge>
                )}
              </div>
              {ongoingClass ? (
                <div className="space-y-1.5">
                  <div className="font-bold text-base line-clamp-1">{ongoingClass.name}</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="glass" className="font-mono text-xs">{ongoingClass.code}</Badge>
                    <span className="text-muted-foreground font-semibold">{ongoingClass.timeSlot}</span>
                  </div>
                  {ongoingClass.venue && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground/90">
                      <MapPin className="w-3.5 h-3.5 text-primary/70" /><span>{ongoingClass.venue}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-2"><Badge variant="outline" className="text-xs">Free Period</Badge></div>
              )}
            </Card>

            <Card className={`glass-card p-4 rounded-2xl border shadow-lg ${upcomingClass ? "border-primary/40 bg-primary/10 shadow-primary/10" : "border-white/20 dark:border-white/10"}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className={`w-4 h-4 md:w-5 md:h-5 ${upcomingClass ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-sm md:text-base font-bold text-foreground">Next Up</span>
                </div>
                {upcomingClass && upcomingCountdown !== null && (
                  <Badge variant="glass-info" className="text-xs px-2.5 py-0.5 rounded-full font-mono">{formatCountdown(upcomingCountdown)}</Badge>
                )}
              </div>
              {upcomingClass ? (
                <div className="space-y-1.5">
                  <div className="font-bold text-base line-clamp-1">{upcomingClass.name}</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="glass" className="font-mono text-xs">{upcomingClass.code}</Badge>
                    <span className="text-muted-foreground font-semibold">{upcomingClass.timeSlot}</span>
                  </div>
                  {upcomingClass.venue && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground/90">
                      <MapPin className="w-3.5 h-3.5 text-primary/70" /><span>{upcomingClass.venue}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-2"><Badge variant="outline" className="text-xs">Free Period</Badge></div>
              )}
            </Card>
          </>
        ) : (
          <Card className="col-span-1 glass-card p-6 rounded-2xl border border-white/20 dark:border-white/10 shadow-lg md:col-span-2 text-center">
            <Calendar className="w-6 h-6 text-primary/60 mx-auto mb-2" />
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

      <Card className="glass-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/25 dark:border-white/10 shadow-xl">
        <CardHeader className="flex-shrink-0 border-b border-white/10 px-4 py-3.5">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg font-bold">
            <Clock className="w-4 h-4 md:w-5 md:h-5 text-primary" />
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