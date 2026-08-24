"use client";
import Image from "next/image";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex h-screen w-full items-center justify-center p-4">
      <div className="glass-card p-8 rounded-3xl border border-white/15 dark:border-white/10 shadow-2xl flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute -inset-2 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
          <div className="relative bg-white/10 dark:bg-white/5 backdrop-blur-xl p-3 rounded-2xl border border-white/20 shadow-sm">
            <Image
              src="/icons/round_corner_logo.png"
              alt="Loading"
              width={64}
              height={64}
              priority
              className="w-14 h-14 object-contain animate-pulse"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
          <span>Loading...</span>
        </div>
      </div>
    </div>
  );
}