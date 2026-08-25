"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Bot, User, Trash2, ArrowDown, Mic, MicOff, Compass, BookOpen, Calendar, HelpCircle, Volume2, VolumeX, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/utils/useToast";
import API from "@/lib/api/axiosClient";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  { text: "Where is my next class?", icon: Calendar },
  { text: "Show my attendance & safe bunks", icon: BookOpen },
  { text: "What are my smart tasks today?", icon: Compass },
  { text: "Can I bunk any class tomorrow?", icon: HelpCircle },
];

export default function StudentAiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [voiceSpeechEnabled, setVoiceSpeechEnabled] = useState(true);
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("srmap_ai_messages");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [
      {
        id: "welcome",
        role: "assistant",
        content: "Hi! I am your **SRMAP AI Copilot & Voice Assistant** 🎓.\n\nAsk me anything by typing or tapping the 🎙️ **Microphone** below (e.g. *'Where is my next class?'*, *'How much attendance do I have?'*, or *'What are my tasks today?'*).",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ];
  });

  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    try {
      localStorage.setItem("srmap_ai_messages", JSON.stringify(messages));
    } catch {}
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const speak = (text: string) => {
    if (!voiceSpeechEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    // Clean markdown symbols for natural speech
    const clean = text
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/#/g, "")
      .replace(/`/g, "")
      .replace(/\[.*?\]\(.*?\)/g, "")
      .trim();

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // Voice Input Speech Recognition setup
  useEffect(() => {
    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        // Auto-send query on voice capture
        handleSend(transcript, true);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [messages, voiceSpeechEnabled]);

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      toast({ title: "Speech recognition not supported in this browser", variant: "destructive" });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast({ title: "Listening... 🎙️", description: "Speak your question clearly" });
      } catch {
        setIsListening(false);
      }
    }
  };

  const handleSend = async (queryText?: string, fromVoice = false) => {
    const text = (queryText || input).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const chatHistory = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await API.post("/ai/chat", {
        messages: chatHistory,
        userQuery: text,
      });

      if (res.data?.success) {
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: res.data.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, aiMsg]);
        if (fromVoice || voiceSpeechEnabled) {
          speak(res.data.answer);
        }
      } else {
        toast({ title: "AI Assistant", description: res.data?.message || "Failed to fetch response" });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "AI service temporarily unavailable.";
      toast({ title: "AI Error", description: msg, variant: "destructive" });
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `⚠️ **Error**: ${msg}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    const welcome: Message = {
      id: "welcome",
      role: "assistant",
      content: "Chat history cleared. How can I assist you with your academic schedule, attendance, or tasks?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages([welcome]);
  };

  return (
    <>
      {/* 🔮 Unified Floating AI Copilot & Voice Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 sm:bottom-6 right-5 z-40 group flex items-center gap-2.5 p-3.5 sm:px-4 sm:py-3 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-2xl hover:shadow-blue-500/50 hover:scale-105 transition-all duration-300 border border-white/30 backdrop-blur-xl"
          aria-label="Open SRMAP AI Copilot & Voice Assistant"
        >
          <div className="relative flex items-center">
            <Sparkles className="h-5 w-5 animate-pulse text-amber-300" />
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
          </div>
          <span className="hidden sm:inline font-bold text-sm tracking-wide">AI Copilot</span>
          <div className="hidden sm:flex items-center pl-1 border-l border-white/20 text-xs font-semibold text-purple-200">
            <Mic className="h-3.5 w-3.5" />
          </div>
        </button>
      )}

      {/* 🪟 AI Copilot & Voice Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 w-[92vw] sm:w-[420px] max-h-[82vh] h-[580px] flex flex-col rounded-3xl border border-white/25 dark:border-white/15 bg-white/85 dark:bg-slate-950/90 backdrop-blur-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/15 bg-gradient-to-r from-blue-600/15 via-indigo-600/10 to-purple-600/15">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md">
                <Sparkles className="h-4 w-4 text-amber-300" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  SRMAP Copilot & Voice
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-500 font-semibold">
                    Gemini 2.5
                  </span>
                </h3>
                <p className="text-[11px] text-muted-foreground">Ask attendance, timetable & tasks</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setVoiceSpeechEnabled(!voiceSpeechEnabled)}
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                title={voiceSpeechEnabled ? "Voice Speech Enabled (Mute)" : "Voice Speech Muted (Unmute)"}
              >
                {voiceSpeechEnabled ? <Volume2 className="h-3.5 w-3.5 text-purple-400" /> : <VolumeX className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={clearChat}
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                title="Clear Chat"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="h-7 w-7 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed space-y-1 ${
                    m.role === "user"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-none shadow-md"
                      : "bg-white/60 dark:bg-white/10 text-foreground border border-white/20 dark:border-white/10 rounded-bl-none shadow-sm backdrop-blur-md"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  <div className="flex items-center justify-between gap-2 pt-0.5 opacity-60 text-[9px]">
                    <span>{m.timestamp}</span>
                    {m.role === "assistant" && (
                      <button
                        onClick={() => speak(m.content)}
                        className="hover:opacity-100 flex items-center gap-0.5 text-[9px] font-semibold"
                      >
                        <Play className="h-2 w-2 fill-current" /> Speak
                      </button>
                    )}
                  </div>
                </div>

                {m.role === "user" && (
                  <div className="h-7 w-7 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 items-center text-xs text-muted-foreground bg-white/40 dark:bg-white/5 p-3 rounded-2xl w-fit border border-white/10">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                <span>Thinking & analyzing your academic record...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Carousel */}
          <div className="px-3 py-1.5 border-t border-white/10 flex gap-1.5 overflow-x-auto no-scrollbar bg-black/5 dark:bg-white/5">
            {QUICK_PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSend(p.text)}
                disabled={loading}
                className="shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-white/60 dark:bg-white/10 hover:bg-blue-500 hover:text-white border border-white/20 transition-all flex items-center gap-1 text-muted-foreground hover:border-transparent"
              >
                <p.icon className="h-3 w-3" />
                {p.text}
              </button>
            ))}
          </div>

          {/* Input Footer with Microphone */}
          <div className="p-3 border-t border-white/15 bg-background/50 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={isListening ? "Listening... Speak now 🎙️" : "Ask attendance, next class, tasks..."}
              className="flex-1 bg-white/50 dark:bg-black/40 border border-white/20 dark:border-white/10 rounded-2xl px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />

            <Button
              size="icon"
              variant="ghost"
              onClick={toggleVoice}
              className={`h-9 w-9 rounded-2xl transition-all ${
                isListening ? "bg-red-500 text-white animate-pulse shadow-red-500/50 scale-105" : "text-muted-foreground hover:text-foreground hover:bg-white/10"
              }`}
              title="Speak with Voice"
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4 text-purple-400" />}
            </Button>

            <Button
              size="icon"
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="h-9 w-9 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
