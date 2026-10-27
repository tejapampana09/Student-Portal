"use client";

import React, { useEffect, useMemo, useState } from "react";
import API from "@/lib/api/axiosClient";
import SessionCard from "@/components/utils/SessionCard";
import { Button } from "@/components/ui/button";
import { useSessionValidator } from "@/hooks/auth/useSessionValidator";
import { AlertCircle, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";

interface SemesterItem {
  semester: number;
  label: string;
}

interface PastInternalRow {
  semester: string;
  code: string;
  description: string;
  subject_type: string;
  mark_obtained: string;
  max_mark: string;
}

interface PastInternalsPayload {
  last_fetched: string;
  semesters: SemesterItem[];
  rows: PastInternalRow[];
  selected_semester: number | null;
}

interface PastInternalsResponse {
  success: boolean;
  message: string;
  past_internals: PastInternalsPayload;
}

interface GroupedPastInternalRow {
  id: string;
  semester: string;
  code: string;
  description: string;
  total_mark_obtained: number;
  total_max_mark: number;
  components: PastInternalRow[];
}

const parseMarkValue = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const PastInternalsPage: React.FC = () => {
  const { sessionValid, sessionId } = useSessionValidator();

  const [semesters, setSemesters] = useState<SemesterItem[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  const [rows, setRows] = useState<PastInternalRow[]>([]);
  const [lastFetched, setLastFetched] = useState("");
  const [isLoadingSemesters, setIsLoadingSemesters] = useState(false);
  const [isLoadingRows, setIsLoadingRows] = useState(false);
  const [error, setError] = useState("");
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

  const groupedRows = useMemo<GroupedPastInternalRow[]>(() => {
    const groups = new Map<string, GroupedPastInternalRow>();

    rows.forEach((row) => {
      const key = `${row.semester}__${row.code}__${row.description}`;
      const existing = groups.get(key);

      if (!existing) {
        groups.set(key, {
          id: key,
          semester: row.semester,
          code: row.code,
          description: row.description,
          total_mark_obtained: parseMarkValue(row.mark_obtained),
          total_max_mark: parseMarkValue(row.max_mark),
          components: [row],
        });
        return;
      }

      existing.components.push(row);
      existing.total_mark_obtained += parseMarkValue(row.mark_obtained);
      existing.total_max_mark += parseMarkValue(row.max_mark);
    });

    return Array.from(groups.values());
  }, [rows]);

  const fetchSemesters = async () => {
    if (!sessionValid) return;
    setIsLoadingSemesters(true);
    setError("");

    try {
      const res = await API.post<PastInternalsResponse>("/srmapi/exams/past-internals", {
        sessionId,
      });

      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to fetch semesters");
      }

      const payload = res.data.past_internals;
      setSemesters(payload.semesters || []);
      setLastFetched(payload.last_fetched || "");

      const initialSemester = payload.selected_semester ?? payload.semesters?.[0]?.semester ?? null;
      setSelectedSemester(initialSemester);

      if (initialSemester) {
        await fetchSemesterRows(initialSemester);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Failed to load past internals");
    } finally {
      setIsLoadingSemesters(false);
    }
  };

  const fetchSemesterRows = async (semester: number) => {
    if (!sessionValid) return;
    setIsLoadingRows(true);
    setError("");

    try {
      const res = await API.post<PastInternalsResponse>("/srmapi/exams/past-internals", {
        sessionId,
        semester,
      });

      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to fetch marks");
      }

      const payload = res.data.past_internals;
      setRows(payload.rows || []);
      setLastFetched(payload.last_fetched || "");
      setSelectedSemester(payload.selected_semester ?? semester);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Failed to fetch semester rows");
    } finally {
      setIsLoadingRows(false);
    }
  };

  useEffect(() => {
    if (sessionValid) {
      fetchSemesters();
    }
  }, [sessionValid]);

  const toggleSubject = (id: string) => {
    setExpandedSubjects((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col gap-4 pb-28 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Past Internals
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {lastFetched ? `Updated: ${lastFetched}` : "Previous semesters continuous evaluation records"}
          </p>
        </div>

        {sessionValid && (
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchSemesters}
            disabled={isLoadingSemesters || isLoadingRows}
            className="h-8 gap-1.5 text-xs rounded-xl"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingSemesters ? "animate-spin" : ""}`} />
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

      {sessionValid && semesters.length > 0 && (
        <div className="space-y-4">
          {/* Semester Selector Pill Bar */}
          <div className="flex flex-wrap gap-1.5">
            {semesters.map((item) => (
              <button
                key={item.semester}
                onClick={() => fetchSemesterRows(item.semester)}
                disabled={isLoadingRows}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                  selectedSemester === item.semester
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-black/5 dark:bg-white/5 text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Grouped Rows List */}
          {isLoadingRows ? (
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
          ) : groupedRows.length === 0 ? (
            <div className="p-8 rounded-2xl border border-border/60 bg-card text-center text-muted-foreground text-xs max-w-sm mx-auto">
              No mark records found for Semester {selectedSemester}.
            </div>
          ) : (
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40">
              {groupedRows.map((row) => {
                const isExpanded = !!expandedSubjects[row.id];
                return (
                  <div key={row.id} className="transition-colors hover:bg-black/[0.01] dark:hover:bg-white/[0.01]">
                    {/* Main Row */}
                    <div
                      onClick={() => row.components.length > 1 && toggleSubject(row.id)}
                      className={`flex items-center justify-between gap-3 px-4 py-3.5 ${
                        row.components.length > 1 ? "cursor-pointer" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-mono font-semibold text-muted-foreground/70 uppercase">
                          {row.code}
                        </span>
                        <p className="text-sm font-semibold text-foreground leading-snug truncate mt-0.5">
                          {row.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <p className="text-sm font-bold font-mono text-foreground">
                          {row.total_mark_obtained.toFixed(1)}
                          <span className="text-xs text-muted-foreground font-normal"> / {row.total_max_mark.toFixed(1)}</span>
                        </p>
                        {row.components.length > 1 && (
                          <div className="text-muted-foreground">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Sub components breakdown */}
                    {isExpanded && row.components.length > 1 && (
                      <div className="bg-black/[0.02] dark:bg-white/[0.02] px-4 py-3 border-t border-border/40">
                        <div className="divide-y divide-border/30 rounded-xl border border-border/40 overflow-hidden bg-card">
                          {row.components.map((comp, idx) => (
                            <div key={idx} className="flex items-center justify-between px-3 py-2 text-xs">
                              <span className="text-muted-foreground">{comp.subject_type}</span>
                              <span className="font-mono font-bold text-foreground">
                                {comp.mark_obtained} / {comp.max_mark}
                              </span>
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
        </div>
      )}
    </div>
  );
};

export default PastInternalsPage;
