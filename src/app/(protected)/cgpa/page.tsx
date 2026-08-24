"use client";
import { X, Plus } from "lucide-react";
import { toast } from "@/hooks/utils/useToast";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useStudentData } from "@/context/StudentContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Subject = {
    id: string;
    name: string;
    credits: number;
    grade: string;
};

const gradePoints = {
    "O": 10,
    "A+": 9,
    "A": 8,
    "B+": 7,
    "B": 6,
    "C": 5,
    "P": 4,
    "F": 0,
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
    XX: 20
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
        grade: ""
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
        setLocalSubjects([
            ...localSubjects,
            { id: newId, name: "", credits: 3, grade: "" }
        ]);
    };

    const removeSubject = (id: string) => {
        setLocalSubjects(localSubjects.filter((subject) => subject.id !== id));
    };

    const updateSubject = (id: string, field: string, value: string | number) => {
        setLocalSubjects(
            localSubjects.map((subject) =>
                subject.id === id ? { ...subject, [field]: value } : subject
            )
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
        if (Number(newSGPA) === 0.00) {
            toast({
                title: "Error",
                description: "Atleast Add One Credit For One Subject!",
                variant: "destructive",
            });
            return;
        }
        setCalculatedSGPA(newSGPA);
        setCalculatedCGPA(calculateCGPA(newSGPA));
    };

    return (
        <div className="space-y-4 pb-6">
            <Card className="glass-card rounded-2xl border border-white/25 dark:border-white/10 shadow-lg">
                <CardHeader className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <CardTitle className="text-xl font-bold">
                                {isManualMode ? "Manual Subjects Mode" : "Auto-Filled Subjects Mode"}
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm mt-0.5">
                                {isManualMode
                                    ? "Add your customized subjects, credit weightages, and expected grades"
                                    : "Subjects pre-populated from your semester registration — assign grades to simulate CGPA"}
                            </CardDescription>
                        </div>
                        <Button
                            variant={isManualMode ? "glass-primary" : "glass"}
                            onClick={() => setIsManualMode(!isManualMode)}
                            className="rounded-xl shrink-0 text-xs font-semibold h-9"
                        >
                            {isManualMode ? "Switch to Auto Mode" : "Switch to Manual Mode"}
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="glass-card rounded-2xl border border-white/20 dark:border-white/10 shadow-md">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-semibold text-muted-foreground">Current Semester</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{profile?.semester || "Not available"}</p>
                    </CardContent>
                </Card>

                <Card className="glass-card rounded-2xl border border-white/20 dark:border-white/10 shadow-md">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-semibold text-muted-foreground">Current Baseline CGPA</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <p className="text-2xl font-bold text-emerald-500 tabular-nums">{Number(currentCGPA).toFixed(2)}</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="glass-card rounded-2xl border border-white/25 dark:border-white/10 shadow-lg">
                <CardHeader className="p-4 sm:p-5 border-b border-white/10">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-lg font-bold">Subjects & Grades</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">Select expected grade for each course</CardDescription>
                        </div>
                        {isManualMode && (
                            <Button onClick={addNewSubject} size="sm" variant="glass-primary" className="rounded-xl text-xs h-8">
                                <Plus className="h-4 w-4 mr-1" /> Add Subject
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-5">
                    <div className="space-y-3">
                        <div className="grid grid-cols-12 gap-3 font-semibold text-xs text-muted-foreground border-b border-white/10 pb-2">
                            <div className="col-span-6">Subject</div>
                            <div className="col-span-2">Credits</div>
                            <div className="col-span-3">Grade</div>
                            <div className="col-span-1"></div>
                        </div>

                        {localSubjects.length > 0 ? (
                            localSubjects.map((subject) => (
                                <div
                                    key={subject.id}
                                    className="grid grid-cols-12 gap-3 items-center p-2 rounded-xl bg-white/10 dark:bg-white/5 border border-white/10 hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
                                >
                                    <div className="col-span-6">
                                        {isManualMode ? (
                                            <Input
                                                value={subject.name}
                                                onChange={(e) =>
                                                    updateSubject(subject.id, "name", e.target.value)
                                                }
                                                placeholder="Subject name"
                                                className="h-9 text-xs"
                                            />
                                        ) : (
                                            <span className="text-xs sm:text-sm font-semibold truncate block">{subject.name}</span>
                                        )}
                                    </div>

                                    <div className="col-span-2">
                                        {isManualMode ? (
                                            <Input
                                                type="number"
                                                value={subject.credits}
                                                onChange={(e) =>
                                                    updateSubject(subject.id, "credits", Number(e.target.value) || 0)
                                                }
                                                min={1}
                                                max={6}
                                                className="h-9 text-xs"
                                            />
                                        ) : (
                                            <span className="text-xs sm:text-sm font-bold text-primary pl-2">{subject.credits}</span>
                                        )}
                                    </div>

                                    <div className="col-span-3">
                                        <Select
                                            value={subject.grade}
                                            onValueChange={(value) =>
                                                updateSubject(subject.id, "grade", value)
                                            }
                                        >
                                            <SelectTrigger className="h-9 text-xs rounded-xl glass-input border-white/20">
                                                <SelectValue placeholder="Grade" />
                                            </SelectTrigger>
                                            <SelectContent className="glass-panel rounded-xl">
                                                <SelectItem value="O">O (10)</SelectItem>
                                                <SelectItem value="A+">A+ (9)</SelectItem>
                                                <SelectItem value="A">A (8)</SelectItem>
                                                <SelectItem value="B+">B+ (7)</SelectItem>
                                                <SelectItem value="B">B (6)</SelectItem>
                                                <SelectItem value="C">C (5)</SelectItem>
                                                <SelectItem value="P">P (4)</SelectItem>
                                                <SelectItem value="F">F (0)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="col-span-1 flex justify-end">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeSubject(subject.id)}
                                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-6 text-muted-foreground text-sm">
                                {isManualMode ? (
                                    <p>No subjects added yet. Click &quot;Add Subject&quot; above to begin.</p>
                                ) : (
                                    <p>No subjects found for current semester.</p>
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card className="glass-card rounded-2xl border border-white/25 dark:border-white/10 shadow-xl overflow-hidden">
                <CardContent className="p-5 sm:p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="glass-panel p-4 rounded-xl text-center border border-white/20">
                            <div className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{calculatedSGPA}</div>
                            <div className="text-xs text-muted-foreground font-semibold mt-1">Simulated SGPA</div>
                        </div>
                        <div className="glass-panel p-4 rounded-xl text-center border border-white/20">
                            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-500">{Number(calculatedCGPA).toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground font-semibold mt-1">Predicted CGPA</div>
                        </div>
                        <div className="glass-panel p-4 rounded-xl text-center border border-white/20">
                            <div className="text-2xl sm:text-3xl font-extrabold text-foreground">
                                {localSubjects.reduce((sum, s) => sum + Number(s.credits), 0)}
                            </div>
                            <div className="text-xs text-muted-foreground font-semibold mt-1">Total Credits</div>
                        </div>
                        <div className="glass-panel p-4 rounded-xl text-center border border-white/20">
                            <div className="text-2xl sm:text-3xl font-extrabold text-primary">
                                {localSubjects.filter((s) => s.grade).length}/{localSubjects.length}
                            </div>
                            <div className="text-xs text-muted-foreground font-semibold mt-1">Graded / Total</div>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
                        <Button
                            onClick={performCalculation}
                            variant="glass-primary"
                            className="w-full sm:w-auto h-11 px-8 rounded-xl font-bold shadow-lg shadow-indigo-500/25"
                        >
                            Calculate SGPA & Predicted CGPA
                        </Button>
                        <Button
                            variant="glass"
                            onClick={resetSubjects}
                            className="w-full sm:w-auto h-11 px-6 rounded-xl font-semibold"
                        >
                            Reset Grades
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default CGPACalculator;