"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, Sparkles, CheckCircle2, AlertCircle, X, Apple, ExternalLink, Copy, Check, Radio } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/utils/useToast";
import API from "@/lib/api/axiosClient";
import { useStudentData } from "@/context/StudentContext";
import { getLiveClassStatus } from "@/shared/utils/liveClassTracker";
import { cleanSpokenCode } from "@/shared/utils/voiceUtils";

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCode?: string;
}

export default function VoiceAssistantModal({ isOpen, onClose, defaultCode }: VoiceAssistantModalProps) {
  const { toast } = useToast();
  const { timetable, subjects, attendance, profile } = useStudentData();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState<string>("Listening... Say 'Mark Attendance A123456' or 'What is my next class?'");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<"assistant" | "siri">("assistant");
  const [copiedUrl, setCopiedUrl] = useState(false);

  const recognitionRef = useRef<any>(null);

  // Text to speech helper
  const speakText = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event: any) => {
        const current = event.results[0][0].transcript;
        setTranscript(current);

        if (event.results[0].isFinal) {
          setIsListening(false);
          handleVoiceCommand(current);
        }
      };

      recognitionRef.current.onerror = (e: any) => {
        setIsListening(false);
        console.warn("Speech error:", e);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [timetable, subjects, attendance]);

  // Start listening automatically when modal opens
  useEffect(() => {
    if (isOpen) {
      setTranscript("");
      setAiResponse("Say 'Mark Attendance A123456' or 'Next class'...");
      startListening();
    } else {
      stopListening();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    }
  }, [isOpen]);

  const startListening = () => {
    if (!recognitionRef.current) {
      toast({ title: "Speech recognition unavailable in this browser", variant: "destructive" });
      return;
    }
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {}
  };

  const stopListening = () => {
    try {
      recognitionRef.current?.stop();
    } catch {}
    setIsListening(false);
  };

  const handleVoiceCommand = async (rawInput: string) => {
    const input = rawInput.trim();
    if (!input) return;

    setIsProcessing(true);

    // 1. Check if speech contains an attendance code (e.g. "Mark attendance A 1 2 3 4 5 6" or "A123456")
    const codeMatch = input.match(/([a-zA-Z]\s*\d\s*\d\s*\d\s*\d\s*\d\s*\d)/i);
    if (codeMatch || input.toLowerCase().includes("attendance") || input.toLowerCase().includes("code")) {
      const extractedCode = cleanSpokenCode(codeMatch ? codeMatch[0] : input);

      if (extractedCode && /^[A-Z]\d{6}$/.test(extractedCode)) {
        setAiResponse(`Submitting attendance code ${extractedCode}...`);
        try {
          const res = await API.post("/voice/mark", { code: extractedCode });
          const spoken = res.data?.spokenText || `Attendance captured with code ${extractedCode}!`;
          setAiResponse(`🎯 ${res.data?.message || "Success!"} (${extractedCode})`);
          speakText(spoken);
          toast({ title: "Attendance Captured! 🎯", description: `Code ${extractedCode} marked successfully!` });
        } catch (err: any) {
          const msg = err?.response?.data?.message || "Failed to mark attendance.";
          const spoken = err?.response?.data?.spokenText || "Could not mark attendance. Please check the code.";
          setAiResponse(`❌ ${msg}`);
          speakText(spoken);
          toast({ variant: "destructive", title: "Failed", description: msg });
        } finally {
          setIsProcessing(false);
        }
        return;
      }
    }

    // 2. Next class query ("next class", "where is my class", "next class enti")
    if (input.toLowerCase().includes("next") || input.toLowerCase().includes("class") || input.toLowerCase().includes("room")) {
      const live = getLiveClassStatus(timetable, subjects, attendance);
      if (live.status === "ongoing") {
        const text = `You currently have ${live.subjectName} in room ${live.venue}. It ends in ${live.minutesUntilEnd} minutes.`;
        setAiResponse(`📍 ${text}`);
        speakText(text);
      } else if (live.status === "upcoming") {
        const text = `Your next class is ${live.subjectName} in room ${live.venue} at ${live.timeRange.split("-")[0]}, starting in ${live.minutesUntilStart} minutes.`;
        setAiResponse(`⏰ ${text}`);
        speakText(text);
      } else if (live.status === "finished") {
        const text = `All classes are finished for today! Enjoy your free time.`;
        setAiResponse(`🎉 ${text}`);
        speakText(text);
      } else {
        const text = `No classes scheduled today. It's a holiday!`;
        setAiResponse(`🏖️ ${text}`);
        speakText(text);
      }
      setIsProcessing(false);
      return;
    }

    // 3. Bunk query ("bunk", "attendance percentage")
    if (input.toLowerCase().includes("bunk") || input.toLowerCase().includes("percentage")) {
      const live = getLiveClassStatus(timetable, subjects, attendance);
      if (live.subjectCode && live.attendancePercentage) {
        const text = `In ${live.subjectName}, your attendance is ${live.attendancePercentage}. You have ${live.safeBunks ?? 0} safe bunks left.`;
        setAiResponse(`📊 ${text}`);
        speakText(text);
      } else {
        const text = `Check the attendance page for full subject details.`;
        setAiResponse(`📊 ${text}`);
        speakText(text);
      }
      setIsProcessing(false);
      return;
    }

    // Fallback: general query
    const fallback = `I heard: "${input}". You can say: "Mark Attendance A123456" or "Where is my next class?"`;
    setAiResponse(fallback);
    speakText(fallback);
    setIsProcessing(false);
  };

  const siriShortcutWebhook = typeof window !== "undefined"
    ? `${window.location.origin}/api/voice/mark?code=`
    : "https://52-66-250-175.sslip.io/api/voice/mark?code=";

  const copySiriUrl = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(siriShortcutWebhook);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
      toast({ title: "Copied!", description: "Siri webhook URL copied to clipboard." });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-3xl border border-border/80 bg-background/95 backdrop-blur-xl shadow-2xl">
        {/* Header Tabs */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/40">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab("assistant")}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "assistant" ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-500" />
              <span>Voice AI</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("siri")}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "siri" ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground"
              }`}
            >
              <Apple className="h-3.5 w-3.5 text-rose-500" />
              <span>Hey Siri Setup</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {activeTab === "assistant" ? (
          <div className="flex flex-col items-center p-6 text-center">
            {/* Glowing Siri/Gemini Live Soundwave Orb */}
            <div className="relative my-4 flex items-center justify-center">
              <div
                className={`absolute w-28 h-28 rounded-full transition-all duration-700 blur-xl ${
                  isListening
                    ? "bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 opacity-70 animate-pulse scale-125"
                    : "bg-blue-500/20 opacity-30 scale-100"
                }`}
              />
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 active:scale-95 ${
                  isListening
                    ? "bg-gradient-to-tr from-blue-600 via-cyan-500 to-indigo-600 text-white shadow-cyan-500/40 ring-4 ring-cyan-400/30"
                    : "bg-muted text-foreground hover:bg-muted/80 border border-border"
                }`}
              >
                {isListening ? (
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-6 bg-white rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1 h-9 bg-white rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1 h-4 bg-white rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                ) : (
                  <Mic className="h-8 w-8 text-foreground" />
                )}
              </button>
            </div>

            {/* Status indicator */}
            <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mt-2">
              {isListening ? "Listening... Speak now" : isProcessing ? "Processing command..." : "Tap mic to speak"}
            </p>

            {/* Spoken Transcript Bubble */}
            {transcript && (
              <div className="w-full mt-3 p-3 rounded-2xl bg-muted/60 border border-border/60 text-xs font-mono text-foreground">
                "{transcript}"
              </div>
            )}

            {/* AI Assistant Response Box */}
            <div className="w-full mt-4 p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-500/20 text-xs text-foreground leading-relaxed">
              {aiResponse}
            </div>

            {/* Suggested commands */}
            <div className="w-full mt-4 pt-3 border-t border-border/40 flex flex-wrap justify-center gap-1.5">
              <span className="text-[10px] text-muted-foreground w-full mb-1">Try saying:</span>
              <button
                type="button"
                onClick={() => handleVoiceCommand("Mark attendance A123456")}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-muted/70 hover:bg-muted text-foreground font-mono transition-colors"
              >
                "Mark attendance A123456"
              </button>
              <button
                type="button"
                onClick={() => handleVoiceCommand("Where is my next class?")}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-muted/70 hover:bg-muted text-foreground transition-colors"
              >
                "Next class"
              </button>
              <button
                type="button"
                onClick={() => handleVoiceCommand("How many bunks in OS?")}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-muted/70 hover:bg-muted text-foreground transition-colors"
              >
                "Safe bunks"
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col p-5 gap-3.5 text-xs">
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300">
              <Apple className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs">"Hey Siri, Mark Attendance"</p>
                <p className="text-[11px] opacity-90 mt-0.5">
                  You can mark attendance by just speaking to your iPhone, Apple Watch, or HomePod without opening the portal!
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-bold text-foreground">3-Step Siri Shortcut Setup:</p>

              <div className="p-3 rounded-xl bg-muted/50 border border-border/60 space-y-2">
                <p className="text-[11px] text-foreground font-medium">
                  <strong>Step 1:</strong> Open the <strong>Shortcuts</strong> app on your iPhone and tap <strong>+ (New Shortcut)</strong>.
                </p>
                <p className="text-[11px] text-foreground font-medium">
                  <strong>Step 2:</strong> Add action: <strong>"Ask for Text"</strong> with prompt *"What is the attendance code?"*.
                </p>
                <p className="text-[11px] text-foreground font-medium">
                  <strong>Step 3:</strong> Add action: <strong>"Get Contents of URL"</strong> and paste this webhook URL:
                </p>

                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-background border border-border text-[10px] font-mono break-all">
                  <span className="flex-1 truncate">{siriShortcutWebhook}[Provided Text]</span>
                  <button
                    type="button"
                    onClick={copySiriUrl}
                    className="p-1 rounded hover:bg-muted shrink-0 text-muted-foreground hover:text-foreground"
                    title="Copy URL"
                  >
                    {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-600 dark:text-blue-400">
                ✨ Rename your shortcut to <strong>"Mark Attendance"</strong>. Next time, just say: <em>"Hey Siri, Mark Attendance"</em>!
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
