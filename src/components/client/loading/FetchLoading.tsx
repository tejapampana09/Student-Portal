"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Logo from "../../../../public/icons/round_corner_logo.png";
import { useAuth } from "@/context/AuthContext";
import { useStudentData } from "@/context/StudentContext";
import { CachedDataPrompt } from "@/components/utils/CachedDataPrompt";

export default function LoadingPage() {
  const { logout } = useAuth();
  const { loadCachedDataPrompt, useCachedData } = useStudentData();
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLogout(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4 select-none">
      {/* 💎 Pure Minimalist Logo - No Border, No Pulse, Just Smooth Logo Fade */}
      <div className="relative flex flex-col items-center justify-center">
        <Image
          src={Logo}
          alt="Portal Logo"
          width={96}
          height={96}
          priority
          className="w-20 h-20 sm:w-24 sm:h-24 object-contain animate-logo-fade"
        />

        {showLogout && (
          <button
            onClick={() => logout()}
            className="mt-8 text-xs text-muted-foreground hover:text-red-500 hover:underline transition-colors animate-in fade-in duration-300"
          >
            Cancel & Logout
          </button>
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
