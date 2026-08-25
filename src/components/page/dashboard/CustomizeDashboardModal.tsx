"use client";

import React from "react";
import { SlidersHorizontal, Eye, EyeOff, RotateCcw, Check, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export interface DashboardWidgetsConfig {
  attendanceRing: boolean;
  upcomingClass: boolean;
  cgpaCard: boolean;
  timetable: boolean;
  courseBreakdown: boolean;
  upcomingHolidays: boolean;
  studentEmails: boolean;
}

export const DEFAULT_WIDGETS_CONFIG: DashboardWidgetsConfig = {
  attendanceRing: true,
  upcomingClass: true,
  cgpaCard: true,
  timetable: true,
  courseBreakdown: true,
  upcomingHolidays: true,
  studentEmails: true,
};

interface Props {
  config: DashboardWidgetsConfig;
  onChange: (newConfig: DashboardWidgetsConfig) => void;
}

const WIDGET_DEFINITIONS: Array<{
  key: keyof DashboardWidgetsConfig;
  title: string;
  description: string;
  icon: string;
}> = [
  {
    key: "attendanceRing",
    title: "Attendance Overview Ring",
    description: "Overall percentage ring and total safe bunks summary",
    icon: "🎯",
  },
  {
    key: "upcomingClass",
    title: "Live / Upcoming Class Hero",
    description: "Real-time next lecture, room venue, and faculty details",
    icon: "📍",
  },
  {
    key: "cgpaCard",
    title: "CGPA & Academic Stats",
    description: "Cumulative GPA, total credits, and semester standing",
    icon: "🎓",
  },
  {
    key: "timetable",
    title: "Today's Schedule & Timetable",
    description: "Full day lecture schedule with class status & times",
    icon: "📅",
  },
  {
    key: "courseBreakdown",
    title: "Course Attendance Cards",
    description: "Subject-wise attendance breakdown and bunk calculator",
    icon: "📚",
  },
  {
    key: "upcomingHolidays",
    title: "Upcoming Holidays & Long Weekends",
    description: "Countdown to academic holidays and festive breaks",
    icon: "🏖️",
  },
  {
    key: "studentEmails",
    title: "Student Email & Circulars Feed",
    description: "Live CDC placement notices, circulars, and exam updates",
    icon: "📬",
  },
];

export const CustomizeDashboardModal: React.FC<Props> = ({ config, onChange }) => {
  const [open, setOpen] = React.useState(false);

  const handleToggle = (key: keyof DashboardWidgetsConfig, value: boolean) => {
    const updated = { ...config, [key]: value };
    onChange(updated);
  };

  const handleShowAll = () => {
    onChange(DEFAULT_WIDGETS_CONFIG);
  };

  const activeCount = Object.values(config).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5 sm:px-3 rounded-full border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-foreground backdrop-blur-md gap-1.5 shadow-sm transition-all hover:scale-105 shrink-0"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>Customize</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
            {activeCount}/7
          </span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md w-[92vw] sm:w-full glass-card border-white/15 p-6 rounded-3xl backdrop-blur-2xl shadow-2xl">
        <DialogHeader className="text-left space-y-1 pb-2 border-b border-white/10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Customize Dashboard
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShowAll}
              className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground rounded-lg gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Show All
            </Button>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Choose which cards and widgets to display on your personalized dashboard.
          </DialogDescription>
        </DialogHeader>

        {/* Toggle List */}
        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1 py-2 divide-y divide-white/5">
          {WIDGET_DEFINITIONS.map((w) => {
            const isChecked = config[w.key] ?? true;
            return (
              <div
                key={w.key}
                className="flex items-center justify-between pt-2.5 first:pt-0 gap-3 group"
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-lg select-none pt-0.5">{w.icon}</span>
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      {w.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 leading-relaxed">
                      {w.description}
                    </p>
                  </div>
                </div>

                <Switch
                  checked={isChecked}
                  onCheckedChange={(val) => handleToggle(w.key, val)}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Check className="h-3 w-3 text-emerald-400" />
            Auto-saved instantly to your device
          </span>
          <Button
            size="sm"
            onClick={() => setOpen(false)}
            className="h-7 px-3 text-xs rounded-xl font-medium"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
