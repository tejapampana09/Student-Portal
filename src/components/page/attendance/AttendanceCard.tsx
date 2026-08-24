"use client";
import { RotateCcw } from "lucide-react";
import AttendanceDialog from "./OdMlDialog";
import { Button } from "@/components/ui/button";
import SimulationDialog from "./SimulationDialog";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    const odMlRate = subject.od_ml_percentage / 100;

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

  const handlePlanBunks = (bunks: number) => {
    setSimulatedBunks(bunks);
  };

  const handleFutureAttendance = (futureAttend: number) => {
    setFutureAttendedClasses(futureAttend);
  };

  const handleRevertChanges = () => {
    setIsRotating(true);
    setSimulatedBunks(0);
    setFutureAttendedClasses(0);
    setTimeout(() => setIsRotating(false), 600);
  };

  const displayedTotal = subject.conducted + simulatedBunks + futureAttendedClasses;
  const displayedAttended = subject.attended + futureAttendedClasses;
  const hasSimulations = simulatedBunks > 0 || futureAttendedClasses > 0;

  return (
    <>
      <Card className="glass-card mb-4 rounded-3xl border border-white/10 shadow-lg overflow-hidden transition-all duration-300 hover:border-white/20">
        <CardHeader className="pb-3 px-5 pt-5 border-b border-white/10">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base font-bold text-foreground truncate leading-snug tracking-tight">
                {subject.subject_name}
              </CardTitle>
              <p className="text-muted-foreground text-xs font-mono mt-0.5 opacity-80">{subject.subject_code}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full font-mono border backdrop-blur-md ${
                  simulatedPercentage < 75
                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                    : simulatedPercentage <= 80
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                }`}
              >
                {simulatedPercentage.toFixed(1)}%
              </span>
              <AttendanceDialog subject={subject} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3.5 p-5">
          <div>
            <div className="w-full bg-white/10 dark:bg-white/[0.08] rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  simulatedPercentage < 75
                    ? "bg-red-500"
                    : simulatedPercentage <= 80
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(simulatedPercentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[11px] text-muted-foreground">
              <span>Required: 75%</span>
              <span className="font-semibold text-foreground">Current: {simulatedPercentage.toFixed(1)}%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/5 border border-white/5 p-2.5 rounded-2xl">
              <p className="text-[11px] font-medium text-muted-foreground">Attended</p>
              <p className="text-base font-bold text-foreground mt-0.5">{displayedAttended}</p>
            </div>
            <div className="bg-white/5 border border-white/5 p-2.5 rounded-2xl">
              <p className="text-[11px] font-medium text-muted-foreground">Absent</p>
              <p className="text-base font-bold text-muted-foreground mt-0.5">{absentClasses}</p>
            </div>
            <div className="bg-white/5 border border-white/5 p-2.5 rounded-2xl">
              <p className="text-[11px] font-medium text-muted-foreground">Total Classes</p>
              <p className="text-base font-bold text-foreground mt-0.5">{displayedTotal}</p>
            </div>
            <div className="bg-white/5 border border-white/5 p-2.5 rounded-2xl">
              <p className="text-[11px] font-medium text-muted-foreground">Safe Bunks</p>
              <p className={`text-base font-bold mt-0.5 ${remainingBunks > 0 ? "text-emerald-400" : "text-muted-foreground"}`}>
                {remainingBunks}
              </p>
            </div>
            {simulatedPercentage < 75 && (
              <div className="bg-red-500/10 border border-red-500/20 p-2.5 rounded-2xl col-span-2">
                <p className="text-[11px] text-red-400 font-medium">Classes Needed for 75%</p>
                <p className="text-base font-bold text-red-400 mt-0.5">{classesNeeded} classes</p>
              </div>
            )}
          </div>

          <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-semibold text-muted-foreground">Bunk Simulator</p>
              {hasSimulations && (
                <Button
                  onClick={handleRevertChanges}
                  variant="ghost"
                  size="sm"
                  className={`p-1 h-6 w-6 rounded-lg ${isRotating ? "animate-spin" : ""}`}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setBunksDialogOpen(true)}
                variant="glass"
                className="flex-1 text-xs h-8 rounded-xl font-medium"
              >
                Plan Bunks
              </Button>
              <Button
                onClick={() => setFutureDialogOpen(true)}
                variant="glass-primary"
                className="flex-1 text-xs h-8 rounded-xl font-medium"
              >
                Target %
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <SimulationDialog
        isOpen={bunksDialogOpen}
        onClose={() => setBunksDialogOpen(false)}
        onConfirm={handlePlanBunks}
        title="Plan Your Bunks"
        description="Enter the number of classes you want to bunk."
        inputLabel="Number of classes to bunk"
        buttonText="Apply Bunks"
      />

      <SimulationDialog
        isOpen={futureDialogOpen}
        onClose={() => setFutureDialogOpen(false)}
        onConfirm={handleFutureAttendance}
        title="Future Attendance"
        description="Enter the number of classes you plan to attend in the future."
        inputLabel="Number of classes to attend"
        buttonText="Apply Future Attendance"
      />
    </>
  );
};

export default AttendanceCard;