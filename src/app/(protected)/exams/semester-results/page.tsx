"use client";

import React, { useEffect, useMemo, useState } from "react";
import API from "@/lib/api/axiosClient";
import SessionCard from "@/components/utils/SessionCard";
import { useToast } from "@/hooks/utils/useToast";
import { Button } from "@/components/ui/button";
import { useSessionValidator } from "@/hooks/auth/useSessionValidator";
import { AlertCircle, RefreshCw } from "lucide-react";

interface LedgerRow {
  semester: string;
  month_year: string;
  subject_code: string;
  subject_description: string;
  credit: string;
  grade: string;
  grade_points: string;
  result: string;
  attempt: string;
}

interface LedgerPayload {
  last_fetched: string;
  cgpa: string;
  rows: LedgerRow[];
}

interface LedgerResponse {
  success: boolean;
  message: string;
  semester_results: LedgerPayload;
}

const getGradeColor = (grade: string) => {
  const g = grade.toUpperCase().trim();
  if (g === "O") return "bg-amber-500/15 text-amber-500 dark:text-amber-400";
  if (g === "A+" || g === "A") return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  if (g === "B+" || g === "B") return "bg-sky-500/15 text-sky-600 dark:text-sky-400";
  if (g === "C" || g === "P") return "bg-blue-500/15 text-blue-600 dark:text-blue-400";
  if (g === "F") return "bg-red-500/15 text-red-600 dark:text-red-400";
  return "bg-muted text-muted-foreground";
};

const SemesterResultsPage: React.FC = () => {
  const { sessionValid, sessionId } = useSessionValidator();

  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [cgpa, setCgpa] = useState("");
  const [lastFetched, setLastFetched] = useState("");
  const [selectedSemester, setSelectedSemester] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const semesters = useMemo(() => {
    const values = Array.from(new Set(rows.map((r) => r.semester).filter(Boolean)));
    return values.sort((a, b) => Number(a) - Number(b));
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (selectedSemester === "all") return rows;
    return rows.filter((row) => row.semester === selectedSemester);
  }, [rows, selectedSemester]);

  const calculatedCgpa = useMemo(() => {
    const validRows = filteredRows.filter((row) => {
      const credit = Number(row.credit);
      const gradePoints = Number(row.grade_points);
      return !Number.isNaN(credit) && !Number.isNaN(gradePoints) && credit > 0;
    });

    if (validRows.length === 0) return "";

    const totalCredits = validRows.reduce((sum, row) => sum + Number(row.credit), 0);
    if (totalCredits <= 0) return "";

    const totalWeightedPoints = validRows.reduce(
      (sum, row) => sum + Number(row.credit) * Number(row.grade_points),
      0
    );

    return (totalWeightedPoints / totalCredits).toFixed(2);
  }, [filteredRows]);

  const fetchSemesterResults = async () => {
    if (!sessionValid) return;

    setIsLoading(true);
    setError("");
    try {
      const res = await API.post<LedgerResponse>("/srmapi/exams/semester-results", { sessionId });
      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to fetch semester results");
      }

      const payload = res.data.semester_results;
      setRows(payload.rows || []);
      setCgpa(payload.cgpa || "");
      setLastFetched(payload.last_fetched || "");
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Failed to fetch semester results");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sessionValid) {
      fetchSemesterResults();
    }
  }, [sessionValid]);

  return (
    <div className="flex flex-col gap-4 pb-28 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Semester Results
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {lastFetched ? `Updated: ${lastFetched}` : "Official academic grades & credits"}
          </p>
        </div>

        {sessionValid && (
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchSemesterResults}
            disabled={isLoading}
            className="h-8 gap-1.5 text-xs rounded-xl"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        )}
      </div>

      {!sessionValid && <SessionCard />}

      {error && sessionValid && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center gap-2 text-red-500 dark:text-red-400 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {sessionValid && !isLoading && !error && (
        <div className="space-y-4">
          {/* Semester Selector Pill Bar */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedSemester("all")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                selectedSemester === "all"
                  ? "bg-foreground text-background shadow-sm"
                  : "bg-black/5 dark:bg-white/5 text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({rows.length})
            </button>
            {semesters.map((semester) => (
              <button
                key={semester}
                onClick={() => setSelectedSemester(semester)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                  selectedSemester === semester
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-black/5 dark:bg-white/5 text-muted-foreground hover:text-foreground"
                }`}
              >
                Sem {semester}
              </button>
            ))}
          </div>

          {/* Quick GPA Summary Stats */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3.5 rounded-2xl border border-border/60 bg-card">
              <p className="text-[11px] font-medium text-muted-foreground">
                {selectedSemester === "all" ? "Weighted CGPA" : `Sem ${selectedSemester} SGPA`}
              </p>
              <p className="text-xl sm:text-2xl font-bold font-mono text-foreground mt-0.5">
                {calculatedCgpa || "-"}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl border border-border/60 bg-card">
              <p className="text-[11px] font-medium text-muted-foreground">College CGPA</p>
              <p className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                {cgpa || calculatedCgpa || "-"}
              </p>
            </div>
          </div>

          {/* Results List */}
          {rows.length === 0 ? (
            <div className="p-8 rounded-2xl border border-border/60 bg-card text-center text-muted-foreground text-xs max-w-sm mx-auto">
              No examination records found.
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="p-8 rounded-2xl border border-border/60 bg-card text-center text-muted-foreground text-xs max-w-sm mx-auto">
              No records found for the selected semester.
            </div>
          ) : (
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40">
              {filteredRows.map((row, index) => {
                const isPass = (row.result || "").toLowerCase().includes("pass");
                return (
                  <div
                    key={`${row.subject_code}-${row.month_year}-${index}`}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-black/[0.01] dark:hover:bg-white/[0.01]"
                  >
                    {/* Left: Code, Name, Meta */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-semibold text-muted-foreground/70 uppercase">
                          {row.subject_code}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          · Sem {row.semester}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-foreground leading-snug mt-0.5 truncate">
                        {row.subject_description}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {row.credit} Credits · {row.grade_points} GP · {row.month_year}
                      </p>
                    </div>

                    {/* Right: Grade Badge & Result */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg ${getGradeColor(row.grade)}`}>
                        {row.grade || "-"}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isPass
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-red-500/15 text-red-600 dark:text-red-400"
                        }`}
                      >
                        {row.result || "-"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SemesterResultsPage;
