"use client";

import { useState, useMemo } from "react";
import { useToast } from "@/hooks/utils/useToast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2, Fingerprint, Users } from "lucide-react";
import API from "@/lib/api/axiosClient";
import SessionCard from "@/components/utils/SessionCard";
import { useSessionValidator } from "@/hooks/auth/useSessionValidator";
import { extractErrorMessage } from "@/shared/utils/functions";
import AttendanceCheckCard from "@/components/page/attendance/AttendanceCheckCard";
import { useLocalStorageContext } from "@/context/LocalStorageContext";

interface MultiSubmissionResult {
  username: string;
  success: boolean;
  message: string;
}

const AttendanceCode = () => {
  const { toast } = useToast();
  const { sessionValid, sessionId } = useSessionValidator();
  const { profile } = useLocalStorageContext();

  const [attendanceCode, setAttendanceCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attendanceRefreshKey, setAttendanceRefreshKey] = useState(0);

  // Multi-account states
  const savedAccounts = useMemo(() => {
    return Array.isArray(profile.accounts) ? profile.accounts : [];
  }, [profile.accounts]);

  const [selectedUsernames, setSelectedUsernames] = useState<string[]>(() => {
    return savedAccounts.map((a: any) => a.username);
  });

  const [multiResults, setMultiResults] = useState<MultiSubmissionResult[]>([]);

  const isValidCodeFormat = (code: string) => /^[A-Z]\d{6}$/.test(code);

  const toggleAccountSelection = (username: string) => {
    setSelectedUsernames((prev) =>
      prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username]
    );
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
      // Execute parallel submissions for all selected accounts
      const promises = targetAccounts.map(async (acc: any) => {
        const accSessionId = acc.sessionId || (acc.username === profile.activeAccountId ? sessionId : "");
        if (!accSessionId) {
          return {
            username: acc.username,
            success: false,
            message: "No active session. Please switch account & initiate session.",
          };
        }
        try {
          const res = await API.post(`/srmapi/attendance/mark`, {
            code,
            sessionid: accSessionId,
          });
          return {
            username: acc.username,
            success: !!res.data.success,
            message: res.data.message || (res.data.success ? "Attendance Captured Successfully!" : "Failed to mark attendance"),
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

        {savedAccounts.length > 1 && (
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>Multi-Account ({savedAccounts.length})</span>
          </span>
        )}
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
          {/* Multi-Account Selector (If user has multiple accounts) */}
          {savedAccounts.length > 1 && (
            <div className="flex flex-col gap-2 p-3 rounded-2xl bg-muted/40 border border-border/60">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-blue-500" />
                  <span>Submit for Accounts ({selectedUsernames.length}/{savedAccounts.length})</span>
                </span>
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

              <div className="flex flex-wrap gap-1.5 pt-1">
                {savedAccounts.map((acc: any) => {
                  const isSelected = selectedUsernames.includes(acc.username);
                  const isActive = acc.username === profile.activeAccountId;
                  const hasSession = !!acc.sessionId;

                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => toggleAccountSelection(acc.username)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all border ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 font-bold shadow-xs"
                          : "bg-background text-muted-foreground border-border/80 hover:text-foreground"
                      }`}
                    >
                      <span>{acc.username}</span>
                      {isActive && <span className="text-[9px] opacity-75 font-sans">(You)</span>}
                      {!hasSession && (
                        <span className="text-[9px] text-amber-300 font-sans font-bold" title="No active session">
                          ⚠️
                        </span>
                      )}
                    </button>
                  );
                })}
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
            disabled={isLoading}
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
        <SessionCard />
      )}

      {/* Divider */}
      <div className="border-t border-border/60 my-2" />

      {/* Today's attendance check */}
      <AttendanceCheckCard
        sessionValid={sessionValid}
        sessionId={sessionId}
        refreshKey={attendanceRefreshKey}
      />
    </div>
  );
};

export default AttendanceCode;