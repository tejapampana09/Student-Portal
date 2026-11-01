"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Sparkles, 
  Copy, 
  Check, 
  Smartphone, 
  Laptop, 
  Apple, 
  HelpCircle, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  ExternalLink,
  Bookmark
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function BookmarkletPage() {
  const [copied, setCopied] = useState(false);
  const [codeType, setCodeType] = useState<"compact" | "standalone">("compact");
  const [origin, setOrigin] = useState("https://52-66-250-175.sslip.io");

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.origin) {
      setOrigin(window.location.origin);
    }
  }, []);

  const compactBookmarklet = `javascript:(function(){var s=document.createElement('script');s.src='${origin}/bookmarklet.js?t='+Date.now();document.body.appendChild(s);})();`;

  const standaloneBookmarklet = `javascript:(function(){if(window.__srm_cap)return;window.__srm_cap=true;function t(m,c){var el=document.getElementById('__srm_t');if(!el){el=document.createElement('div');el.id='__srm_t';el.style.cssText='position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:999999;padding:12px 22px;border-radius:99px;font-family:sans-serif;font-size:14px;font-weight:600;color:#fff;box-shadow:0 8px 30px rgba(0,0,0,0.3);transition:all .3s ease;';document.body.appendChild(el);}el.style.background=c;el.innerHTML=m;setTimeout(function(){el.style.opacity='0';window.__srm_cap=false;},3500);}t('⏳ AI Reading Captcha...','#2563eb');var img=document.querySelector("img[src*='captchas'],img[src*='captcha']");var inp=document.querySelector("input[name='ccode'],#ccode");if(!img||!inp){t('❌ Captcha not found','#ef4444');return;}try{var c=document.createElement('canvas');c.width=img.naturalWidth||img.width||120;c.height=img.naturalHeight||img.height||40;var ctx=c.getContext('2d');ctx.drawImage(img,0,0);var b64=c.toDataURL('image/png');fetch('${origin}/api/captcha/solve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:b64})}).then(function(r){return r.json();}).then(function(d){var code=(d.captcha||d.text||'').trim();if(code){inp.value=code;inp.dispatchEvent(new Event('input',{bubbles:true}));inp.dispatchEvent(new Event('change',{bubbles:true}));inp.focus();t('✨ Solved: <strong>'+code+'</strong>','#10b981');}else{throw new Error('Failed');}}).catch(function(e){t('⚠️ Error: '+e.message,'#ef4444');});}catch(e){t('⚠️ Canvas Error','#ef4444');}})();`;

  const currentCode = codeType === "compact" ? compactBookmarklet : standaloneBookmarklet;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <Link
            href="/extension"
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15 border border-emerald-500/25 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Prefer 100% Zero-Click Auto-Solve? Get Browser Extension →</span>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            SRM Captcha Auto-Solver
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
            1-Tap AI tool that reads and auto-fills the SRM Student Portal captcha on your phone or PC. No extensions required.
          </p>
        </div>

        {/* The Bookmarklet Code Box */}
        <Card className="border-border/80 shadow-lg bg-card/60 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-blue-500" />
                  <span>The Bookmarklet Script</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Copy this JavaScript link and paste it into a browser bookmark.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={codeType === "compact" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setCodeType("compact")}
                  className="h-7 text-xs font-medium"
                >
                  Auto-Updating
                </Button>
                <Button
                  variant={codeType === "standalone" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setCodeType("standalone")}
                  className="h-7 text-xs font-medium"
                >
                  Standalone
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="relative group">
              <pre className="p-3.5 rounded-xl bg-muted/60 border border-border/60 text-xs font-mono text-muted-foreground break-all whitespace-pre-wrap max-h-28 overflow-y-auto select-all">
                {currentCode}
              </pre>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Button
                onClick={handleCopy}
                className="w-full sm:w-auto flex-1 h-11 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white gap-2 shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Copied Bookmarklet Code!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Bookmarklet Code</span>
                  </>
                )}
              </Button>

              {/* Desktop Drag Link */}
              <a
                href={currentCode}
                onClick={(e) => {
                  e.preventDefault();
                  alert("On desktop, drag this button directly to your browser bookmarks bar! On mobile, click 'Copy Bookmarklet Code' above.");
                }}
                className="hidden sm:inline-flex items-center justify-center h-11 px-4 rounded-xl border border-dashed border-blue-500/40 bg-blue-500/5 hover:bg-blue-500/10 text-xs font-semibold text-blue-500 gap-2 cursor-grab active:cursor-grabbing transition-colors"
                title="Drag to bookmarks bar"
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>Drag me to Bookmarks Bar</span>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Step-by-Step Instructions */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-blue-500" />
            <h2 className="text-lg font-bold">How to Install on Your Device</h2>
          </div>

          <Tabs defaultValue="android" className="w-full">
            <TabsList className="grid grid-cols-3 w-full bg-muted/50 p-1 rounded-xl">
              <TabsTrigger value="android" className="rounded-lg text-xs font-semibold flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-green-500" />
                <span>Android Chrome</span>
              </TabsTrigger>
              <TabsTrigger value="ios" className="rounded-lg text-xs font-semibold flex items-center gap-1.5">
                <Apple className="w-3.5 h-3.5 text-slate-300" />
                <span>iPhone Safari</span>
              </TabsTrigger>
              <TabsTrigger value="desktop" className="rounded-lg text-xs font-semibold flex items-center gap-1.5">
                <Laptop className="w-3.5 h-3.5 text-blue-400" />
                <span>PC / Laptop</span>
              </TabsTrigger>
            </TabsList>

            {/* Android Tab */}
            <TabsContent value="android" className="space-y-3 pt-3">
              <Card className="border-border/60">
                <CardContent className="p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600/15 text-blue-500 font-bold flex items-center justify-center text-xs">
                      1
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">Copy the code above</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Tap the blue <strong>"Copy Bookmarklet Code"</strong> button at the top of this page.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600/15 text-blue-500 font-bold flex items-center justify-center text-xs">
                      2
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">Bookmark this page in Chrome</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        In Chrome, tap the <strong>⋮ (Three Dots)</strong> menu at the top right, then tap the <strong>⭐ (Star icon)</strong> to bookmark.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600/15 text-blue-500 font-bold flex items-center justify-center text-xs">
                      3
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">Edit the Bookmark</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Tap <strong>"Edit"</strong> in the popup (or go to <strong>Bookmarks</strong> in menu → tap <strong>⋮</strong> next to the new bookmark → <strong>Edit</strong>):
                      </p>
                      <ul className="list-disc pl-5 mt-1.5 space-y-1 text-xs text-muted-foreground">
                        <li>Change Name to: <strong className="text-foreground">srm</strong> (or "SRM Solve")</li>
                        <li>Delete the URL completely, and <strong>Paste</strong> the copied bookmarklet code into the <strong>URL field</strong>.</li>
                        <li>Tap back to save!</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <Zap className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-emerald-500 text-xs">How to use it on SRM Portal</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Go to the SRM login page. Tap your browser address bar and type <strong>"srm"</strong>. Tap the bookmark with the star icon in suggestions. <strong>Boom!</strong> The captcha fills in 0.2s!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* iOS Tab */}
            <TabsContent value="ios" className="space-y-3 pt-3">
              <Card className="border-border/60">
                <CardContent className="p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600/15 text-blue-500 font-bold flex items-center justify-center text-xs">
                      1
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">Copy the code</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Click the blue <strong>"Copy Bookmarklet Code"</strong> button at the top.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600/15 text-blue-500 font-bold flex items-center justify-center text-xs">
                      2
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">Add any bookmark in Safari</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Tap the <strong>Share</strong> button at the bottom of Safari, then choose <strong>"Add Bookmark"</strong>. Name it <strong>"srm"</strong> and Save.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600/15 text-blue-500 font-bold flex items-center justify-center text-xs">
                      3
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">Edit the Bookmark's URL</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Open your Safari Bookmarks (book icon) → tap <strong>Edit</strong> → select <strong>"srm"</strong> → clear the URL and paste the copied code → tap <strong>Done</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <Zap className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-emerald-500 text-xs">How to use it on SRM Portal</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        On the SRM login page, tap the search bar, type <strong>"srm"</strong> and tap your bookmark. The captcha will automatically fill!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Desktop Tab */}
            <TabsContent value="desktop" className="space-y-3 pt-3">
              <Card className="border-border/60">
                <CardContent className="p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600/15 text-blue-500 font-bold flex items-center justify-center text-xs">
                      1
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">Show Bookmarks Bar</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Press <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono text-[10px]">Ctrl + Shift + B</kbd> (or <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono text-[10px]">Cmd + Shift + B</kbd> on Mac) to display your browser bookmarks bar.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600/15 text-blue-500 font-bold flex items-center justify-center text-xs">
                      2
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">Drag & Drop</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Simply click and drag the <strong>"Drag me to Bookmarks Bar"</strong> button above straight onto your bookmarks bar!
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <Zap className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-emerald-500 text-xs">How to use it</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Open SRM Student Corner login page and click the bookmark button once. It reads the captcha and enters the code automatically!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-4 rounded-2xl border border-border/60 bg-muted/20 flex flex-col gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-xs">Ultra Fast (200ms)</h3>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Uses our trained CRNN neural model optimized specifically for SRM AP's 5-letter captchas.
            </p>
          </div>
          <div className="p-4 rounded-2xl border border-border/60 bg-muted/20 flex flex-col gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <h3 className="font-semibold text-xs">Preserves Session</h3>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Renders the exact on-screen image via HTML5 Canvas without refreshing or creating new sessions.
            </p>
          </div>
          <div className="p-4 rounded-2xl border border-border/60 bg-muted/20 flex flex-col gap-1.5">
            <Smartphone className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-xs">100% Mobile Ready</h3>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Zero apps or extensions to download. Works natively in Android Chrome and Apple iOS Safari.
            </p>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="text-center pt-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-blue-500 hover:underline"
          >
            <span>Back to Student Corner Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>
    </div>
  );
}
