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
      toast({ title: "Message Sent! 🚀", description: "Check your WhatsApp for the test alert." });
    } catch (err: any) {
      toast({ title: "Test Failed", description: err.message || "Could not deliver WhatsApp message.", variant: "destructive" });
    } finally {
      setWaTesting(false);
    }
  };

  // Handle Push Toggle
  const handleTogglePush = async (checked: boolean) => {
    if (!pushSupported) {
      toast({ title: "Not Supported", description: "Web push is not supported in this browser.", variant: "destructive" });
      return;
    }

    try {
      setPushLoading(true);

      if (!checked) {
        // Unsubscribe
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
        await API.post("/notifications/push", { action: "unsubscribe" });
        setPushEnabled(false);
        toast({ title: "Push Disabled", description: "You will no longer receive browser push notifications." });
        return;
      }

      // Request Permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast({ title: "Permission Denied", description: "Please allow notifications in your browser settings.", variant: "destructive" });
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const key = vapidKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });

      await API.post("/notifications/push", { subscription: sub.toJSON() });
      setPushEnabled(true);
      toast({ title: "Push Activated! 🔔", description: "You will now receive live alerts on your device." });
    } catch (err: any) {
      console.error("Push subscription error:", err);
      toast({ title: "Subscription Error", description: err.message || "Could not register push notifications.", variant: "destructive" });
    } finally {
      setPushLoading(false);
    }
  };

  // Handle Push Test
  const handleTestPush = async () => {
    try {
      setPushLoading(true);
      await API.post("/notifications/push", { action: "test" });
      toast({ title: "Push Triggered!", description: "Notification sent to your device." });
    } catch (err: any) {
      toast({ title: "Test Error", description: err.message || "Failed to trigger push notification.", variant: "destructive" });
    } finally {
      setPushLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-3xl p-6 flex flex-col justify-between border border-white/10 shadow-lg relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="space-y-6">
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              Smart Alerts & Briefings
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Automated daily WhatsApp digests and native mobile push notifications.
            </p>
          </div>
        </div>

        {/* Section 1: WhatsApp AI Daily Morning Briefing */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">WhatsApp Morning Briefing</h4>
                <p className="text-[11px] text-muted-foreground">7:30 AM Timetable, Low Attendance & Circulars</p>
              </div>
            </div>
            <Switch
              checked={waEnabled}
              onCheckedChange={(val) => {
                setWaEnabled(val);
              }}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2 text-xs font-mono text-muted-foreground">+91</span>
              <Input
                type="tel"
                placeholder="9876543210"
                value={waPhone.replace(/^91/, "")}
                onChange={(e) => setWaPhone(e.target.value)}
                className="pl-11 h-8 text-xs bg-white/5 border-white/10 font-mono rounded-xl"
                maxLength={10}
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
