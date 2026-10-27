"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Sun, Moon, Sparkles, ShieldCheck, ArrowRight, User, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useLocalStorageContext } from "@/context/LocalStorageContext";
import usePasswordToggle from "@/hooks/utils/usePasswordToggle";
import { toast } from "@/hooks/utils/useToast";
import { CachedDataPrompt } from "@/components/utils/CachedDataPrompt";
import Logo from "../../../../public/icons/round_corner_logo.png";
import Logo_White from "../../../../public/icons/round_corner_logo.png";
import { handleRegNumberChange } from "@/shared/utils/functions";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const passwordToggle = usePasswordToggle();
  const { login, isLoginLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { profile, upsertAccount } = useLocalStorageContext();
  const router = useRouter();

  const [showCachedPrompt, setShowCachedPrompt] = useState(false);
  const [cachedUsername, setCachedUsername] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined" && password) {
      try {
        sessionStorage.setItem("srm_portal_key", password);
      } catch {}
    }
    const result: any = await login(username, password);
    if (result && !result.success && result.error?.includes("SRM server is unreachable")) {
      if (result.hasCachedData) {
        const normalizedUsername = username.toUpperCase();
        setCachedUsername(normalizedUsername);
        setShowCachedPrompt(true);
      } else {
        toast.error("College portal was down and since its your first login your data isn't cached.");
      }
    }
  };

  const handleUseCachedData = async () => {
    setShowCachedPrompt(false);
    await login(username, password, true);
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-between p-4 sm:p-8 transition-colors duration-500 overflow-x-hidden">
      {/* 🌟 Minimalist Top Bar: Subtle Branding & Theme Toggle */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between z-20 pt-2 pb-4">
        <Link href="/" className="flex items-center gap-2.5 group opacity-80 hover:opacity-100 transition-opacity">
          <div className="w-7 h-7 rounded-lg bg-blue-600/10 dark:bg-blue-500/20 border border-blue-500/20 flex items-center justify-center">
            <Image
              src={Logo_White}
              alt="SRMAP Portal"
              className="w-4 h-4 object-contain"
              priority
            />
          </div>
          <span className="text-xs font-semibold tracking-wider uppercase text-foreground/80 font-mono">
            SRMAP PORTAL
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Theme Toggler */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggleTheme()}
            className="rounded-xl h-9 w-9 hover:bg-white/10 dark:hover:bg-white/5 border border-black/5 dark:border-white/10"
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            <div className="relative w-4 h-4">
              <Sun
                className={`absolute inset-0 h-4 w-4 transition-all duration-300 text-amber-500 ${
                  theme === "light"
                    ? "rotate-0 scale-100 opacity-100"
                    : "rotate-90 scale-0 opacity-0"
                }`}
              />
              <Moon
                className={`absolute inset-0 h-4 w-4 transition-all duration-300 text-blue-400 ${
                  theme === "dark"
                    ? "rotate-0 scale-100 opacity-100"
                    : "-rotate-90 scale-0 opacity-0"
                }`}
              />
            </div>
          </Button>
        </div>
      </header>

      {/* 🚀 Full-Screen Unboxed Login Experience (No Card Container) */}
      <main className="w-full max-w-md mx-auto my-auto py-6 sm:py-10 z-10 flex flex-col items-center">
        {/* Clean Emblem - No box, border, or badge */}
        <div className="mx-auto mb-5 flex items-center justify-center">
          <Image
            src={Logo}
            alt="SRMAP Emblem"
            className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-md"
            priority
          />
        </div>

        {/* Headings */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-sans">
            Sign In
          </h1>
        </div>

        {/* Unboxed Full Screen Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          {/* Registration Number Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-foreground px-1">
              <label htmlFor="regNumber" className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-blue-500" />
                <span>Registration ID</span>
              </label>
              <span className="text-[10px] text-muted-foreground font-mono">
                AP followed by 11 digits
              </span>
            </div>
            <div className="relative">
              <Input
                id="regNumber"
                placeholder="e.g. AP24110010000"
                value={username}
                onChange={(e) => setUsername(handleRegNumberChange(e))}
                required
                autoComplete="username"
                className="uppercase h-13 rounded-2xl text-sm font-mono tracking-wide bg-white/60 dark:bg-white/[0.04] border-black/10 dark:border-white/15 pl-4 pr-4 text-foreground placeholder:text-muted-foreground/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-foreground px-1">
              <label htmlFor="password" className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-indigo-400" />
                <span>Portal Password</span>
              </label>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={passwordToggle.inputType}
                value={password}
                placeholder="Official Portal Password"
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-13 rounded-2xl text-sm bg-white/60 dark:bg-white/[0.04] border-black/10 dark:border-white/15 pl-4 pr-12 text-foreground placeholder:text-muted-foreground/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {passwordToggle.toggleButton}
              </div>
            </div>
          </div>


          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoginLoading}
            className="w-full h-13 text-sm sm:text-base font-semibold rounded-2xl bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 hover:from-blue-500 hover:via-sky-500 hover:to-indigo-500 text-white shadow-xl shadow-blue-500/20 transition-all duration-300 transform active:scale-[0.99] flex items-center justify-center gap-2 border border-white/20 mt-2"
          >
            {isLoginLoading ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Authenticating & Solving Captcha...</span>
              </span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </Button>

          {/* Bottom Action Sub-row */}
          <div className="flex items-center justify-between w-full pt-2 px-1">
            <button
              type="button"
              onClick={() => router.push("/forgot")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline"
            >
              Forgot Password?
            </button>

            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>SSL Protected</span>
            </div>
          </div>
        </form>
      </main>

      <CachedDataPrompt
        open={showCachedPrompt}
        onOpenChange={setShowCachedPrompt}
        onConfirm={handleUseCachedData}
        onCancel={() => setShowCachedPrompt(false)}
        description="The college portal is currently down, but you have previously logged in. Would you like to view your last updated data?"
      />
    </div>
  );
};

export default Login;
