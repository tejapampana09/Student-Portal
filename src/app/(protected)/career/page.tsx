"use client";
import React, { useState, useEffect } from "react";
import { CodingStreakCard } from "@/components/page/career/CodingStreakCard";
import { PlacementEligibilityCard } from "@/components/page/career/PlacementEligibilityCard";
import { CourseraTrackerCard, CourseraCourse } from "@/components/page/career/CourseraTrackerCard";
import API from "@/lib/api/axiosClient";
import { Briefcase, Loader2 } from "lucide-react";

export default function CareerHubPage() {
  const [handles, setHandles] = useState<{ leetcode?: string; github?: string; codeforces?: string }>({});
  const [stats, setStats] = useState<any>(null);
  const [courses, setCourses] = useState<CourseraCourse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, courseraRes] = await Promise.all([
        API.get("/career/coding-stats").catch(() => ({ data: {} })),
        API.get("/career/coursera").catch(() => ({ data: { courses: [] } })),
      ]);

      setHandles(statsRes.data?.handles || {});
      setStats(statsRes.data?.stats || null);
      setCourses(courseraRes.data?.courses || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="flex flex-col gap-6 pb-12 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Briefcase className="h-7 w-7 text-primary" />
            Career & Placement Launchpad
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Track coding streaks, evaluate placement tier eligibility, and manage Coursera tasks.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1 & 2 */}
          <div className="lg:col-span-2 space-y-6">
            <CodingStreakCard handles={handles} stats={stats} onRefresh={fetchData} />
            <CourseraTrackerCard courses={courses} onRefresh={fetchData} />
          </div>

          {/* Column 3 */}
          <div className="space-y-6">
            <PlacementEligibilityCard />
          </div>
        </div>
      )}
    </div>
  );
}
