"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Puzzle, 
  Download, 
  Check, 
  Smartphone, 
  Laptop, 
  Zap, 
  ShieldCheck, 
  ExternalLink, 
  ArrowRight, 
  Sparkles,
  Bookmark,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ExtensionPage() {
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = () => {
    setDownloaded(true);
    const link = document.createElement("a");
    link.href = "/extension/srm-captcha-solver.zip";
    link.download = "srm-captcha-solver.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloaded(false), 3000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Top Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Zero-Click Automated Captcha Solver</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            SRM Auto-Solver Extension
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
            100% automated browser extension. The moment you open the SRM portal, the captcha is already solved and filled before you even blink!
          </p>
        </div>

        {/* Main Download Card */}
        <Card className="border-border/80 shadow-xl bg-card/70 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Puzzle className="w-5 h-5 text-blue-500" />
                  <span>Download Extension (v1.0.0)</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Manifest V3 Package • Works on Kiwi Browser (Android) and all PC browsers
                </CardDescription>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/25 self-start sm:self-auto">
                No Typing Needed
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20">
              <div className="space-y-1 text-center sm:text-left">
                <p className="text-sm font-bold text-foreground">
                  srm-captcha-solver.zip
                </p>
                <p className="text-xs text-muted-foreground">
                  Ready to install package (32 KB) • Includes popup controls & AI CRNN solver
                </p>
              </div>

              <Button
                onClick={handleDownload}
                className="w-full sm:w-auto h-11 px-6 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white gap-2 shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center"
              >
                {downloaded ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Downloaded!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download Extension (.zip)</span>
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-xl border border-border/60 bg-muted/30 flex items-center gap-2.5">
                <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>Zero clicks required</span>
              </div>
              <div className="p-3 rounded-xl border border-border/60 bg-muted/30 flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Zero session expiration</span>
              </div>
              <div className="p-3 rounded-xl border border-border/60 bg-muted/30 flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span>Android & PC support</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Setup Instructions */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span>How to Install on Mobile & PC</span>
          </h2>

          <Tabs defaultValue="kiwi" className="w-full">
            <TabsList className="grid grid-cols-2 w-full bg-muted/50 p-1 rounded-xl">
              <TabsTrigger value="kiwi" className="rounded-lg text-xs font-semibold flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                <span>Android Mobile (Kiwi Browser)</span>
              </TabsTrigger>
              <TabsTrigger value="pc" className="rounded-lg text-xs font-semibold flex items-center gap-1.5">
                <Laptop className="w-3.5 h-3.5 text-blue-400" />
                <span>PC / Laptop (Chrome / Edge / Brave)</span>
              </TabsTrigger>
            </TabsList>

            {/* Mobile Kiwi Tab */}
            <TabsContent value="kiwi" className="space-y-3 pt-3">
              <Card className="border-border/60">
                <CardContent className="p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600/15 text-blue-500 font-bold flex items-center justify-center text-xs">
                      1
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">Install Kiwi Browser (Free)</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Kiwi Browser is a fast Chrome-based browser for Android with full extension support.
                      </p>
                      <a
                        href="https://play.google.com/store/apps/details?id=com.kiwibrowser.browser"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-500 font-semibold hover:underline mt-1.5"
                      >
                        <span>Download Kiwi Browser from Google Play Store</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600/15 text-blue-500 font-bold flex items-center justify-center text-xs">
                      2
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">Download the extension zip file</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Tap the blue <strong>"Download Extension (.zip)"</strong> button above on your phone.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600/15 text-blue-500 font-bold flex items-center justify-center text-xs">
                      3
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">Load Extension into Kiwi</p>
                      <ul className="list-disc pl-5 mt-1 space-y-1 text-xs text-muted-foreground">
                        <li>In Kiwi Browser, tap the top-right <strong>⋮ (Three dots)</strong> → select <strong>Extensions</strong>.</li>
                        <li>Turn on <strong>"Developer mode"</strong> switch (top right).</li>
                        <li>Tap the <strong>"+ (from .zip / .crx / .user.js)"</strong> button.</li>
                        <li>Select the downloaded <code className="text-foreground font-mono">srm-captcha-solver.zip</code> file.</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <Zap className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-emerald-500 text-xs">Finished! 100% Zero-Type Login</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Now open SRM login page in Kiwi Browser. The captcha solves and auto-fills instantly without you touching or typing anything!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PC Desktop Tab */}
            <TabsContent value="pc" className="space-y-3 pt-3">
              <Card className="border-border/60">
                <CardContent className="p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600/15 text-blue-500 font-bold flex items-center justify-center text-xs">
                      1
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">Download & Extract</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Download <strong className="text-foreground">srm-captcha-solver.zip</strong> using the button above and extract it into a folder.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600/15 text-blue-500 font-bold flex items-center justify-center text-xs">
                      2
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">Open Chrome Extensions</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        In Chrome / Brave / Edge, type <code className="text-foreground font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]">chrome://extensions</code> in the URL bar.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600/15 text-blue-500 font-bold flex items-center justify-center text-xs">
                      3
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">Load Unpacked</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Toggle on <strong>"Developer mode"</strong> at the top right, click <strong>"Load unpacked"</strong> at the top left, and choose the extracted folder.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <Zap className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-emerald-500 text-xs">You're All Set</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Whenever you visit SRM Student Corner login page, your captcha is filled in automatically!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Alternative: Bookmarklet notice */}
        <div className="p-4 rounded-2xl border border-border/70 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Bookmark className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-foreground">Don't want to install Kiwi Browser?</p>
              <p className="text-[11px] text-muted-foreground">
                You can use our 1-Tap Bookmarklet for regular Mobile Chrome & Safari.
              </p>
            </div>
          </div>
          <Link
            href="/bookmarklet"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-500 hover:text-blue-400 whitespace-nowrap self-start sm:self-auto"
          >
            <span>View Bookmarklet</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Bottom Nav */}
        <div className="text-center pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <span>Back to Student Corner Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>
    </div>
  );
}
