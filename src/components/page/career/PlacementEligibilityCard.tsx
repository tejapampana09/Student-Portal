"use client";
import React from "react";
import { CheckCircle2, AlertTriangle, Building2 } from "lucide-react";
import { useStudentData } from "@/context/StudentContext";

export const PlacementEligibilityCard: React.FC = () => {
  const { cgpa } = useStudentData();
  const currentCgpa = typeof cgpa === "object" && (cgpa as any)?.cgpa ? parseFloat((cgpa as any).cgpa) : parseFloat(String(cgpa || "0"));

  const tiers = [
    {
      name: "Super Dream (₹15+ LPA)",
      minCgpa: 8.5,
      eligible: currentCgpa >= 8.5,
    },
    {
      name: "Dream (₹8 - ₹15 LPA)",
      minCgpa: 7.5,
      eligible: currentCgpa >= 7.5,
    },
    {
      name: "Day-1 / Core (₹4.5 - ₹8 LPA)",
      minCgpa: 6.5,
      eligible: currentCgpa >= 6.5,
    },
  ];

  return (
    <div className="glass-card rounded-3xl p-6 border border-white/10 shadow-lg relative overflow-hidden flex flex-col justify-between">
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Placement Eligibility Radar</h3>
              <p className="text-xs text-muted-foreground">Based on current CGPA ({currentCgpa.toFixed(2)})</p>
            </div>
          </div>
        </div>

        {/* Tiers List */}
        <div className="mt-5 space-y-3">
          {tiers.map((tier, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                tier.eligible
                  ? "bg-white/[0.04] border-white/10"
                  : "bg-white/[0.01] border-white/5 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3">
                {tier.eligible ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500/70 shrink-0" />
                )}
                <div>
                  <p className="text-xs font-bold text-foreground">{tier.name}</p>
                  <p className="text-[10px] text-muted-foreground">Cutoff: {tier.minCgpa} CGPA</p>
                </div>
              </div>

              <span
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                  tier.eligible
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : "bg-white/5 text-muted-foreground border-white/10"
                }`}
              >
                {tier.eligible ? "Eligible ✨" : `Need +${(tier.minCgpa - currentCgpa).toFixed(2)}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
