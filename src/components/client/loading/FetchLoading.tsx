"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Logo from "../../../../public/icons/round_corner_logo.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useStudentData } from "@/context/StudentContext";
import { CachedDataPrompt } from "@/components/utils/CachedDataPrompt";
import { Loader2 } from "lucide-react";

export default function LoadingPage() {
  const { logout } = useAuth();
  const { loadCachedDataPrompt, useCachedData } = useStudentData();
  const [showLogout, setShowLogout] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);

  const statuses = [
    "Authenticating session with SRM portal...",
    "Fetching attendance & timetable data...",
    "Syncing academic records & marks...",
    "Preparing your dashboard...",
  ];

  useEffect(() => {
    const statusInterval = setInterval(() => {
      setStatusIndex((prev) => (prev < statuses.length - 1 ? prev + 1 : prev));
    }, 1800);

    const timer = setTimeout(() => {
      setShowLogout(true);
    }, 12000);

    return () => {
      clearInterval(statusInterval);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-sm rounded-3xl p-6 sm:p-8 text-center shadow-2xl border border-white/20 dark:border-white/15 flex flex-col items-center backdrop-blur-2xl">
        {/* 💎 Illuminated Glowing Logo */}
        <div className="relative mb-5">
          <div className="absolute -inset-3 bg-blue-500/30 rounded-full blur-2xl animate-pulse" />
          <div className="relative bg-white/30 dark:bg-white/15 backdrop-blur-2xl p-4 rounded-3xl border border-white/35 dark:border-white/20 shadow-lg">
            <Image
              src={Logo}
              alt="SRMAP Logo"
              width={76}
              height={76}
              priority
              className="h-16 w-16 sm:h-20 sm:w-20 object-contain drop-shadow-md transition-transform duration-500 hover:scale-105"
            />
          </div>
        </div>

        {/* 📊 Loading Status */}
        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground mb-1.5">
          Loading Academic Data
        </h2>
        <p className="text-xs text-muted-foreground mb-5 flex items-center justify-center gap-1.5 min-h-[20px] transition-all duration-300">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500 shrink-0" />
          <span className="truncate">{statuses[statusIndex]}</span>
        </p>

        {/* 🚀 Ultra-Smooth Apple-Style Glowing Progress Bar */}
        <div className="w-full bg-black/20 dark:bg-white/10 rounded-full h-2 overflow-hidden mb-3 border border-white/10 animate-smooth-progress shadow-inner" />

        {showLogout && (
          <div className="mt-3 pt-4 border-t border-white/10 w-full animate-in fade-in duration-300">
            <p className="text-[11px] text-muted-foreground mb-2">Taking longer than usual?</p>
            <Button size="sm" variant="glass" onClick={() => logout()} className="text-xs h-8 w-full text-red-400 hover:text-red-300">
              Cancel & Logout
            </Button>
          </div>
        )}
      </div>

      <CachedDataPrompt
        open={loadCachedDataPrompt}
        onConfirm={useCachedData}
        onCancel={() => logout()}
        cancelText="Logout"
      />
    </div>
  );
}