"use client";
import React, { useState } from "react";
import { Mic, MicOff, Volume2, Sparkles, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import API from "@/lib/api/axiosClient";
import { useRouter } from "next/navigation";

export const FloatingVoiceAssistant: React.FC = () => {
  const router = useRouter();
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [processing, setProcessing] = useState(false);

  const speak = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleProcessQuery = async (query: string) => {
    const q = query.toLowerCase();
    setProcessing(true);

    try {
      if (q.includes("attendance") || q.includes("bunk") || q.includes("percentage")) {
        const res = await API.get("/voice/attendance");
        if (res.data?.speech) {
          setAiResponse(res.data.speech);
          speak(res.data.speech);
        }
      } else if (q.includes("class") || q.includes("next") || q.includes("room") || q.includes("venue") || q.includes("timetable")) {
        const res = await API.get("/voice/next-class");
        if (res.data?.speech) {
          setAiResponse(res.data.speech);
          speak(res.data.speech);
        }
      } else if (q.includes("task") || q.includes("todo") || q.includes("coursera") || q.includes("potd") || q.includes("striver")) {
        const res = await API.get("/voice/tasks");
        if (res.data?.speech) {
          setAiResponse(res.data.speech);
          speak(res.data.speech);
        }
      } else if (q.includes("open career") || q.includes("career")) {
        router.push("/career");
        setAiResponse("Opening Career and Placement Launchpad.");
        speak("Opening Career and Placement Launchpad.");
      } else {
        setAiResponse("I can help you check your next class, attendance percentage, or daily smart tasks. Try asking: 'What's my attendance?'");
        speak("I can help you check your next class, attendance, or tasks.");
      }
    } catch {
      setAiResponse("Sorry, I had trouble retrieving your data.");
    } finally {
      setProcessing(false);
    }
  };

  const startListening = () => {
    if (typeof window === "undefined" || !("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Speech recognition is not supported in this browser. Please use Chrome/Edge or setup Siri/Google Assistant.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setOpenDrawer(true);
      setSpokenText("Listening...");
      setAiResponse(null);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSpokenText(`"${transcript}"`);
      handleProcessQuery(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setSpokenText("Could not hear clearly. Tap to try again.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <>
      {/* Floating Glowing Microphone Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          onClick={startListening}
          className={`h-14 w-14 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center ${
            isListening
              ? "bg-red-500 animate-pulse scale-110 shadow-red-500/50"
              : "bg-gradient-to-tr from-purple-600 to-indigo-600 hover:scale-105 shadow-purple-600/40"
          }`}
        >
          {isListening ? (
            <MicOff className="h-6 w-6 text-white" />
          ) : (
            <Mic className="h-6 w-6 text-white" />
          )}
        </Button>
      </div>

      {/* In-Portal Voice Drawer */}
      {openDrawer && (
        <div className="fixed bottom-24 right-6 z-50 max-w-sm w-[90vw] p-5 rounded-3xl backdrop-blur-2xl bg-black/80 border border-white/20 shadow-2xl space-y-3 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-bold text-foreground">SRM Voice Assistant</span>
            </div>
            <button
              onClick={() => setOpenDrawer(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-purple-300 italic">{spokenText}</p>
            {processing ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />
                Processing request...
              </div>
            ) : aiResponse ? (
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs text-foreground leading-relaxed flex items-start gap-2">
                <Volume2 className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                <span>{aiResponse}</span>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
};
