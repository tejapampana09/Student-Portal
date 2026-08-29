"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, Bell, Send, CheckCircle2, AlertTriangle, ShieldCheck, Sparkles, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/utils/useToast";
import API from "@/lib/api/axiosClient";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationPreferencesCard() {
  // WhatsApp State
  const [waPhone, setWaPhone] = useState("");
  const [waEnabled, setWaEnabled] = useState(false);
  const [waSaving, setWaSaving] = useState(false);
  const [waTesting, setWaTesting] = useState(false);

  // Push State
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [vapidKey, setVapidKey] = useState("");

  useEffect(() => {
    // 1. Fetch WhatsApp Status
    API.get("/notifications/whatsapp")
      .then((res) => {
        if (res.data?.whatsapp) {
          setWaPhone(res.data.whatsapp.phone || "");
          setWaEnabled(res.data.whatsapp.enabled || false);
        }
      })
      .catch(() => {});

    // 2. Fetch Push Status
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      setPushSupported(true);
      API.get("/notifications/push")
        .then((res) => {
          if (res.data?.success) {
            setPushEnabled(res.data.enabled);
            setVapidKey(res.data.publicKey);
          }
        })
        .catch(() => {});
    }
  }, []);

  // Handle WhatsApp Save
  const handleSaveWhatsApp = async () => {
    if (waEnabled && !waPhone.trim()) {
      toast({ title: "Phone Required", description: "Please enter your 10-digit WhatsApp number.", variant: "destructive" });
      return;
    }
    try {
      setWaSaving(true);
      await API.post("/notifications/whatsapp", {
        phone: waPhone.trim(),
        enabled: waEnabled,
      });
      toast({ title: "Saved!", description: "WhatsApp preferences updated successfully." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save WhatsApp preferences.", variant: "destructive" });
    } finally {
      setWaSaving(false);
    }
  };

  // Handle WhatsApp Test
  const handleTestWhatsApp = async () => {
    if (!waPhone.trim()) {
      toast({ title: "Enter Phone", description: "Please enter your 10-digit phone number first.", variant: "destructive" });
      return;
    }
    try {
      setWaTesting(true);
      await API.post("/notifications/whatsapp", {
        action: "test",
        phone: waPhone.trim(),
      });
      toast({ title: "Test Sent! 💬", description: "Check your WhatsApp for the test message." });
    } catch (err: any) {
      toast({ title: "Failed to Send", description: err.response?.data?.message || err.message || "WhatsApp dispatch error.", variant: "destructive" });
    } finally {
      setWaTesting(false);
    }
  };

  // Handle Push Toggle
  const handleTogglePush = async (enabled: boolean) => {
    if (!pushSupported) {
      toast({ title: "Push Unsupported", description: "Your browser or device does not support Web Push notifications.", variant: "destructive" });
      return;
    }

    try {
      setPushLoading(true);

      if (enabled) {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast({ title: "Permission Denied", description: "Please allow notifications in your browser settings.", variant: "destructive" });
          setPushEnabled(false);
          return;
        }

        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();

        let key = vapidKey;
        if (!key) {
          try {
            const keyRes = await API.get("/notifications/push");
            key = keyRes.data?.publicKey;
            if (key) setVapidKey(key);
          } catch {}
        }

        if (!subscription && key) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(key),
          });
        }

        if (subscription) {
          await API.post("/notifications/push", {
            action: "subscribe",
            subscription: subscription.toJSON(),
          });
          setPushEnabled(true);
          toast({ title: "Push Enabled! 🔔", description: "You will now receive campus alerts on this device." });
        }
      } else {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
        await API.post("/notifications/push", { action: "unsubscribe" });
        setPushEnabled(false);
        toast({ title: "Push Disabled", description: "Web push notifications have been deactivated." });
      }
    } catch (err: any) {
      toast({ title: "Push Setup Error", description: err.message || "Could not toggle push notifications.", variant: "destructive" });
      setPushEnabled(false);
    } finally {
      setPushLoading(false);
    }
  };

  // Handle Push Test
  const handleTestPush = async () => {
    try {
      setPushLoading(true);
      await API.post("/notifications/push", { action: "test" });
      toast({ title: "Test Push Sent! 🔔", description: "Look out for the notification banner." });
    } catch (err: any) {
      toast({ title: "Test Failed", description: err.message || "Failed to trigger test push.", variant: "destructive" });
    } finally {
      setPushLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-3xl p-6 border border-white/10 shadow-lg relative overflow-hidden space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Smart Alerts & Daily Morning Briefing</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              WhatsApp and Native Mobile Push Notifications
            </p>
          </div>
        </div>
        <Badge variant="outline" className="bg-white/5 text-[10px] text-muted-foreground border-white/10">
          Automated
        </Badge>
      </div>

      <div className="space-y-4">
        {/* Section 1: WhatsApp Daily Morning Briefing */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">WhatsApp Morning Briefing</h4>
                <p className="text-[11px] text-muted-foreground">Daily 7:30 AM schedule, attendance, and holiday alerts</p>
              </div>
            </div>
            <Switch
              checked={waEnabled}
              onCheckedChange={(checked) => {
                setWaEnabled(checked);
              }}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">+91</span>
              <Input
                type="tel"
                placeholder="95426 96946"
                value={
                  waPhone.length > 5
                    ? `${waPhone.slice(0, 5)} ${waPhone.slice(5, 10)}`
                    : waPhone
                }
                onChange={(e) => {
                  let digits = e.target.value.replace(/\D/g, "");
                  if (digits.startsWith("91") && digits.length > 10) {
                    digits = digits.slice(2);
                  } else if (digits.startsWith("0") && digits.length > 10) {
                    digits = digits.slice(1);
                  }
                  setWaPhone(digits.slice(0, 10));
                }}
                className="pl-11 h-8 text-xs bg-white/5 border-white/10 font-mono rounded-xl tracking-wider"
                maxLength={12}
              />
            </div>
            <Button
              size="sm"
              variant="glass"
              onClick={handleSaveWhatsApp}
              disabled={waSaving}
              className="text-xs h-8 px-3 rounded-xl font-semibold"
            >
              {waSaving ? "Saving..." : "Save"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleTestWhatsApp}
              disabled={waTesting || !waPhone}
              className="text-xs h-8 px-3 rounded-xl border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-semibold"
            >
              <Send className="h-3 w-3 mr-1" />
              {waTesting ? "Sending..." : "Test"}
            </Button>
          </div>
        </div>

        {/* Section 2: Native PWA Web Push Notifications */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">Native Mobile Push Notifications</h4>
                <p className="text-[11px] text-muted-foreground">Real-time alerts for low attendance & next class</p>
              </div>
            </div>
            <Switch
              checked={pushEnabled}
              onCheckedChange={handleTogglePush}
              disabled={pushLoading || !pushSupported}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${pushEnabled ? "bg-emerald-400 animate-pulse" : "bg-white/20"}`} />
              <span className="text-[11px] text-muted-foreground">
                {pushEnabled ? "Active on this browser/device" : "Not enabled on this device"}
              </span>
            </div>

            {pushEnabled && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleTestPush}
                disabled={pushLoading}
                className="text-[11px] h-7 px-2.5 rounded-lg text-blue-400 hover:bg-blue-500/10"
              >
                Send Test Push 🔔
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
