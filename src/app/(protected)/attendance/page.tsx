"use client";
import { useState, useEffect, useRef } from "react";
import API from "@/lib/api/axiosClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/utils/useToast";
import { useStudentData } from "@/context/StudentContext";
import SessionCard from "@/components/utils/SessionCard";
import { extractErrorMessage } from "@/shared/utils/functions";
import { useSessionValidator } from "@/hooks/auth/useSessionValidator";
import { useScrollIndicator } from "@/hooks/utils/useScrollIndicator";
import { useLocalStorageContext } from "@/context/LocalStorageContext";
import type { AttendanceShape } from "@/hooks/timetable/useSubjectMaps";
import AttendanceCard from "@/components/page/attendance/AttendanceCard";
import { mapManyToAttendanceShape } from "@/shared/utils/attendance";
import { History, ArrowUpDown, ArrowUp, ArrowDown, Check, Loader2, RotateCcw, MoreVertical } from "lucide-react";
import { AttendanceHistoryDialog } from "@/components/page/attendance/AttendanceHistoryDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
  const { attendance } = useStudentData();
  const { sessionValid, sessionId } = useSessionValidator();
  const { settings, updateSettings } = useLocalStorageContext();
  const { ScrollIndicator } = useScrollIndicator();

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

        const odMlRate = sub.od_ml_percentage / 100;
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
      {/* 🍏 Apple Liquid Glass Header */}
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
              variant="glass"
              size="sm"
              onClick={handleReset}
              disabled={isResetting}
              className="text-xs px-3 h-8.5 gap-1.5 rounded-xl font-medium shrink-0"
            >
              <RotateCcw className={`h-3.5 w-3.5 shrink-0 ${isResetting ? "animate-spin" : ""}`} />
              <span>Reset</span>
            </Button>
          )}

          <Button
            variant="glass-primary"
            size="sm"
            onClick={handleCalculateToday}
            disabled={isCalculating}
            className="text-xs px-3.5 h-8.5 gap-1.5 rounded-xl font-semibold shrink-0 shadow-sm"
          >
            {isCalculating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                <span>Syncing...</span>
              </>
            ) : (
              <span>Calculate Today</span>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="glass"
                size="sm"
                className="h-8.5 w-8.5 p-0 flex items-center justify-center rounded-xl shrink-0"
                title="Options"
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-card border border-white/15 rounded-2xl p-1.5 shadow-2xl">
              <DropdownMenuItem
                onClick={() => setHistoryDialogOpen(true)}
                className="cursor-pointer gap-2 rounded-xl text-xs py-2"
              >
                <History className="h-3.5 w-3.5" />
                <span>Attendance History</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="glass"
            size="sm"
            onClick={handleCycleSort}
            className="h-8.5 w-8.5 p-0 flex items-center justify-center rounded-xl shrink-0"
            title={`Sort mode: ${currentSort}`}
          >
            {getSortIcon(currentSort)}
            <span className="sr-only">Cycle sort order</span>
          </Button>
        </div>
      </div>

      {displayedSubjects.length > 0 ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {displayedSubjects.map((subject) => (
            <AttendanceCard key={subject.subject_code} subject={subject} />
          ))}
        </div>
      ) : (
        <div className="text-center p-8 border rounded-lg">
          <p className="text-muted-foreground">No Subjects Found.</p>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Active Session Required</DialogTitle>
            <DialogDescription>
              Fetching today&apos;s attendance details requires an active SRM portal session. Please initiate a session to continue.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <SessionCard />
          </div>
        </DialogContent>
      </Dialog>

      <ScrollIndicator />
    </div>
  );
};

export default AttendanceDetails;