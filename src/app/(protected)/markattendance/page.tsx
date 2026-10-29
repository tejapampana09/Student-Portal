"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/utils/useToast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2, Fingerprint, Users, RefreshCw, Zap, ShieldAlert, CheckCircle2, Mic } from "lucide-react";
import API from "@/lib/api/axiosClient";
import SessionCard from "@/components/utils/SessionCard";
import { useSessionValidator } from "@/hooks/auth/useSessionValidator";
import { extractErrorMessage, isSessionValid } from "@/shared/utils/functions";
import AttendanceCheckCard from "@/components/page/attendance/AttendanceCheckCard";
import VoiceAssistantModal from "@/components/voice/VoiceAssistantModal";
import { useLocalStorageContext } from "@/context/LocalStorageContext";
import { useSearchParams } from "next/navigation";
import { DateTime } from "luxon";

interface MultiSubmissionResult {
  username: string;
  success: boolean;
  message: string;
  autoRenewed?: boolean;
}

const AttendanceCode = () => {
  const { toast } = useToast();
  const { sessionValid, sessionId } = useSessionValidator();
  const { profile, updateAccountsSessions } = useLocalStorageContext();

  const [attendanceCode, setAttendanceCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshingSessions, setIsRefreshingSessions] = useState(false);
  const [refreshingUsernames, setRefreshingUsernames] = useState<string[]>([]);
  const [attendanceRefreshKey, setAttendanceRefreshKey] = useState(0);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams?.get("voice") === "1") {
      setIsVoiceOpen(true);
    }
  }, [searchParams]);

  // Multi-account list from localStorage
  const savedAccounts = useMemo(() => {
    return Array.isArray(profile.accounts) ? profile.accounts : [];
  }, [profile.accounts]);

  const [selectedUsernames, setSelectedUsernames] = useState<string[]>(() => {
    return savedAccounts.map((a: any) => a.username);
  });

  // Keep selected usernames in sync when saved accounts change
  useEffect(() => {
    if (savedAccounts.length > 0) {
      setSelectedUsernames((prev) => {
        const validUsernames = savedAccounts.map((a: any) => a.username);
        const filtered = prev.filter((u) => validUsernames.includes(u));
        return filtered.length > 0 ? filtered : validUsernames;
      });
    }
  }, [savedAccounts.length]);

  const [multiResults, setMultiResults] = useState<MultiSubmissionResult[]>([]);

  const isValidCodeFormat = (code: string) => /^[A-Z]\d{6}$/.test(code);

  const toggleAccountSelection = (username: string) => {
    setSelectedUsernames((prev) =>
      prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username]
    );
  };

  // Helper to determine session status and remaining validity
  const getAccountSessionInfo = useCallback((acc: any) => {
    const isActive = acc.username === profile.activeAccountId;
    const accSessionId = acc.sessionId || (isActive ? sessionId : "");
    const accSessionTime = acc.sessionTime || (isActive ? profile.sessionTime : "");

    if (!accSessionId || !accSessionTime) {
      return { valid: false, label: "No Session", minutes: 0 };
    }

    const valid = isSessionValid(accSessionTime);
    if (!valid) {
      return { valid: false, label: "Expired", minutes: 0 };
    }

    try {
      const date = DateTime.fromFormat(accSessionTime, "yyyy-MM-dd, HH:mm:ss", { zone: "Asia/Kolkata" });
      const now = DateTime.now().setZone("Asia/Kolkata");
      const remaining = Math.max(1, Math.round(15 - now.diff(date, "minutes").minutes));
      return { valid: true, label: `${remaining}m left`, minutes: remaining };
    } catch {
      return { valid: true, label: "Active", minutes: 15 };
    }
  }, [profile.activeAccountId, profile.sessionTime, sessionId]);

  // Batch session refresher for multiple accounts
  const refreshAllSessions = async (targetUsernames?: string[]) => {
    const usernamesToRefresh = targetUsernames && targetUsernames.length > 0
      ? targetUsernames
      : (selectedUsernames.length > 0 ? selectedUsernames : savedAccounts.map((a: any) => a.username));

    if (usernamesToRefresh.length === 0) {
      toast({ title: "No Accounts", description: "No accounts available to refresh.", variant: "destructive" });
      return false;
    }

    setIsRefreshingSessions(true);
    setRefreshingUsernames(usernamesToRefresh);

    try {
      const res = await API.post("/srmapi/initiate/multi-session", {
        usernames: usernamesToRefresh,
      });

      const results = res.data?.results || [];
      const successfulUpdates: { username: string; sessionId: string; sessionTime: string }[] = [];
      let successCount = 0;
      let failedAccounts: string[] = [];

      results.forEach((r: any) => {
        if (r.success && r.sessionId) {
          successCount++;
          successfulUpdates.push({
            username: r.username,
            sessionId: r.sessionId,
            sessionTime: r.sessionTime,
          });
        } else {
          failedAccounts.push(r.username);
        }
      });

      if (successfulUpdates.length > 0) {
        updateAccountsSessions(successfulUpdates);
      }

      if (successCount === usernamesToRefresh.length) {
        toast({
          title: "All Sessions Refreshed! ⚡",
          description: `Successfully renewed sessions for all ${successCount} account(s). Ready to mark attendance!`,
        });
      } else if (successCount > 0) {
        toast({
          title: "Partially Refreshed",
          description: `Renewed ${successCount} of ${usernamesToRefresh.length} sessions. Failed: ${failedAccounts.join(", ")}`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Session Refresh Failed",
          description: results[0]?.message || "Could not renew sessions automatically. Please log in or enter password.",
        });
      }

      return successCount > 0;
    } catch (err: any) {
      const msg = extractErrorMessage(err);
      toast.error(msg || "Failed to refresh sessions.");
      return false;
    } finally {
      setIsRefreshingSessions(false);
      setRefreshingUsernames([]);
    }
  };

  const handleSubmitCode = async () => {
    const code = attendanceCode.trim();
    if (!code) {
      toast({ title: "Error", description: "Please enter attendance code.", variant: "destructive" });
      return;
    }
    if (!isValidCodeFormat(code)) {
      toast({
        title: "Invalid Format",
        description: "Code must start with a capital letter followed by 6 digits. e.g. A123456",
        variant: "destructive",
      });
      return;
    }

    // Determine target accounts
    const targetAccounts = savedAccounts.filter((a: any) =>
      selectedUsernames.includes(a.username)
    );

    if (targetAccounts.length === 0) {
      toast({ title: "Error", description: "Please select at least one account.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setMultiResults([]);

    try {
      // Step 1: Pre-flight check for stale or expired sessions
      const staleUsernames: string[] = [];
      targetAccounts.forEach((acc: any) => {
        const info = getAccountSessionInfo(acc);
        if (!info.valid) {
          staleUsernames.push(acc.username);
        }
      });

      // If any accounts have expired sessions, auto-refresh them first!
      if (staleUsernames.length > 0) {
        toast({
          title: "Auto-Renewing Sessions...",
          description: `Renewing expired sessions for ${staleUsernames.length} account(s)...`,
        });
        await refreshAllSessions(staleUsernames);
      }

      // Re-read latest accounts state from localStorage for up-to-date sessionIds
      let currentAccounts = savedAccounts;
      try {
        const rawProfile = typeof window !== "undefined" ? localStorage.getItem("profile") : null;
        if (rawProfile) {
          const parsed = JSON.parse(rawProfile);
          if (Array.isArray(parsed.accounts)) currentAccounts = parsed.accounts;
        }
      } catch {}

      const sessionUpdates: { username: string; sessionId: string; sessionTime: string }[] = [];

      // Step 2: Execute parallel attendance submissions for all selected accounts
      const promises = targetAccounts.map(async (acc: any) => {
        const updatedAcc = currentAccounts.find((a: any) => a.username === acc.username) || acc;
        const accSessionId = updatedAcc.sessionId || (updatedAcc.username === profile.activeAccountId ? sessionId : "");

        try {
          const res = await API.post(`/srmapi/attendance/mark`, {
            code,
            sessionid: accSessionId,
            username: acc.username,
          });

          // If backend auto-renewed the session during submission, capture it
          if (res.data?.renewedSession) {
            sessionUpdates.push({
              username: acc.username,
              sessionId: res.data.renewedSession.sessionId,
              sessionTime: res.data.renewedSession.sessionTime,
            });
          }

          return {
            username: acc.username,
            success: !!res.data?.success,
            message: res.data?.message || (res.data?.success ? "Attendance Captured Successfully!" : "Failed to mark attendance"),
            autoRenewed: !!res.data?.renewedSession,
          };
        } catch (err: any) {
          return {
            username: acc.username,
            success: false,
            message: extractErrorMessage(err) || "Failed to mark attendance",
          };
        }
      });

      const results = await Promise.all(promises);
      setMultiResults(results);

      // If any sessions were renewed during attendance marking, update local storage
      if (sessionUpdates.length > 0) {
        updateAccountsSessions(sessionUpdates);
      }

      const successCount = results.filter((r) => r.success).length;
      if (successCount === results.length) {
        toast({
          title: "Attendance Captured! 🎯",
          description: `Successfully marked attendance for all ${results.length} account(s)!`,
        });
      } else if (successCount > 0) {
        toast({
          title: "Partially Captured",
          description: `Marked for ${successCount} of ${results.length} account(s). Check details below.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Failed",
          description: results[0]?.message || "Could not mark attendance.",
        });
      }

      setAttendanceRefreshKey((k) => k + 1);
    } catch (err: any) {
      const msg = extractErrorMessage(err);
      toast.error(msg);
    } finally {
      setIsLoading(false);
      setAttendanceCode("");
    }
  };

  // Count expired accounts among selected
  const expiredCount = useMemo(() => {
    return savedAccounts
      .filter((a: any) => selectedUsernames.includes(a.username))
      .filter((a: any) => !getAccountSessionInfo(a).valid).length;
  }, [savedAccounts, selectedUsernames, getAccountSessionInfo]);

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto w-full pb-28 pt-2">
      {/* Header: Title + Subtitle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-sans">
            Mark Attendance
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enter code announced in class
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsVoiceOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600/15 via-cyan-500/15 to-indigo-600/15 text-blue-600 dark:text-cyan-300 border border-blue-500/30 hover:border-blue-500/60 font-semibold text-xs transition-all shadow-xs active:scale-95"
            title="Voice Assistant & Siri Shortcuts"
          >
            <Mic className="h-3.5 w-3.5" />
            <span>Voice / Siri</span>
          </button>

          {savedAccounts.length > 1 && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>Multi-Account ({savedAccounts.length})</span>
            </span>
          )}
        </div>
      </div>

      {/* Code Entry Form or Session Card */}
      {sessionValid ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmitCode();
          }}
          className="flex flex-col gap-4 mt-2"
        >
          {/* Multi-Account Selector & Batch Session Refresh */}
          {savedAccounts.length > 1 && (
            <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-muted/40 border border-border/60">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-blue-500" />
                  <span>Submit for Accounts ({selectedUsernames.length}/{savedAccounts.length})</span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedUsernames.length === savedAccounts.length) {
                        setSelectedUsernames([profile.activeAccountId || savedAccounts[0]?.username]);
                      } else {
                        setSelectedUsernames(savedAccounts.map((a: any) => a.username));
                      }
                    }}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    {selectedUsernames.length === savedAccounts.length ? "Only Active" : "Select All"}
                  </button>
                </div>
              </div>

              {/* Account chips with individual live session status */}
              <div className="flex flex-wrap gap-2 pt-1">
                {savedAccounts.map((acc: any) => {
                  const isSelected = selectedUsernames.includes(acc.username);
                  const isActive = acc.username === profile.activeAccountId;
                  const isRefreshing = refreshingUsernames.includes(acc.username);
                  const sessionInfo = getAccountSessionInfo(acc);

                  return (
                    <button
                      key={acc.id || acc.username}
                      type="button"
                      onClick={() => toggleAccountSelection(acc.username)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono transition-all border ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 font-bold shadow-xs"
                          : "bg-background text-muted-foreground border-border/80 hover:text-foreground"
                      }`}
                    >
                      <span>{acc.username}</span>
                      {isActive && <span className="text-[9px] opacity-80 font-sans">(You)</span>}

                      {/* Live Session Status Pill */}
                      {isRefreshing ? (
                        <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-200 font-sans font-semibold">
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          <span>Renewing</span>
                        </span>
                      ) : sessionInfo.valid ? (
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-md font-sans font-medium flex items-center gap-1 ${
                            isSelected
                              ? "bg-emerald-400/25 text-emerald-100"
                              : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          }`}
                          title={`Active session: ${sessionInfo.label}`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>{sessionInfo.label}</span>
                        </span>
                      ) : (
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-md font-sans font-semibold flex items-center gap-1 ${
                            isSelected
                              ? "bg-rose-500/30 text-rose-100"
                              : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                          }`}
                          title="Session expired — will auto-refresh"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                          <span>Expired</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* ⚡ 1-Click "Refresh All Sessions" Action Button */}
              <div className="pt-1 flex items-center justify-between border-t border-border/40 mt-1">
                <span className="text-[11px] text-muted-foreground">
                  {expiredCount > 0 ? (
                    <span className="text-amber-500 dark:text-amber-400 font-medium">
                      ⚠️ {expiredCount} account(s) session expired
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="h-3 w-3" /> All selected sessions active
                    </span>
                  )}
                </span>

                <button
                  type="button"
                  onClick={() => refreshAllSessions()}
                  disabled={isRefreshingSessions || isLoading}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-primary/10 hover:bg-primary/20 text-primary transition-all active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${isRefreshingSessions ? "animate-spin" : ""}`} />
                  <span>
                    {isRefreshingSessions
                      ? "Refreshing Sessions..."
                      : expiredCount > 0
                      ? `Refresh Sessions (${expiredCount})`
                      : "Refresh All Sessions"}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Label */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="attendance-code"
              className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase select-none"
            >
              Attendance Code
            </label>

            {/* Input styled like screenshot */}
            <Input
              id="attendance-code"
              placeholder="A 1 2 3 4 5 6"
              value={attendanceCode}
              onChange={(e) => {
                let value = e.target.value.toUpperCase();
                let firstChar = value.charAt(0).replace(/[^A-Z]/g, "");
                let digits = value.slice(1).replace(/[^0-9]/g, "").slice(0, 6);
                setAttendanceCode(firstChar + digits);
              }}
              disabled={isLoading}
              className="h-14 sm:h-15 rounded-2xl border border-border/80 bg-background text-center text-lg sm:text-xl font-bold font-mono tracking-[0.35em] placeholder:tracking-[0.35em] placeholder:text-muted-foreground/35 uppercase shadow-sm focus-visible:ring-2 focus-visible:ring-primary/30"
              maxLength={7}
              autoComplete="off"
            />
          </div>

          {/* Full-width button with Fingerprint icon & uppercase text */}
          <Button
            type="submit"
            disabled={isLoading || isRefreshingSessions}
            className="w-full h-12 sm:h-13 rounded-2xl bg-[#0f172a] hover:bg-[#1e293b] text-white dark:bg-[#1e293b] dark:text-white dark:hover:bg-[#334155] font-bold tracking-wider text-xs sm:text-sm uppercase flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-all"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <Fingerprint className="h-4 w-4 text-white" />
            )}
            <span>
              {savedAccounts.length > 1 && selectedUsernames.length > 1
                ? `MARK ATTENDANCE (${selectedUsernames.length} ACCOUNTS)`
                : "MARK ATTENDANCE"}
            </span>
          </Button>

          {/* Multi-Account Submission Results */}
          {multiResults.length > 0 && (
            <div className="flex flex-col gap-2 p-3.5 rounded-2xl border border-border/60 bg-card divide-y divide-border/40">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-1">
                Submission Status
              </p>
              {multiResults.map((res) => (
                <div key={res.username} className="flex items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        res.success ? "bg-emerald-500" : "bg-red-500"
                      }`}
                    />
                    <span className="text-xs font-mono font-bold text-foreground">
                      {res.username}
                    </span>
                    <span className="text-[11px] text-muted-foreground truncate">
                      {res.message}
                      {res.autoRenewed && (
                        <span className="text-[10px] text-blue-500 ml-1 font-sans">
                          (Session Auto-Renewed ⚡)
                        </span>
                      )}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      res.success
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-500/15 text-red-600 dark:text-red-400"
                    }`}
                  >
                    {res.success ? "Success" : "Failed"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          {savedAccounts.length > 1 && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/60 text-xs">
              <span className="text-muted-foreground font-medium">
                {savedAccounts.length} accounts saved
              </span>
              <button
                type="button"
                onClick={() => refreshAllSessions()}
                disabled={isRefreshingSessions}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold bg-primary text-primary-foreground transition-all active:scale-95 disabled:opacity-50"
              >
                <Zap className={`h-3.5 w-3.5 ${isRefreshingSessions ? "animate-spin" : ""}`} />
                <span>{isRefreshingSessions ? "Connecting..." : "⚡ Connect All Sessions"}</span>
              </button>
            </div>
          )}
          <SessionCard />
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-border/60 my-2" />

      {/* Today's attendance check */}
      <AttendanceCheckCard
        sessionValid={sessionValid}
        sessionId={sessionId}
        refreshKey={attendanceRefreshKey}
      />

      {/* Voice Assistant Modal */}
      <VoiceAssistantModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
      />
    </div>
  );
};

export default AttendanceCode;
