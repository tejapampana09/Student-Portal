"use client";
import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Register service worker
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          console.log("[PWA] Service Worker registered:", registration.scope);
        })
        .catch((error) => {
          console.warn("[PWA] Service Worker registration failed:", error);
        });
    }
  }, []);

  return null;
}
