"use client";
import { useEffect, useState } from "react";
import { AlertCircle, CalendarCheck, Clock, RefreshCw } from "lucide-react";
import API from "@/lib/api/axiosClient";
import { useToast } from "@/hooks/utils/useToast";
import { cn } from "@/shared/utils/functions";
import { Button } from "@/components/ui/button";
import SessionCard from "@/components/utils/SessionCard";

interface AttendanceItem {
  date: string;
  day: string;
  hour: string;
  subject: string;
  status: string;
}

type AttendanceCheckCardProps = {
  sessionValid: boolean;
  sessionId: string;
  refreshKey?: number;
};

export default function AttendanceCheckCard({ sessionValid, sessionId, refreshKey = 0 }: AttendanceCheckCardProps) {
  const { toast } = useToast();
  const [data, setData] = useState<AttendanceItem[]>([]);
  const [lastFetched, setLastFetched] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchAttendance = async () => {
    if (!sessionValid || !sessionId) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await API.post("/srmapi/attendance/details", { sessionId });
      if (!res.data.success) throw new Error(res.data.message || "Failed to fetch attendance");
      setData(res.data.attendance?.data || []);
      setLastFetched(res.data.attendance?.last_fetched || new Date().toLocaleString());
    } catch (err: any) {
      const message = err?.response?.data?.message || err.message || "Something went wrong";
      setError(message);
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sessionValid) fetchAttendance();
    else { setData([]); setLastFetched(""); setError(""); }
  }, [sessionValid, sessionId, refreshKey]);

  const isPresent = (status: string) => status.toUpperCase() === "P";

  return (
    <div className="flex flex-col gap-3">

      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Today&apos;s Attendance</p>
          {lastFetched && (
            <p className="text-[11px] text-muted-foreground mt-0.5">Updated: {lastFetched}</p>
          )}
        </div>
        {sessionValid && (
          <Button variant="ghost" size="sm" onClick={fetchAttendance} disabled={isLoading} className="h-8 gap-1.5 text-xs">
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            Refresh
          </Button>
        )}
      </div>

      {/* No session */}
      {!sessionValid && <SessionCard />}

      {/* Error */}
      {error && sessionValid && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading skeleton rows */}
      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3 border-b border-border/50 animate-pulse">
              <div className="h-3 w-3 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/4 rounded bg-muted" />
                <div className="h-2.5 w-1/2 rounded bg-muted" />
              </div>
              <div className="h-5 w-14 rounded-full bg-muted" />
            </div>
          ))}
        </div>
      )}

      {/* List */}
      {sessionValid && !isLoading && data.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40">
          {data.map((item, index) => (
            <div key={`${item.date}-${item.hour}-${index}`} className="flex items-center gap-3 px-4 py-3">
              {/* Status dot */}
              <span className={`h-2 w-2 rounded-full shrink-0 ${isPresent(item.status) ? "bg-emerald-500" : "bg-red-500"}`} />

              {/* Subject + meta */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.subject}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />{item.hour}
                  <span className="opacity-40">·</span>
                  {item.date} {item.day}
                </p>
              </div>

              {/* Badge */}
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${
                isPresent(item.status)
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/15 text-red-600 dark:text-red-400"
              }`}>
                {isPresent(item.status) ? "Present" : "Absent"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {sessionValid && !isLoading && data.length === 0 && !error && (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <CalendarCheck className="h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">No attendance records for today.</p>
        </div>
      )}
    </div>
  );
}
