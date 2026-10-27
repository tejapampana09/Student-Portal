"use client";
import { useEffect, useState } from "react";
import { Download, X, Share, PlusSquare, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (standalone) {
      setIsStandalone(true);
      return;
    }

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIosDevice);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const dismissed = localStorage.getItem("pwa_install_dismissed");
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Listen to manual triggers (e.g. from More Drawer)
    const manualTriggerHandler = () => {
      if (standalone) {
        alert("Student Corner is already installed and running!");
        return;
      }
      if (isIosDevice) {
        setShowIOSGuide(true);
      } else if (deferredPrompt) {
        handleInstallClick();
      } else {
        setShowPrompt(true);
      }
    };

    window.addEventListener("trigger-pwa-install", manualTriggerHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("trigger-pwa-install", manualTriggerHandler);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (isIOS) {
        setShowIOSGuide(true);
      }
      return;
    }
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowPrompt(false);
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.warn("PWA install prompt error:", err);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa_install_dismissed", "true");
  };

  if (isStandalone) return null;

  return (
    <>
      {/* Chrome / Android floating install pill */}
      {showPrompt && deferredPrompt && (
        <div className="fixed bottom-24 sm:bottom-6 right-4 sm:right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 max-w-sm">
          <div className="p-3.5 rounded-2xl border border-border/80 bg-background/95 shadow-2xl backdrop-blur-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/15 text-blue-500 flex items-center justify-center shrink-0">
              <Download className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground truncate">Install Student Corner</p>
              <p className="text-[11px] text-muted-foreground truncate">Fast, full-screen app experience</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                size="sm"
                onClick={handleInstallClick}
                className="h-8 text-xs px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                Install
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleDismiss}
                className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Install Instructions Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-background border border-border p-5 space-y-4 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <Download className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Install on iPhone / iPad</h3>
                  <p className="text-[11px] text-muted-foreground">Add to home screen</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowIOSGuide(false)}
                className="h-7 w-7 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3 text-xs text-foreground/90">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/50 border border-border/40">
                <div className="p-1.5 rounded-lg bg-blue-600/15 text-blue-500 mt-0.5">
                  <Share className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">1. Tap Share</p>
                  <p className="text-[11px] text-muted-foreground">Tap the Share icon at the bottom of Safari browser.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/50 border border-border/40">
                <div className="p-1.5 rounded-lg bg-indigo-600/15 text-indigo-500 mt-0.5">
                  <PlusSquare className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">2. Select &apos;Add to Home Screen&apos;</p>
                  <p className="text-[11px] text-muted-foreground">Scroll down in the share sheet and tap &quot;Add to Home Screen&quot;.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/50 border border-border/40">
                <div className="p-1.5 rounded-lg bg-emerald-600/15 text-emerald-500 mt-0.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">3. Launch Standalone App</p>
                  <p className="text-[11px] text-muted-foreground">Open Student Corner directly from your Home Screen with full-screen view.</p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setShowIOSGuide(false)}
              className="w-full h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
