"use client";

import React, { useState, useEffect } from "react";
import { Mail, RefreshCw, ExternalLink, Unlink, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
        toast({ title: "Error", description: "Could not generate Google login link.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Connection Error", description: err.message || "Failed to start Google sign-in.", variant: "destructive" });
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

  return (
    <div className="glass-card rounded-3xl p-6 flex flex-col justify-between border border-white/10 shadow-lg relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-400" />
              Student Email & Circulars
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {connected ? userEmail : "@srmap.edu.in Inbox Sync"}
            </p>
          </div>

          {connected && (
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={fetchEmails}
                disabled={loading}
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                title="Refresh Emails"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleDisconnect}
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-red-400"
                title="Disconnect Account"
              >
                <Unlink className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* State 1: Not Connected */}
        {!connected && !loading && (
          <div className="my-3 p-4 rounded-2xl bg-white/5 border border-white/10 text-center flex flex-col items-center">
            <div className="h-10 w-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-2">
              <Mail className="h-5 w-5" />
            </div>
            <h4 className="font-semibold text-xs text-foreground">Connect Student Gmail</h4>
            <p className="text-[11px] text-muted-foreground mt-1 max-w-xs leading-relaxed">
              Sync your official inbox to receive CDC placement alerts, exam notices, and fee circulars directly on your dashboard.
            </p>
            <Button
              size="sm"
              onClick={handleConnect}
              disabled={connecting}
              className="mt-3.5 text-xs h-8 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md hover:shadow-blue-500/30 hover:scale-[1.02] transition-all"
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
            Loading recent emails...
          </div>
        )}

        {/* State 3: Connected Email Feed */}
        {connected && !loading && (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {emails.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No recent circulars or emails found in the last 7 days.
              </div>
            ) : (
              emails.map((m) => (
                <div
                  key={m.id}
                  className={`p-2.5 rounded-xl border transition-colors ${
                    m.isImportant
                      ? "bg-blue-500/10 border-blue-500/20"
                      : "bg-white/5 hover:bg-white/10 border-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-semibold text-foreground truncate flex-1">
                      {m.from.split("<")[0].replace(/['"]+/g, "").trim()}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0 font-mono">{m.date}</span>
                  </div>

                  <div className="text-xs text-foreground font-medium truncate mt-0.5">{m.subject}</div>

                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{m.snippet}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
