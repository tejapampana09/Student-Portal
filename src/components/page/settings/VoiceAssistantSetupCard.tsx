"use client";
import React, { useState, useEffect } from "react";
import { Mic, Copy, Check, RefreshCw, Volume2, Bot, Smartphone, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/utils/useToast";
import API from "@/lib/api/axiosClient";

export const VoiceAssistantSetupCard: React.FC = () => {
  const { toast } = useToast();
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [playingTest, setPlayingTest] = useState<string | null>(null);

  const fetchToken = async () => {
    try {
      setLoading(true);
      const res = await API.get("/voice/token");
      if (res.data?.voiceToken) {
        setToken(res.data.voiceToken);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToken();
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied to Clipboard! 📋" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    try {
      setRegenerating(true);
      const res = await API.post("/voice/token", {});
      if (res.data?.voiceToken) {
        setToken(res.data.voiceToken);
        toast({ title: "New Voice Token Generated! 🔑" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to regenerate voice token.", variant: "destructive" });
    } finally {
      setRegenerating(false);
    }
  };

  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleTestEndpoint = async (endpoint: "next-class" | "attendance" | "tasks") => {
    try {
      setPlayingTest(endpoint);
      const res = await API.get(`/voice/${endpoint}?token=${token}`);
      if (res.data?.speech) {
        speakText(res.data.speech);
        toast({ title: res.data.title || "Voice Response", description: res.data.speech });
      }
    } catch {
      toast({ title: "Error", description: "Failed to test voice endpoint.", variant: "destructive" });
    } finally {
      setPlayingTest(null);
    }
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://3.87.134.201.sslip.io";

  return (
    <div className="glass-card rounded-3xl p-6 border border-white/10 shadow-lg relative overflow-hidden space-y-6">
      <div className="absolute -top-12 -right-12 w-44 h-44 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
            <Mic className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
              Google Assistant & Siri Voice Hub
            </h3>
            <p className="text-xs text-muted-foreground">
              Hands-free voice queries for Next Class, Attendance & Daily Tasks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={regenerating}
            onClick={handleRegenerate}
            className="h-8 px-3 rounded-full text-xs font-semibold border-white/10 hover:bg-white/10 gap-1.5"
          >
            {regenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Regenerate Key
          </Button>
        </div>
      </div>

      {/* Personal Voice Key */}
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
        <label className="text-xs font-bold text-foreground flex items-center justify-between">
          <span>Personal Voice Authentication Key</span>
          <span className="text-[10px] text-muted-foreground font-mono">Keep private</span>
        </label>
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={loading ? "Loading..." : token}
            className="font-mono text-xs h-9 bg-black/30 border-white/10"
          />
          <Button
            size="sm"
            onClick={() => handleCopy(token)}
            className="h-9 px-3 rounded-xl text-xs font-semibold shrink-0 gap-1"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            Copy Key
          </Button>
        </div>
      </div>

      {/* Live Voice Audio Test */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Volume2 className="h-4 w-4 text-purple-400" />
          Test Spoken AI Responses:
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <Button
            variant="outline"
            size="sm"
            disabled={playingTest === "next-class"}
            onClick={() => handleTestEndpoint("next-class")}
            className="h-9 rounded-2xl border-white/10 text-xs font-semibold justify-start gap-2 hover:bg-purple-500/10 hover:border-purple-500/30 text-purple-300"
          >
            {playingTest === "next-class" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            "Next Class?"
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={playingTest === "attendance"}
            onClick={() => handleTestEndpoint("attendance")}
            className="h-9 rounded-2xl border-white/10 text-xs font-semibold justify-start gap-2 hover:bg-emerald-500/10 hover:border-emerald-500/30 text-emerald-300"
          >
            {playingTest === "attendance" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            "My Attendance?"
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={playingTest === "tasks"}
            onClick={() => handleTestEndpoint("tasks")}
            className="h-9 rounded-2xl border-white/10 text-xs font-semibold justify-start gap-2 hover:bg-amber-500/10 hover:border-amber-500/30 text-amber-300"
          >
            {playingTest === "tasks" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            "Today's Tasks?"
          </Button>
        </div>
      </div>

      {/* 2 Setup Guides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* 1. Google Assistant Setup */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-sky-400" />
            <h4 className="text-xs font-bold text-foreground">Google Assistant Setup Guide</h4>
          </div>
          <ol className="text-[11px] text-muted-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
            <li>Open <strong>Google Assistant</strong> app & tap <strong>Routines</strong>.</li>
            <li>Add trigger: <em>"When I say 'Hey Google, next class'"</em>.</li>
            <li>Add Action: <em>"Open URL in Browser"</em>.</li>
            <li>Paste URL:</li>
          </ol>
          <div className="p-2 rounded-xl bg-black/40 border border-white/5 font-mono text-[10px] text-sky-300 break-all flex items-center justify-between gap-1">
            <span>{baseUrl}/api/voice/next-class?token={token.slice(0, 10)}...</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleCopy(`${baseUrl}/api/voice/next-class?token=${token}`)}
              className="h-6 px-2 text-[10px]"
            >
              Copy
            </Button>
          </div>
        </div>

        {/* 2. Apple Siri Shortcuts Setup */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-pink-400" />
            <h4 className="text-xs font-bold text-foreground">Apple Siri Shortcuts Setup</h4>
          </div>
          <ol className="text-[11px] text-muted-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
            <li>Open <strong>Shortcuts App</strong> on iPhone / Apple Watch.</li>
            <li>Tap <strong>+ New Shortcut</strong> named <em>"Next Class"</em>.</li>
            <li>Action 1: <strong>Get Contents of URL</strong>.</li>
            <li>Action 2: <strong>Speak Text</strong> from <em>'speech'</em> key.</li>
          </ol>
          <div className="p-2 rounded-xl bg-black/40 border border-white/5 font-mono text-[10px] text-pink-300 break-all flex items-center justify-between gap-1">
            <span>{baseUrl}/api/voice/attendance?token={token.slice(0, 10)}...</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleCopy(`${baseUrl}/api/voice/attendance?token=${token}`)}
              className="h-6 px-2 text-[10px]"
            >
              Copy
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
