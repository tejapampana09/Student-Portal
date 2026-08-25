"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Bot, User, Trash2, ArrowDown, Mic, MicOff, Compass, BookOpen, Calendar, HelpCircle } from "lucide-react";
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
  { text: "Can I bunk any class tomorrow?", icon: Compass },
  { text: "Where is my next class?", icon: Calendar },
  { text: "Show my attendance analysis", icon: BookOpen },
  { text: "Find faculty cabin location", icon: HelpCircle },
];

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
        content: "Hi! I am your **SRMAP AI Academic Copilot** 🎓. I can check your live attendance, calculate bunk safe limits, find your classrooms & faculty cabins, or answer questions about your timetable. How can I help you today?",
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
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      toast({ title: "Speech recognition not supported in this browser", variant: "destructive" });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
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
      content: "Chat history cleared. How can I assist you with your academic schedule or attendance?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages([welcome]);
  };

  return (
    <>
      {/* 🔮 Floating Glow Orb Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 sm:bottom-6 right-5 z-40 group flex items-center gap-2 p-3.5 sm:px-4 sm:py-3 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-2xl hover:shadow-blue-500/50 hover:scale-105 transition-all duration-300 border border-white/30 backdrop-blur-xl"
          aria-label="Open SRMAP AI Copilot"
        >
          <div className="relative">
            <Sparkles className="h-5 w-5 animate-pulse text-amber-300" />
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
          </div>
          <span className="hidden sm:inline font-semibold text-sm tracking-wide">AI Copilot</span>
        </button>
      )}

      {/* 🪟 Apple Liquid Glass AI Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 w-[92vw] sm:w-[420px] max-h-[82vh] h-[580px] flex flex-col rounded-3xl border border-white/25 dark:border-white/15 bg-white/80 dark:bg-slate-950/85 backdrop-blur-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/15 bg-gradient-to-r from-blue-600/15 via-indigo-600/10 to-purple-600/15">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md">
                <Sparkles className="h-4 w-4 text-amber-300" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  SRMAP Copilot
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-500 font-semibold">
                    Gemini 2.5
                  </span>
                </h3>
                <p className="text-[11px] text-muted-foreground">Live Academic & Attendance Assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={clearChat}
                title="Clear Chat"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar text-sm">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="h-7 w-7 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 text-blue-500 mt-0.5">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-[82%] rounded-2xl p-3 shadow-sm ${
                    m.role === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-white/40 dark:bg-white/10 border border-white/20 dark:border-white/10 text-foreground rounded-bl-none backdrop-blur-md whitespace-pre-wrap leading-relaxed"
                  }`}
                >
                  <div className="text-[13px]">{m.content.replace(/\*\*(.*?)\*\*/g, "$1").replace(/^#+\s+/gm, "").replace(/---/g, "").trim()}</div>
                  <span
                    className={`block text-[9px] mt-1.5 ${
                      m.role === "user" ? "text-blue-100 text-right" : "text-muted-foreground text-left"
                    }`}
                  >
                    {m.timestamp}
                  </span>
                </div>

                {m.role === "user" && (
                  <div className="h-7 w-7 rounded-xl bg-slate-700/20 flex items-center justify-center shrink-0 text-foreground mt-0.5">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 items-center">
                <div className="h-7 w-7 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-500">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-white/40 dark:bg-white/10 rounded-2xl p-3 border border-white/20 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" />
                  <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                  <span className="h-2 w-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0.4s]" />
                </div>
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

          {/* Input Footer */}
          <div className="p-3 border-t border-white/15 bg-background/50 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask attendance, timetable, cabins..."
              className="flex-1 bg-white/50 dark:bg-black/40 border border-white/20 dark:border-white/10 rounded-2xl px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />

            <Button
              size="icon"
              variant="ghost"
              onClick={toggleVoice}
              className={`h-8 w-8 rounded-xl ${
                isListening ? "bg-red-500/20 text-red-500 animate-pulse" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Voice Input"
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>

            <Button
              size="icon"
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="h-8 w-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
