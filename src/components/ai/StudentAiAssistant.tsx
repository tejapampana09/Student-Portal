"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Bot, User, Trash2, Mic, MicOff, Compass, BookOpen, Calendar, HelpCircle, Loader2 } from "lucide-react";
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

function cleanAiStars(text: string): string {
  if (!text) return "";
  return text
    .replace(/\*\*\*(.*?)\*\*\*/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/(^|[^\*])\*(?!\*)(.*?)\*/g, "$1$2")
    .replace(/^\s*\*\s+/gm, "• ")
    .trim();
}

export default function StudentAiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
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
        content: "Hi! I am your SRMAP Campus AI Copilot 🎓.\n\nAsk me anything by typing or tapping the 🎙️ mic below — attendance, next class, exams, study doubts, coding questions, or general queries!",
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

  // Voice Input Speech Recognition setup (Voice-to-Text ONLY)
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
        handleSend(transcript);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [messages]);

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

  const handleSend = async (queryText?: string) => {
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
          content: `⚠️ Error: ${msg}`,
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
      content: "Chat history cleared. How can I assist you with your schedule, attendance, doubts, or tasks today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages([welcome]);
  };

  return (
    <>
      {/* 🔮 Floating AI Copilot Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 sm:bottom-6 right-4 sm:right-6 z-40 group flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 text-white shadow-xl hover:shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all duration-300 border border-white/20 backdrop-blur-xl"
          aria-label="Open SRMAP AI Copilot"
        >
          <div className="relative flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400" />
          </div>
          <span className="font-semibold text-xs sm:text-sm tracking-wide">Campus AI</span>
          <div className="flex items-center pl-1.5 border-l border-white/20 text-blue-200">
            <Mic className="h-3.5 w-3.5" />
          </div>
        </button>
      )}

      {/* 🪟 Sleek Modern AI Copilot Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 sm:bottom-6 right-3 sm:right-6 z-50 w-[94vw] sm:w-[420px] max-h-[84vh] h-[580px] flex flex-col rounded-3xl border border-black/10 dark:border-white/15 bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-250">
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/10 bg-gradient-to-r from-blue-600/10 via-sky-600/10 to-indigo-600/10">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-500 flex items-center justify-center text-white shadow-sm">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 leading-none">
                  <h3 className="font-bold text-xs sm:text-sm text-foreground">
                    Campus Copilot
                  </h3>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold font-mono">
                    3.1 Lite
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Instant answers for academics & campus
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={clearChat}
                className="h-7 w-7 rounded-xl text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10"
                title="Clear Chat History"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 rounded-xl text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10"
                title="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="h-7 w-7 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[84%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed space-y-1 shadow-sm ${
                    m.role === "user"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-sm"
                      : "bg-black/[0.03] dark:bg-white/[0.06] text-foreground border border-black/5 dark:border-white/10 rounded-bl-sm"
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans text-xs">
                    {cleanAiStars(m.content)}
                  </div>
                  <div className="flex items-center justify-end pt-0.5 opacity-50 text-[9px]">
                    <span>{m.timestamp}</span>
                  </div>
                </div>

                {m.role === "user" && (
                  <div className="h-7 w-7 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 items-center text-xs text-muted-foreground bg-black/[0.03] dark:bg-white/[0.05] px-3.5 py-2.5 rounded-2xl w-fit border border-black/5 dark:border-white/10">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                <span>Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Carousel */}
          <div className="px-3 py-1.5 border-t border-black/5 dark:border-white/10 flex gap-1.5 overflow-x-auto no-scrollbar bg-black/[0.02] dark:bg-white/[0.02]">
            {QUICK_PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSend(p.text)}
                disabled={loading}
                className="shrink-0 text-[10px] sm:text-[11px] px-2.5 py-1 rounded-full bg-white dark:bg-white/10 hover:bg-blue-600 hover:text-white border border-black/5 dark:border-white/10 transition-all flex items-center gap-1 text-muted-foreground hover:border-transparent active:scale-95"
              >
                <p.icon className="h-3 w-3" />
                <span>{p.text}</span>
              </button>
            ))}
          </div>

          {/* Clean Input Footer with Mic & Send */}
          <div className="p-2.5 sm:p-3 border-t border-black/5 dark:border-white/10 bg-background/80 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={isListening ? "Listening... Speak now 🎙️" : "Ask anything..."}
              className="flex-1 bg-black/[0.04] dark:bg-white/[0.06] border border-black/5 dark:border-white/10 rounded-2xl px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />

            {/* Voice Input Button (Mic ONLY) */}
            <Button
              size="icon"
              type="button"
              variant="ghost"
              onClick={toggleVoice}
              className={`h-9 w-9 rounded-2xl transition-all ${
                isListening
                  ? "bg-red-500 text-white animate-pulse shadow-md shadow-red-500/50 scale-105"
                  : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10"
              }`}
              title="Voice Input (Speech-to-Text)"
              aria-label="Voice Input"
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4 text-blue-500" />}
            </Button>

            {/* Send Button */}
            <Button
              size="icon"
              type="button"
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="h-9 w-9 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm disabled:opacity-40 transition-transform active:scale-95"
              aria-label="Send message"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
