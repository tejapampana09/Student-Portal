"use client";
import { useState } from "react";
import { Loader2, Radio, Sparkles, Lock, KeyRound, Eye, EyeOff, LogIn } from "lucide-react";
import { useToast } from "@/hooks/utils/useToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStudentData } from "@/context/StudentContext";
import { useSessionValidator } from "@/hooks/auth/useSessionValidator";
import { useRouter } from "next/navigation";

const SessionCard = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { initiateSession } = useStudentData();
  const { sessionValid } = useSessionValidator();
  const [loadingFetch, setLoadingFetch] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleFetchData = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoadingFetch(true);
    try {
      const res = await initiateSession(password ? password : undefined);
      if (res) {
        toast({ title: "Session Connected", description: `Session authenticated. Active time: ${res.sessionTime}` });
        setPassword("");
        setShowPasswordInput(false);
      } else {
        setShowPasswordInput(true);
        toast({ 
          variant: "destructive", 
          title: "Password Required", 
          description: "Enter your SRM portal password to renew the 15-minute connection." 
        });
      }
    } catch (err: any) {
      setShowPasswordInput(true);
      const message = err?.response?.data?.message || err?.message || "Failed to initiate session. Please enter password.";
      toast({ variant: "destructive", title: "Authentication Required", description: message });
    } finally {
      setLoadingFetch(false);
    }
  };

  if (sessionValid) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl glass-card border border-slate-200/90 dark:border-white/10 p-6 text-center shadow-lg shadow-sky-500/5">
      {/* Top Specular Sheen */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
      
      <div className="relative z-10 flex flex-col items-center space-y-4">
        <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-inner">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-2xl bg-cyan-400 opacity-20" />
          <Radio className="h-6 w-6 relative" />
        </div>

        <div className="space-y-1 max-w-sm">
          <h3 className="text-base font-bold text-foreground tracking-tight">Active Portal Session Required</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Live attendance analytics, marks, and schedules require an active connection with the SRM portal.
          </p>
        </div>

        {showPasswordInput ? (
          <form onSubmit={handleFetchData} className="w-full max-w-xs space-y-3">
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Portal Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                className="pl-9 pr-9 h-10 rounded-xl bg-white/5 border-white/15 focus:border-cyan-400 text-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <Button 
                type="submit"
                disabled={loadingFetch || !password}
                className="w-full h-10 rounded-xl font-semibold bg-gradient-to-r from-blue-600 via-cyan-600 to-indigo-600 hover:from-blue-500 hover:via-cyan-500 hover:to-indigo-500 text-white shadow-lg shadow-cyan-500/20 border border-white/20 transition-all active:scale-[0.98]"
              >
                {loadingFetch ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Fetching...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    <span>Connect Session</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/login")}
                className="w-full h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-xl"
              >
                <LogIn className="mr-1.5 h-3.5 w-3.5" />
                <span>Go to Login Page</span>
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-2">
            <Button 
              onClick={() => handleFetchData()} 
              disabled={loadingFetch}
              className="h-10 px-6 rounded-xl font-semibold bg-gradient-to-r from-blue-600 via-cyan-600 to-indigo-600 hover:from-blue-500 hover:via-cyan-500 hover:to-indigo-500 text-white shadow-lg shadow-cyan-500/20 border border-white/20 transition-all active:scale-[0.98]"
            >
              {loadingFetch ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Fetching...</span>
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  <span>Initiate Session</span>
                </>
              )}
            </Button>
            
            <button
              onClick={() => setShowPasswordInput(true)}
              className="text-[11px] text-cyan-400/80 hover:text-cyan-300 transition-colors underline underline-offset-2"
            >
              Enter password manually
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionCard;
