"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Calendar as CalendarIcon, Sparkles, PartyPopper, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import academicCalendar from "@/static/academic_calendar.json";
import { DateTime } from "luxon";

interface Holiday {
  id: number;
  occasion: string;
  date: string; // "26.08.2026" or "14.09.2026"
  day: string;
}

export default function UpcomingHolidaysCard() {
  const router = useRouter();

  const { upcomingHolidays, nextHoliday, daysUntilNext } = useMemo(() => {
    const now = DateTime.now().setZone("Asia/Kolkata").startOf("day");

    const allHolidays: Holiday[] = [
      ...(academicCalendar.oddSemesterHolidays || []),
      ...(academicCalendar.evenSemesterHolidays || []),
    ];

    // Parse and sort upcoming holidays
    const parsed = allHolidays
      .map((h) => {
        // format: "DD.MM.YYYY"
        const [d, m, y] = h.date.split(".").map(Number);
        const dt = DateTime.local(y, m, d, { zone: "Asia/Kolkata" }).startOf("day");
        return {
          ...h,
          dt,
          diffDays: Math.round(dt.diff(now, "days").days),
        };
      })
      .filter((h) => h.diffDays >= 0) // only today or future
      .sort((a, b) => a.diffDays - b.diffDays);

    const next = parsed[0] || null;
    const daysUntil = next ? next.diffDays : null;

    return {
      upcomingHolidays: parsed.slice(0, 4),
      nextHoliday: next,
      daysUntilNext: daysUntil,
    };
  }, []);

  if (!nextHoliday) return null;

  const isLongWeekend = nextHoliday.day === "Friday" || nextHoliday.day === "Monday";

  return (
    <div className="glass-card rounded-3xl p-6 flex flex-col justify-between border border-white/10 shadow-lg relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <PartyPopper className="h-4 w-4 text-purple-400" />
              Upcoming Holidays
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">SRMAP Academic Calendar 2026-27</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => router.push("/calender")}
            className="text-xs h-6 px-2 text-muted-foreground hover:text-foreground flex items-center gap-0.5"
          >
            All <ChevronRight className="h-3 w-3" />
          </Button>
        </div>

        {/* 🌟 Highlight Next Imminent Holiday */}
        <div className="mb-3.5 p-3.5 rounded-2xl bg-gradient-to-r from-purple-600/15 via-indigo-600/10 to-blue-600/15 border border-purple-500/20 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-purple-400 flex items-center gap-1 uppercase tracking-wider">
              <Sparkles className="h-3 w-3" /> Next Holiday
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] px-2 py-0.5 font-bold ${
                daysUntilNext === 0
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse"
                  : daysUntilNext === 1
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-purple-500/20 text-purple-300 border-purple-500/30"
              }`}
            >
              {daysUntilNext === 0 ? "Today!" : daysUntilNext === 1 ? "Tomorrow!" : `In ${daysUntilNext} days`}
            </Badge>
          </div>

          <div className="mt-1.5 flex items-baseline justify-between">
            <h4 className="font-bold text-sm text-foreground truncate pr-2">{nextHoliday.occasion}</h4>
            <span className="text-xs text-muted-foreground shrink-0 font-medium">{nextHoliday.day}</span>
          </div>

          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-mono">{nextHoliday.date}</span>
            {isLongWeekend && (
              <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold">
                🎉 Long Weekend
              </span>
            )}
          </div>
        </div>

        {/* 📋 Upcoming List */}
        <div className="space-y-2">
          {upcomingHolidays.slice(1).map((h) => (
            <div
              key={h.id + h.date}
              className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"
            >
              <div className="min-w-0 flex-1 pr-2">
                <div className="text-xs font-semibold text-foreground truncate">{h.occasion}</div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5 font-mono">
                  <span>{h.date}</span>
                  <span>· {h.day}</span>
                </div>
              </div>

              <span className="text-[11px] font-semibold text-muted-foreground shrink-0 font-mono">
                {h.diffDays}d
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
