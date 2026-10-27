"use client";
import React from "react";
import { useStudentData } from "@/context/StudentContext";
import { User, MapPin, Sparkles, ExternalLink, Building } from "lucide-react";

const Subjects = () => {
  const { subjects } = useStudentData();

  return (
    <div className="flex flex-col gap-4 pb-28 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Enrolled Courses
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {subjects.length} courses · Faculty directory & classrooms
        </p>
      </div>

      {/* Community Contribution Banner */}
      <div className="rounded-xl border border-border/60 bg-card p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          <span>Help peers find faculty faster by contributing verified cabin numbers.</span>
        </div>
        <a
          href="https://docs.google.com/spreadsheets/u/1/d/1uaYRuUk1_XzHebkjX8gmJ-qbnhDnIK0F/edit?gid=1061184240#gid=1061184240"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0 self-start sm:self-auto"
        >
          <span>Contribute</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Courses List */}
      {subjects.length > 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40">
          {subjects.map((subj) => (
            <div
              key={subj.code}
              className="flex flex-col gap-2 px-4 py-3.5 transition-colors hover:bg-black/[0.01] dark:hover:bg-white/[0.01]"
            >
              {/* Top row: Code + Credits */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-mono font-semibold text-muted-foreground/70 uppercase">
                    {subj.code}
                  </span>
                  <p className="text-sm font-semibold text-foreground leading-snug truncate mt-0.5">
                    {subj.name}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-mono font-semibold text-muted-foreground">
                    {subj.credit} Cr
                  </span>
                  {subj.ltp && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                      LTP {subj.ltp}
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom row: Faculty & Classroom */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <User className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                  <span className="text-foreground font-medium">{subj.faculty || "Faculty unassigned"}</span>
                </span>
                {subj.classrooms && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                    <span>{subj.classrooms}</span>
                  </span>
                )}
              </div>

              {/* Faculty cabin location if present */}
              {subj.facultyCabins && subj.facultyCabins.length > 0 && (
                <div className="mt-1 pt-2 border-t border-border/30 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Building className="h-3 w-3 text-primary shrink-0" />
                  {subj.facultyCabins.map((f, i) => (
                    <span key={i}>
                      <strong>{f.name}:</strong> <span className="font-mono">{f.location}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 rounded-2xl border border-border/60 bg-card text-center text-muted-foreground text-xs max-w-sm mx-auto">
          No enrolled subjects available for this semester.
        </div>
      )}
    </div>
  );
};

export default Subjects;
