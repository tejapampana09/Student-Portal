"use client";
import { useState, useEffect, useRef } from "react";
import calendarData from "@/static/academic_calendar.json";
import { Calendar } from "lucide-react";

interface CalendarEvent {
  id: number;
  details: string;
  date: string;
  day: string;
}

interface Holiday {
  id: number;
  occasion: string;
  date: string;
  day: string;
}

const AcademicCalendar = () => {
  const [activeTab, setActiveTab] = useState<"odd" | "even" | "summer">("odd");
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const currentDate = new Date();

  const parseDate = (dateString: string): Date => {
    const [day, month, year] = dateString.split(".");
    return new Date(`${year}-${month}-${day}`);
  };

  const formatDate = (dateString: string): string => {
    return parseDate(dateString).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const isDatePassed = (dateString: string): boolean => parseDate(dateString) < currentDate;
  const isDateRangePassed = (dateRange: string): boolean => {
    const parts = dateRange.split(" - ");
    const endDate = parts[1] ? parseDate(parts[1]) : parseDate(parts[0]);
    return endDate < currentDate;
  };
  const isPassed = (date: string): boolean =>
    date.includes(" - ") ? isDateRangePassed(date) : isDatePassed(date);

  const tabEvents: CalendarEvent[] =
    activeTab === "odd"
      ? calendarData.oddSemesterData
      : activeTab === "even"
      ? calendarData.evenSemesterData
      : calendarData.summerTermData;

  const tabHolidays: Holiday[] =
    activeTab === "odd"
      ? calendarData.oddSemesterHolidays
      : activeTab === "even"
      ? calendarData.evenSemesterHolidays
      : [];

  useEffect(() => {
    const currentEventIndex = tabEvents.findIndex((item) => !isPassed(item.date));
    if (currentEventIndex !== -1 && scrollRefs.current[`${activeTab}-${currentEventIndex}`]) {
      setTimeout(() => {
        scrollRefs.current[`${activeTab}-${currentEventIndex}`]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 300);
    }
  }, [activeTab]);

  return (
    <div className="flex flex-col gap-4 pb-28 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Academic Calendar
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          AY 2025-26 schedule & official university holidays
        </p>
      </div>

      {/* Semester Switcher Tabs */}
      <div className="flex items-center gap-1.5 rounded-2xl bg-black/5 dark:bg-white/5 p-1 w-full sm:w-auto self-start">
        {(["odd", "even", "summer"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-semibold rounded-xl capitalize transition-all ${
              activeTab === tab
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab} Semester
          </button>
        ))}
      </div>

      {/* Events & Holidays Split List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Academic Events List */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Schedule of Events ({tabEvents.length})
          </p>
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40 max-h-[560px] overflow-y-auto">
            {tabEvents.map((item, index) => {
              const passed = isPassed(item.date);
              return (
                <div
                  key={item.id}
                  ref={(el) => {
                    scrollRefs.current[`${activeTab}-${index}`] = el;
                  }}
                  className={`flex items-start justify-between gap-3 px-4 py-3 transition-colors ${
                    passed ? "opacity-60 bg-black/[0.01] dark:bg-white/[0.01]" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-semibold leading-snug ${passed ? "text-muted-foreground" : "text-foreground"}`}>
                      {item.details}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{item.day}</p>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap ${
                      passed
                        ? "bg-muted text-muted-foreground"
                        : "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold"
                    }`}
                  >
                    {item.date.includes(" - ")
                      ? item.date.split(" - ").map((d) => formatDate(d)).join(" - ")
                      : formatDate(item.date)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Holidays List */}
        {tabHolidays.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              University Holidays ({tabHolidays.length})
            </p>
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40 max-h-[560px] overflow-y-auto">
              {tabHolidays.map((holiday) => {
                const passed = isDatePassed(holiday.date);
                return (
                  <div
                    key={holiday.id}
                    className={`flex items-start justify-between gap-3 px-4 py-3 transition-colors ${
                      passed ? "opacity-60 bg-black/[0.01] dark:bg-white/[0.01]" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold leading-snug ${passed ? "text-muted-foreground" : "text-foreground"}`}>
                        {holiday.occasion}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{holiday.day}</p>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap ${
                        passed
                          ? "bg-muted text-muted-foreground"
                          : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold"
                      }`}
                    >
                      {formatDate(holiday.date)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Important Notes */}
      {calendarData.importantNotes && calendarData.importantNotes.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Important Guidelines & Notes
          </p>
          <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
            {calendarData.importantNotes.map((note, idx) => (
              <li key={idx} className="leading-relaxed">
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AcademicCalendar;
