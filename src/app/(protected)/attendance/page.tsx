"use client";
import { useState, useEffect, useRef } from "react";
import API from "@/lib/api/axiosClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/utils/useToast";
import { useStudentData } from "@/context/StudentContext";
import SessionCard from "@/components/utils/SessionCard";
import { extractErrorMessage } from "@/shared/utils/functions";
import { useSessionValidator } from "@/hooks/auth/useSessionValidator";
import { useLocalStorageContext } from "@/context/LocalStorageContext";
import type { AttendanceShape } from "@/hooks/timetable/useSubjectMaps";
import AttendanceCard from "@/components/page/attendance/AttendanceCard";
import { mapManyToAttendanceShape } from "@/shared/utils/attendance";
import { History, ArrowUpDown, ArrowUp, ArrowDown, Loader2, RotateCcw, MoreVertical, BookOpen, Sparkles } from "lucide-react";
import { AttendanceHistoryDialog } from "@/components/page/attendance/AttendanceHistoryDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type SortOption = "default" | "ascending" | "descending";

interface AttendanceDetailItem {
  date: string;
  day: string;
  hour: string;
  subject: string;
  status: string;
}

const SORT_OPTIONS: { value: SortOption; label: string; icon: React.ReactNode }[] = [
  { value: "default",    label: "Default",    icon: <ArrowUpDown size={13} /> },
  { value: "ascending",  label: "Ascending",  icon: <ArrowUp size={13} /> },
  { value: "descending", label: "Descending", icon: <ArrowDown size={13} /> },
];

const sortSubjects = (subjects: AttendanceShape[], sort: SortOption): AttendanceShape[] => {
  if (sort === "ascending")  return [...subjects].sort((a, b) => a.percentage - b.percentage);
  if (sort === "descending") return [...subjects].sort((a, b) => b.percentage - a.percentage);
  return subjects;
};

function findMatchingSubject(itemSubject: string, subjects: AttendanceShape[]): AttendanceShape | undefined {
  if (!itemSubject) return undefined;
  const normItem = itemSubject.toUpperCase().replace(/[^A-Z0-9]/g, "");

  for (const s of subjects) {
    const normCode = s.subject_code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (normCode && (normItem.includes(normCode) || normCode.includes(normItem))) {
      return s;
    }
  }

  for (const s of subjects) {
    const normName = s.subject_name.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (normName && normName.length > 3 && (normItem.includes(normName) || normName.includes(normItem))) {
      return s;
    }
  }

  const numbersInItem = itemSubject.match(/\d{3,4}/g);
  if (numbersInItem) {
    for (const s of subjects) {
      for (const num of numbersInItem) {
        if (s.subject_code.includes(num)) {
          return s;
        }
      }
    }
  }

  return undefined;
}

