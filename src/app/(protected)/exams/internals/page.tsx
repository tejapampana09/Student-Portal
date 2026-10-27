"use client";
import { useToast } from "@/hooks/utils/useToast";
import { Button } from "@/components/ui/button";
import React, { useEffect, useState } from "react";
import API from "@/lib/api/axiosClient";
import SessionCard from "@/components/utils/SessionCard";
import { useSessionValidator } from "@/hooks/auth/useSessionValidator";
import { ChevronDown, ChevronUp, RefreshCw, AlertCircle } from "lucide-react";

interface Exam {
  name: string;
  conducted_obtained: string;
  conducted_max: string;
  converted_obtained: string;
  converted_max: string;
}

interface Subject {
  subject_code: string;
  subject_name: string;
  marks_obtained: string;
  max_marks: string;
  exams: Exam[];
}

interface InternalMarksResponse {
  success: boolean;
  message: string;
  internals: {
    last_fetched: string;
    subjects: Subject[];
  };
}

interface ProcessedAssessment {
  type: string;
  conducted: string;
  converted: string;
}

interface ProcessedSubject {
  code: string;
  name: string;
  totalMarksObtained: number;
  totalMaxMarks: number;
  assessments: ProcessedAssessment[];
}

const InternalMarks: React.FC = () => {
  const { sessionValid, sessionId } = useSessionValidator();

  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [data, setData] = useState<ProcessedSubject[]>([]);
  const [lastFetched, setLastFetched] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const processSubjects = (subjects: Subject[]): ProcessedSubject[] => {
    return subjects.map((subject) => ({
      code: subject.subject_code,
      name: subject.subject_name,
      totalMarksObtained: Number(subject.marks_obtained) || 0,
      totalMaxMarks: Number(subject.max_marks) || 0,
      assessments: subject.exams.map((exam) => ({
        type: exam.name,
        conducted:
          exam.conducted_obtained || exam.conducted_max
            ? `${exam.conducted_obtained}${exam.conducted_max ? " / " + exam.conducted_max : ""}`
            : "",
        converted:
          exam.converted_obtained || exam.converted_max
            ? `${exam.converted_obtained}${exam.converted_max ? " / " + exam.converted_max : ""}`
            : "",
      })),
    }));
  };

  const fetchInternals = async () => {
    if (!sessionId) return;
    setIsLoading(true);
    setError("");

    try {
      const response = await API.post<InternalMarksResponse>("/srmapi/exams/internals", { sessionId });
      if (response.data.success) {
        setData(processSubjects(response.data.internals.subjects));
        setLastFetched(response.data.internals.last_fetched);
      } else {
        setError(response.data.message || "Failed to fetch internals");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to fetch internals");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sessionValid && sessionId) {
      fetchInternals();
    }
  }, [sessionValid, sessionId]);

  const toggleSubject = (code: string) => {
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-4 pb-28 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Internal Marks
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {lastFetched ? `Updated: ${lastFetched}` : "Continuous internal evaluations"}
          </p>
        </div>

        {sessionValid && (
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchInternals}
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

      {isLoading && (
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3.5 animate-pulse">
              <div className="space-y-1.5 flex-1">
                <div className="h-2.5 w-20 bg-muted rounded" />
                <div className="h-3.5 w-44 bg-muted rounded" />
              </div>
              <div className="h-4 w-14 bg-muted rounded" />
            </div>
          ))}
        </div>
      )}

      {sessionValid && !isLoading && data.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40">
          {data.map((subject) => {
            const isExpanded = expandedSubjects.has(subject.code);
            const percentage =
              subject.totalMaxMarks > 0 ? (subject.totalMarksObtained / subject.totalMaxMarks) * 100 : 0;
            return (
              <div key={subject.code} className="transition-colors hover:bg-black/[0.01] dark:hover:bg-white/[0.01]">
                {/* Clickable Row */}
                <div
                  onClick={() => toggleSubject(subject.code)}
                  className="flex items-center justify-between gap-3 px-4 py-3.5 cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-mono text-muted-foreground/70 uppercase tracking-wide">
                      {subject.code}
                    </p>
                    <p className="text-sm font-semibold text-foreground leading-snug truncate">
                      {subject.name}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold font-mono text-foreground">
                        {subject.totalMarksObtained}
                        <span className="text-xs text-muted-foreground font-normal"> / {subject.totalMaxMarks}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium">
                        {percentage.toFixed(1)}% Score
                      </p>
                    </div>
                    <div className="text-muted-foreground">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </div>

                {/* Sub-breakdown */}
                {isExpanded && (
                  <div className="bg-black/[0.02] dark:bg-white/[0.02] px-4 py-3 border-t border-border/40">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Component Breakdown
                    </p>
                    <div className="divide-y divide-border/30 rounded-xl border border-border/40 overflow-hidden bg-card">
                      {subject.assessments.map((a, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                          <span className="font-medium text-foreground truncate pr-2">{a.type}</span>
                          <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground shrink-0">
                            {a.conducted && <span>Conducted: <strong className="text-foreground">{a.conducted}</strong></span>}
                            {a.converted && <span>Converted: <strong className="text-blue-500 dark:text-blue-400 font-bold">{a.converted}</strong></span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {sessionValid && !isLoading && data.length === 0 && !error && (
        <div className="p-8 rounded-2xl border border-border/60 bg-card text-center text-muted-foreground text-xs max-w-sm mx-auto">
          No internal marks published yet for this semester.
        </div>
      )}
    </div>
  );
};

export default InternalMarks;
