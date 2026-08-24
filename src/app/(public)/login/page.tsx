"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useState } from "react";
import { Sun, Moon } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

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
    const result: any = await login(username, password);
    if (result && !result.success && result.error?.includes("SRM server is unreachable")) {
      if (result.hasCachedData) {
        const normalizedUsername = username.toUpperCase();
        setCachedUsername(normalizedUsername);
        setShowCachedPrompt(true);
      } else {
        toast.error("College portal was down and since its your first login your data isnt cached.");
      }
    }
  };

  const handleUseCachedData = async () => {
    setShowCachedPrompt(false);
    await login(username, password, true);
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-between p-4 sm:p-6 transition-colors duration-500">
      {/* 🍏 Sleek Apple Liquid Glass Top Nav */}
      <nav className="container mx-auto max-w-5xl py-2.5 px-4 sm:px-5 flex items-center justify-between glass-dock rounded-2xl">
        <Link href="/" className="flex items-center space-x-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-white/10 dark:bg-white/5 border border-white/15 flex items-center justify-center shadow-sm">
            <Image
              src={Logo_White}
              alt="Profile"
              className="w-5 h-5 object-contain"
            />
          </div>
          <span className="text-base font-bold tracking-tight text-foreground">
            SRMAP API
          </span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => toggleTheme()}
          className="rounded-xl h-8 w-8 hover:bg-white/10 dark:hover:bg-white/5"
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          <div className="relative w-4 h-4">
            <Sun
              className={`absolute inset-0 h-4 w-4 transition-all duration-300 text-amber-500 ${theme === "light"
                ? "rotate-0 scale-100 opacity-100"
                : "rotate-90 scale-0 opacity-0"
                }`}
            />
            <Moon
              className={`absolute inset-0 h-4 w-4 transition-all duration-300 text-blue-400 ${theme === "dark"
                ? "rotate-0 scale-100 opacity-100"
                : "-rotate-90 scale-0 opacity-0"
                }`}
            />
          </div>
        </Button>
      </nav>

      {/* 🍏 Apple Liquid Glass Login Card */}
      <div className="flex items-center justify-center my-auto py-8">
        <Card className="w-full max-w-md glass-card rounded-3xl p-2 sm:p-4 shadow-2xl border border-white/10 dark:border-white/[0.08]">
          <CardHeader className="space-y-2 text-center pt-6 pb-4">
            <div className="mx-auto mb-2 cursor-pointer" onClick={toggleTheme}>
              <div className="relative bg-white/10 dark:bg-white/5 backdrop-blur-xl p-2.5 rounded-2xl border border-white/15 shadow-sm inline-block">
                <Image
                  src={Logo}
                  alt="SRMAP Logo"
                  className="h-14 w-14 object-contain mx-auto transition-transform duration-300 hover:scale-105"
                  priority
                />
              </div>
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Sign In to SRMAP
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground max-w-xs mx-auto">
              Student Portal & Attendance Tracker
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 px-4 sm:px-6">
              <div className="space-y-1.5">
                <Input
                  id="regNumber"
                  label="Registration Number"
                  placeholder="e.g., AP24110000000"
                  value={username}
                  animated={true}
                  onChange={(e) => setUsername(handleRegNumberChange(e))}
                  required
                  className="uppercase h-11"
                />
                <p className="text-[11px] text-muted-foreground pl-1">
                  Format: AP followed by 11 digits
                </p>
              </div>
              <div className="space-y-1.5">
                <div className="relative">
                  <Input
                    id="password"
                    label="Password"
                    type={passwordToggle.inputType}
                    value={password}
                    placeholder="Student Portal Password"
                    animated={true}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pr-12"
                  />
                  {passwordToggle.toggleButton}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 px-4 sm:px-6 pt-2 pb-6">
              <Button
                type="submit"
                className="w-full h-11 font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 transition-all duration-200"
                disabled={isLoginLoading}
              >
                {isLoginLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Authenticating...
                  </span>
                ) : (
                  "Continue with Portal ID"
                )}
              </Button>
              <button
                type="button"
                onClick={() => router.push('/forgot')}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline"
              >
                Forgot Password?
              </button>
            </CardFooter>
          </form>
        </Card>
      </div>

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