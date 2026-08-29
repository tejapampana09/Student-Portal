"use client";
import React, { useState } from "react";
import { Calendar, Download, ExternalLink, Check, Bell, ShieldCheck, Sparkles, Smartphone, CheckCircle2, Apple, Globe } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/utils/useToast";

interface CalendarSyncModalProps {
  trigger?: React.ReactNode;
}

export const CalendarSyncModal: React.FC<CalendarSyncModalProps> = ({ trigger }) => {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleDownloadICS = async () => {
    try {
      setDownloading(true);
      const res = await fetch("/api/calendar/export");
      if (!res.ok) throw new Error("Failed to generate calendar file");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "srmap-academic-schedule.ics";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast({
        title: "Calendar File Downloaded! 📅",
        description: "Open the downloaded .ics file to automatically add all classes to Apple or Google Calendar.",
      });
    } catch (err: any) {
      toast({
        title: "Export Failed",
        description: err?.message || "Could not generate calendar export.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenGoogleCalendar = () => {
    window.open("https://calendar.google.com/calendar/r/settings/export", "_blank");
    toast({
      title: "Google Calendar Import Guide 🌐",
      description: "Download the .ics file below, then drop it into Google Calendar Settings -> Import & Export.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 rounded-xl text-xs font-semibold border-sky-500/30 text-sky-300 hover:bg-sky-500/10 gap-1.5 shadow-sm"
          >
            <Calendar className="h-3.5 w-3.5 text-sky-400" />
            Sync to Calendar
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md w-[92vw] sm:w-full border-white/15 p-6 rounded-3xl backdrop-blur-2xl shadow-2xl">
        <DialogHeader className="text-left pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Sync Timetable to Phone Calendar
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Apple Calendar • Google Calendar • Outlook (.ics)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Sync features list */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Full Semester Recurring Class Timings</span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Classroom Venues (e.g. <em>ALH 203</em>) & Subject Names</span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Built-in <strong>10-minute alarms</strong> before each class</span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Official SRMAP Academic Holidays auto-marked</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <Button
              onClick={handleDownloadICS}
              disabled={downloading}
              className="w-full h-11 rounded-2xl font-bold text-xs bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-all"
            >
              <Download className="h-4 w-4" />
              {downloading ? "Generating .ics..." : "Download Apple & Phone Calendar (.ics)"}
            </Button>

            <Button
              onClick={handleOpenGoogleCalendar}
              variant="outline"
              className="w-full h-9 rounded-2xl text-xs font-semibold border-white/15 hover:bg-white/10 text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 transition-all"
            >
              <Globe className="h-3.5 w-3.5 text-sky-400" />
              Import into Google Calendar Web
              <ExternalLink className="h-3 w-3 opacity-60" />
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground/80 text-center leading-tight">
            💡 <strong>Pro-Tip for iPhone/Mac:</strong> Tap the download button and tap "Add All" when prompted by Apple Calendar.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