const AttendanceDetails = () => {
  const { toast } = useToast();
  const { attendance, fetchFreshData, loading } = useStudentData();
  const { sessionValid, sessionId } = useSessionValidator();
  const { settings, updateSettings } = useLocalStorageContext();

  const [rawSubjects, setRawSubjects] = useState<AttendanceShape[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isPredicted, setIsPredicted] = useState(false);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const pendingCalculateRef = useRef(false);

  const currentSort = (settings.attendanceSortOption as SortOption) || "default";
  const displayedSubjects = sortSubjects(rawSubjects, currentSort);

  const handleReset = () => {
    setIsResetting(true);
    setRawSubjects(mapManyToAttendanceShape(attendance));
    setIsPredicted(false);
    setTimeout(() => {
      setIsResetting(false);
    }, 500);
  };

  useEffect(() => { 
    setRawSubjects(mapManyToAttendanceShape(attendance));
    setIsPredicted(false);
  }, [attendance]);

  const handleCalculateToday = async () => {
    if (!sessionValid || !sessionId) {
      pendingCalculateRef.current = true;
      setSessionDialogOpen(true);
      return;
    }

    setIsCalculating(true);
    try {
      const res = await API.post("/srmapi/attendance/details", { sessionId });
      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to fetch today's attendance details");
      }

      const items: AttendanceDetailItem[] = res.data.attendance?.data || [];
      if (items.length === 0) {
        toast({ title: "Today's Attendance", description: "No attendance records found for today yet." });
        setIsCalculating(false);
        return;
      }

      const baseSubjects = mapManyToAttendanceShape(attendance);
      const counts = new Map<string, { p: number; a: number }>();

      items.forEach((item) => {
        const matched = findMatchingSubject(item.subject, baseSubjects);
        if (matched) {
          const curr = counts.get(matched.subject_code) || { p: 0, a: 0 };
          if (item.status.toUpperCase() === "P") curr.p += 1;
          else if (item.status.toUpperCase() === "A") curr.a += 1;
          counts.set(matched.subject_code, curr);
        }
      });

      const updatedSubjects = baseSubjects.map((sub) => {
        const c = counts.get(sub.subject_code);
        if (!c || (c.p === 0 && c.a === 0)) return sub;

        const newAttended = sub.attended + c.p;
        const newAbsent = sub.absent + c.a;
        const newConducted = sub.conducted + c.p + c.a;
        const newPresentPct = newConducted === 0 ? 0 : (newAttended / newConducted) * 100;

        const odMlRate = (sub.od_ml_percentage || 0) / 100;
        const odMlEquivalent = odMlRate * newConducted;
        const effectiveAttended = newAttended + odMlEquivalent;
        const newPct = newConducted === 0 ? 0 : (effectiveAttended / newConducted) * 100;

        return {
          ...sub,
          attended: newAttended,
          absent: newAbsent,
          conducted: newConducted,
          present_percentage: Number(newPresentPct.toFixed(2)),
          percentage: Number(newPct.toFixed(2)),
        };
      });

      setRawSubjects(updatedSubjects);
      setIsPredicted(true);
      toast({
        title: "Prediction Applied",
        description: `Predicted today's attendance changes from ${items.length} class record(s).`,
      });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: extractErrorMessage(err) });
    } finally {
      setIsCalculating(false);
    }
  };

  const getSortIcon = (sort: SortOption) => {
    if (sort === "ascending") return <ArrowUp className="h-4 w-4" />;
    if (sort === "descending") return <ArrowDown className="h-4 w-4" />;
    return <ArrowUpDown className="h-4 w-4" />;
  };

  const handleCycleSort = () => {
    const sortOrder: SortOption[] = ["default", "ascending", "descending"];
    const currentIndex = sortOrder.indexOf(currentSort);
    const nextSort = sortOrder[(currentIndex + 1) % sortOrder.length];
    updateSettings({ attendanceSortOption: nextSort });
  };

  useEffect(() => {
    if (sessionValid && pendingCalculateRef.current) {
      pendingCalculateRef.current = false;
      setSessionDialogOpen(false);
      handleCalculateToday();
    }
  }, [sessionValid]);

  return (
    <div className="relative max-w-7xl mx-auto w-full pb-8">
      {/* 🍏 Top Controls & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Attendance & Course Analytics
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {displayedSubjects.length} enrolled subjects · 75% minimum threshold
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {isPredicted && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={isResetting}
              className="text-xs px-3 h-9 gap-1.5 rounded-xl font-medium shrink-0 glass-btn border-white/20"
            >
              <RotateCcw className={`h-3.5 w-3.5 shrink-0 ${isResetting ? "animate-spin" : ""}`} />
              <span>Reset</span>
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleCalculateToday}
            disabled={isCalculating}
            className="text-xs px-3.5 h-9 gap-1.5 rounded-xl font-semibold shrink-0 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-cyan-500/20 border border-white/20 transition-all active:scale-[0.98]"
          >
            {isCalculating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Calculate Today</span>
              </>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 flex items-center justify-center rounded-xl shrink-0 glass-btn border-white/20"
                title="Options"
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-card border border-white/20 rounded-2xl p-1.5 shadow-2xl backdrop-blur-2xl">
              <DropdownMenuItem
                onClick={() => setHistoryDialogOpen(true)}
                className="cursor-pointer gap-2 rounded-xl text-xs py-2 hover:bg-white/10"
              >
                <History className="h-3.5 w-3.5 text-cyan-400" />
                <span>Attendance History</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCycleSort}
            className="h-9 w-9 p-0 flex items-center justify-center rounded-xl shrink-0 glass-btn border-white/20"
            title={`Sort mode: ${currentSort}`}
          >
            {getSortIcon(currentSort)}
            <span className="sr-only">Cycle sort order</span>
          </Button>
        </div>
      </div>

      {displayedSubjects.length > 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40 overflow-hidden px-4">
          {displayedSubjects.map((subject) => (
            <AttendanceCard key={subject.subject_code} subject={subject} />
          ))}
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-[2rem] glass-card border border-white/20 p-10 text-center shadow-xl flex flex-col items-center justify-center max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
            <BookOpen className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-foreground">No Attendance Records Loaded</h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1 leading-relaxed">
            Attendance data is fetched live from the SRM student corner portal. Make sure your session is active or trigger a fresh sync.
          </p>
          <Button
            onClick={() => fetchFreshData()}
            disabled={loading}
            className="mt-5 h-10 px-5 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg border border-white/20"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
            <span>Sync From SRM Portal</span>
          </Button>
        </div>
      )}

      <AttendanceHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        onLoadToPage={(data) => {
          setRawSubjects(mapManyToAttendanceShape(data));
          setIsPredicted(true);
        }}
      />

      <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
        <DialogContent className="sm:max-w-md glass-card rounded-[2.5rem] border border-white/20 p-6 shadow-2xl backdrop-blur-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Session Connection Required</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Fetching today&apos;s live attendance updates requires an active SRM portal session.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <SessionCard />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttendanceDetails;
