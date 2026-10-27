"use client";
import { RotateCcw, AlertTriangle, Calculator } from "lucide-react";
import AttendanceDialog from "./OdMlDialog";
import { Button } from "@/components/ui/button";
import SimulationDialog from "./SimulationDialog";
import { useState, useEffect } from "react";

export interface Subject {
  subject_code: string;
  subject_name: string;
  attended: number;
  conducted: number;
  od_ml_taken: number;
  od_ml_percentage: number;
  present_percentage: number;
  percentage: number;
  absent: number;
}

const AttendanceCard = ({ subject }: { subject: Subject }) => {
  const [simulatedBunks, setSimulatedBunks] = useState(0);
  const [futureAttendedClasses, setFutureAttendedClasses] = useState(0);
  const [simulatedPercentage, setSimulatedPercentage] = useState(0);
  const [classesNeeded, setClassesNeeded] = useState(0);
  const [remainingBunks, setRemainingBunks] = useState(0);
  const [absentClasses, setAbsentClasses] = useState(0);
  const [isRotating, setIsRotating] = useState(false);
  const [bunksDialogOpen, setBunksDialogOpen] = useState(false);
  const [futureDialogOpen, setFutureDialogOpen] = useState(false);

  useEffect(() => {
    setSimulatedPercentage(subject.percentage);
  }, [subject]);

  useEffect(() => {
    const odMlRate = (subject.od_ml_percentage || 0) / 100;
    const totalConducted = subject.conducted + simulatedBunks + futureAttendedClasses;
    const totalAttended = subject.attended + futureAttendedClasses;
    const odMlEquivalentClasses = odMlRate * totalConducted;
    const totalEffectiveAttended = totalAttended + odMlEquivalentClasses;
    const effectivePercentage =
      totalConducted === 0 ? 0 : (totalEffectiveAttended / totalConducted) * 100;
    setSimulatedPercentage(effectivePercentage);
    const absent = totalConducted - totalAttended;
    setAbsentClasses(absent);
    const remaining = Math.floor(
      (0.25 * totalConducted - (totalConducted - totalEffectiveAttended)) / 0.75
    );
    setRemainingBunks(remaining > 0 ? remaining : 0);
    if (effectivePercentage >= 75 || totalConducted === 0) {
      setClassesNeeded(0);
    } else {
      const needed = Math.ceil(
        (0.75 * totalConducted - totalEffectiveAttended) / (0.25 + odMlRate)
      );
      setClassesNeeded(needed > 0 ? needed : 0);
    }
  }, [simulatedBunks, futureAttendedClasses, subject]);

  const handlePlanBunks = (bunks: number) => setSimulatedBunks(bunks);
  const handleFutureAttendance = (futureAttend: number) => setFutureAttendedClasses(futureAttend);
  const handleRevertChanges = () => {
    setIsRotating(true);
    setSimulatedBunks(0);
    setFutureAttendedClasses(0);
    setTimeout(() => setIsRotating(false), 600);
  };

  const displayedTotal = subject.conducted + simulatedBunks + futureAttendedClasses;
  const displayedAttended = subject.attended + futureAttendedClasses;
  const hasSimulations = simulatedBunks > 0 || futureAttendedClasses > 0;
  const isCritical = simulatedPercentage < 75;
  const isWarning = simulatedPercentage >= 75 && simulatedPercentage <= 80;

  const pct = Math.min(simulatedPercentage, 100);
  const barColor = isCritical
    ? "bg-red-500"
    : isWarning
    ? "bg-amber-500"
    : "bg-emerald-500";
  const pctColor = isCritical
    ? "text-red-500 dark:text-red-400"
    : isWarning
    ? "text-amber-500 dark:text-amber-400"
    : "text-emerald-500 dark:text-emerald-400";

  return (
    <>
      <div className="flex flex-col gap-3 py-4 border-b border-border/60 last:border-0">

        {/* Row 1 — Subject name + % badge + OD button */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-mono text-muted-foreground/70 mb-0.5 uppercase tracking-wide">
              {subject.subject_code}
              {hasSimulations && (
                <span className="ml-2 text-[10px] font-semibold text-blue-500 dark:text-blue-400 normal-case tracking-normal">
                  · simulated
                </span>
              )}
            </p>
            <p className="text-sm font-semibold text-foreground leading-snug" title={subject.subject_name}>
              {subject.subject_name}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            <span className={`text-sm font-bold tabular-nums ${pctColor}`}>
              {simulatedPercentage.toFixed(1)}%
            </span>
            <AttendanceDialog subject={subject} />
          </div>
        </div>

        {/* Row 2 — Progress bar */}
        <div className="space-y-1">
          <div className="w-full bg-muted/50 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{displayedAttended} attended · {absentClasses} absent</span>
            <span>{displayedTotal} total</span>
          </div>
        </div>

        {/* Row 3 — Quick stats inline */}
        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">OD/ML </span>
            <span className="font-semibold text-foreground">{subject.od_ml_taken ?? 0}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Safe bunks </span>
            <span className={`font-semibold ${remainingBunks > 0 ? "text-emerald-500 dark:text-emerald-400" : "text-muted-foreground"}`}>
              {remainingBunks}
            </span>
          </div>
          {isCritical && (
            <div className="flex items-center gap-1 ml-auto text-red-500 dark:text-red-400 font-semibold">
              <AlertTriangle className="h-3 w-3" />
              <span>Need +{classesNeeded} classes</span>
            </div>
          )}
        </div>

        {/* Row 4 — Simulator buttons */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
            <Calculator className="h-3 w-3" /> Simulate
          </span>
          <Button
            onClick={() => setBunksDialogOpen(true)}
            variant="ghost"
            size="sm"
            className="h-7 px-3 text-xs rounded-lg"
          >
            Plan Bunks
          </Button>
          <Button
            onClick={() => setFutureDialogOpen(true)}
            variant="ghost"
            size="sm"
            className="h-7 px-3 text-xs rounded-lg text-blue-500 dark:text-blue-400 hover:text-blue-600"
          >
            Target %
          </Button>
          {hasSimulations && (
            <button
              onClick={handleRevertChanges}
              className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className={`h-3 w-3 ${isRotating ? "animate-spin" : ""}`} />
              Reset
            </button>
          )}
        </div>
      </div>

      <SimulationDialog
        isOpen={bunksDialogOpen}
        onClose={() => setBunksDialogOpen(false)}
        onConfirm={handlePlanBunks}
        title="Plan Your Bunks"
        description="Simulate the impact of missing future classes on your attendance percentage."
        inputLabel="Number of classes to bunk"
        buttonText="Simulate Bunks"
      />
      <SimulationDialog
        isOpen={futureDialogOpen}
        onClose={() => setFutureDialogOpen(false)}
        onConfirm={handleFutureAttendance}
        title="Target Attendance Calculator"
        description="Simulate attending upcoming classes to boost your score above 75% or 80%."
        inputLabel="Number of future classes to attend"
        buttonText="Simulate Attendance"
      />
    </>
  );
};

export default AttendanceCard;
