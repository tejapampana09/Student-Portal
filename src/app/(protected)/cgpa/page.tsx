"use client";
import { X, Plus, Sparkles, RotateCcw } from "lucide-react";
import { toast } from "@/hooks/utils/useToast";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useStudentData } from "@/context/StudentContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Subject = {
  id: string;
  name: string;
  credits: number;
  grade: string;
};

const gradePoints = {
  O: 10,
  "A+": 9,
  A: 8,
  "B+": 7,
  B: 6,
  C: 5,
  P: 4,
  F: 0,
};

const romanMap = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
  VIII: 8,
  IX: 9,
  X: 10,
  XI: 11,
  XII: 12,
  XIII: 13,
  XIV: 14,
  XV: 15,
  XVI: 16,
  XVII: 17,
  XVIII: 18,
  XIX: 19,
  XX: 20,
} as const;

type GradeKey = keyof typeof gradePoints;
type RomanKey = keyof typeof romanMap;

const CGPACalculator = () => {
  const { profile, cgpa, subjects } = useStudentData();

  const currentCGPA = cgpa || "0.00";
  const extractSemester = (str: string) => {
    const key = str.split(" ")[0] as RomanKey;
    return Number(romanMap[key]) || 1;
  };

  const contextSubjects = subjects.map((s) => ({
    id: s.code,
    name: s.name,
    credits: Number(s.credit) || 0,
    grade: "",
  }));

  const [isManualMode, setIsManualMode] = useState(false);
  const [localSubjects, setLocalSubjects] = useState<Subject[]>([]);
  const [calculatedSGPA, setCalculatedSGPA] = useState("0.00");
  const [calculatedCGPA, setCalculatedCGPA] = useState(currentCGPA);

  useEffect(() => {
    if (!isManualMode && subjects.length > 0) {
      setLocalSubjects(contextSubjects.map((s) => ({ ...s, grade: "" })));
    }
  }, [subjects, isManualMode]);

  useEffect(() => {
    if (isManualMode) {
      setLocalSubjects([]);
    } else if (subjects.length > 0) {
      setLocalSubjects(contextSubjects.map((s) => ({ ...s, grade: "" })));
    }
    setCalculatedSGPA("0.00");
    setCalculatedCGPA(currentCGPA);
  }, [isManualMode]);

  const semesterNumber = extractSemester(profile?.semester || "");

  const addNewSubject = () => {
    const newId = `manual-${Date.now()}`;
    setLocalSubjects([...localSubjects, { id: newId, name: "", credits: 3, grade: "" }]);
  };

  const removeSubject = (id: string) => {
    setLocalSubjects(localSubjects.filter((subject) => subject.id !== id));
  };

  const updateSubject = (id: string, field: string, value: string | number) => {
    setLocalSubjects(
      localSubjects.map((subject) => (subject.id === id ? { ...subject, [field]: value } : subject))
    );
  };

  const calculateSGPA = () => {
    let totalCredits = 0;
    let totalGradePoints = 0;

    localSubjects.forEach((subject: any) => {
      if (subject.grade && subject.grade in gradePoints) {
        const points = gradePoints[subject.grade as GradeKey];
        totalCredits += Number(subject.credits);
        totalGradePoints += points * Number(subject.credits);
      }
    });

    return totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : "0.00";
  };

  const calculateCGPA = (sgpaValue: any) => {
    const sgpa = parseFloat(sgpaValue);
    const currentCGPAValue = Number(currentCGPA);
    const n = semesterNumber;
    if (extractSemester(profile?.semester || "") === 1) {
      return sgpa.toFixed(2);
    }
    const newCGPA = (currentCGPAValue * (n - 1) + sgpa) / n;
    return newCGPA.toFixed(2);
  };

  const resetSubjects = () => {
    if (isManualMode) {
      setLocalSubjects([]);
    } else {
      setLocalSubjects(contextSubjects.map((s) => ({ ...s, grade: "" })));
    }
    setCalculatedSGPA("0.00");
    setCalculatedCGPA(currentCGPA);
  };

  const performCalculation = () => {
    const newSGPA = calculateSGPA();
    if (Number(newSGPA) === 0.0) {
      toast({
        title: "Error",
        description: "Select at least one expected grade to run simulation.",
        variant: "destructive",
      });
      return;
    }
    setCalculatedSGPA(newSGPA);
    setCalculatedCGPA(calculateCGPA(newSGPA));
  };

  return (
    <div className="flex flex-col gap-4 pb-28 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            CGPA Simulator
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Grade predictions & target estimations {profile?.semester ? `· Sem ${profile.semester}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isManualMode && (
            <Button onClick={addNewSubject} size="sm" className="h-8 text-xs rounded-xl gap-1">
              <Plus className="h-3.5 w-3.5" /> Add Course
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsManualMode(!isManualMode)}
            className="h-8 text-xs rounded-xl"
          >
            {isManualMode ? "Use Auto Courses" : "Custom Mode"}
          </Button>
        </div>
      </div>

      {/* Projection Metric Summary Strip */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3.5 rounded-2xl border border-border/60 bg-card">
          <p className="text-[11px] font-medium text-muted-foreground">Current CGPA</p>
          <p className="text-xl sm:text-2xl font-bold font-mono text-foreground mt-0.5">
            {Number(currentCGPA) > 0 ? Number(currentCGPA).toFixed(2) : "N/A"}
          </p>
        </div>
        <div className="p-3.5 rounded-2xl border border-border/60 bg-card">
          <p className="text-[11px] font-medium text-muted-foreground">Simulated SGPA</p>
          <p className="text-xl sm:text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">
            {calculatedSGPA}
          </p>
        </div>
        <div className="p-3.5 rounded-2xl border border-border/60 bg-card">
          <p className="text-[11px] font-medium text-muted-foreground">Predicted CGPA</p>
          <p className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
            {Number(calculatedCGPA).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Course List */}
      {localSubjects.length > 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40">
          {localSubjects.map((subject) => (
            <div
              key={subject.id}
              className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-black/[0.01] dark:hover:bg-white/[0.01]"
            >
              {/* Subject Info or Input */}
              <div className="min-w-0 flex-1">
                {isManualMode ? (
                  <Input
                    value={subject.name}
                    onChange={(e) => updateSubject(subject.id, "name", e.target.value)}
                    placeholder="Subject title"
                    className="h-8 text-xs rounded-lg"
                  />
                ) : (
                  <>
                    <p className="text-[10px] font-mono text-muted-foreground/70 uppercase">
                      {subject.id}
                    </p>
                    <p className="text-sm font-semibold text-foreground leading-snug truncate mt-0.5">
                      {subject.name}
                    </p>
                  </>
                )}
              </div>

              {/* Credits & Grade Dropdown */}
              <div className="flex items-center gap-2.5 shrink-0">
                {isManualMode ? (
                  <Input
                    type="number"
                    value={subject.credits}
                    onChange={(e) => updateSubject(subject.id, "credits", Number(e.target.value) || 0)}
                    min={1}
                    max={6}
                    className="h-8 w-14 text-xs rounded-lg text-center font-mono"
                  />
                ) : (
                  <span className="text-xs font-mono font-semibold text-muted-foreground">
                    {subject.credits} Cr
                  </span>
                )}

                <Select
                  value={subject.grade}
                  onValueChange={(value) => updateSubject(subject.id, "grade", value)}
                >
                  <SelectTrigger className="h-8 w-24 text-xs rounded-lg font-mono">
                    <SelectValue placeholder="Grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="O">O (10 GP)</SelectItem>
                    <SelectItem value="A+">A+ (9 GP)</SelectItem>
                    <SelectItem value="A">A (8 GP)</SelectItem>
                    <SelectItem value="B+">B+ (7 GP)</SelectItem>
                    <SelectItem value="B">B (6 GP)</SelectItem>
                    <SelectItem value="C">C (5 GP)</SelectItem>
                    <SelectItem value="P">P (4 GP)</SelectItem>
                    <SelectItem value="F">F (0 GP)</SelectItem>
                  </SelectContent>
                </Select>

                {isManualMode && (
                  <button
                    onClick={() => removeSubject(subject.id)}
                    className="p-1 text-muted-foreground hover:text-red-500 rounded-lg transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 rounded-2xl border border-border/60 bg-card text-center text-muted-foreground text-xs max-w-sm mx-auto">
          {isManualMode
            ? "No subjects added. Click Add Course above to begin."
            : "No subjects found for current semester."}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          onClick={performCalculation}
          className="flex-1 h-9 rounded-xl font-semibold text-xs gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Calculate Prediction</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetSubjects}
          className="h-9 px-3 rounded-xl text-xs gap-1 text-muted-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset</span>
        </Button>
      </div>
    </div>
  );
};

export default CGPACalculator;
