"use client";

import React, { useState, useEffect } from "react";
import { Mail, RefreshCw, ExternalLink, Unlink, Sparkles, CheckCircle2, Inbox, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/utils/useToast";
import API from "@/lib/api/axiosClient";

interface EmailItem {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  isImportant: boolean;
}

export default function StudentEmailCard() {
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      const res = await API.get("/gmail/emails");
      if (res.data?.success) {
        setConnected(!!(res.data.connected || res.data.isConnected));
        setUserEmail(res.data.email || "");
        setEmails(res.data.emails || []);
      }
    } catch (err) {
      console.error("Failed to load Gmail messages:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const res = await API.get("/gmail/connect");
      if (res.data?.authUrl) {
        window.location.href = res.data.authUrl;
      } else {
        toast({
          title: "Google Sync Not Configured",
          description: res.data?.message || "Google OAuth credentials are not set on this server.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Connection Notice",
        description: err.response?.data?.message || err.message || "Failed to start Google sign-in.",
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect your student Gmail?")) return;
    try {
      setLoading(true);
      await API.post("/gmail/disconnect");
      setConnected(false);
      setUserEmail("");
      setEmails([]);
      toast({ title: "Disconnected", description: "Gmail account successfully unlinked." });
    } catch (err) {
      toast({ title: "Error", description: "Failed to disconnect account.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openInGmail = (subject?: string) => {
    const url = subject 
      ? `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(subject)}`
      : "https://mail.google.com";
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex flex-col gap-3 py-1">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-500 shrink-0" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Official Emails & Circulars
            </h3>
            {connected && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Sync</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {connected && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openInGmail()}
                  className="h-7 px-2 rounded-lg text-xs text-muted-foreground hover:text-foreground gap-1"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Open Gmail</span>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={fetchEmails}
                  disabled={loading}
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                  title="Refresh Emails"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleDisconnect}
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-red-400"
                  title="Disconnect Account"
                >
                  <Unlink className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* State 1: Not Connected */}
        {!connected && !loading && (
          <div className="py-6 text-center flex flex-col items-center">
            <h4 className="font-semibold text-sm text-foreground">Connect Student Gmail (@srmap.edu.in)</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              Link your official university inbox to receive real-time CDC placement drives, exam schedules, and circulars.
            </p>
            <Button
              size="sm"
              onClick={handleConnect}
              disabled={connecting}
              className="mt-3 text-xs h-8 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5 text-amber-300" />
              {connecting ? "Connecting..." : "Sign in with Google"}
            </Button>
          </div>
        )}

        {/* State 2: Loading */}
        {loading && (
          <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
            <span>Synchronizing official circulars and emails...</span>
          </div>
        )}

        {/* State 3: Connected Email Feed */}
        {connected && !loading && (
          <div className="divide-y divide-border/40 max-h-72 overflow-y-auto">
            {emails.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No recent circulars or emails found in the last 7 days.
              </div>
            ) : (
              emails.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setSelectedEmail(m)}
                  className="py-2.5 transition-colors cursor-pointer group hover:bg-black/[0.015] dark:hover:bg-white/[0.015]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-semibold text-foreground truncate group-hover:text-blue-500 transition-colors">
                        {m.from.split("<")[0].replace(/['"]+/g, "").trim()}
                      </span>
                      {m.isImportant && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-500 uppercase tracking-wider shrink-0 font-mono">
                          Important
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 font-mono">{m.date}</span>
                  </div>

                  <div className="text-xs text-foreground font-medium truncate mt-0.5">
                    {m.subject}
                  </div>

                  <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                    {m.snippet}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {/* 📬 In-App Email Preview Modal (No external redirects) */}
        {selectedEmail && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
            onClick={() => setSelectedEmail(null)}
          >
            <div 
              className="bg-background/95 border border-white/20 dark:border-white/10 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-blue-500 truncate">
                      {selectedEmail.from}
                    </span>
                    {selectedEmail.isImportant && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-500 uppercase tracking-wider shrink-0 font-mono">
                        Official Circular
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground mt-1.5 leading-snug">
                    {selectedEmail.subject}
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-mono mt-1">
                    Received: {selectedEmail.date}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedEmail(null)}
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground shrink-0"
                  aria-label="Close Email Preview"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Message Content Preview */}
              <div className="bg-black/5 dark:bg-white/5 rounded-xl p-4 text-xs sm:text-sm text-foreground/90 leading-relaxed border border-white/10 max-h-72 overflow-y-auto whitespace-pre-wrap font-sans">
                {selectedEmail.snippet || "No additional text content preview available for this message."}
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedEmail(null)}
                  className="text-xs rounded-xl"
                >
                  Close Preview
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openInGmail(selectedEmail.subject)}
                  className="text-xs rounded-xl text-blue-500 hover:text-blue-600 gap-1.5"
                >
                  <span>Open in Gmail App</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
