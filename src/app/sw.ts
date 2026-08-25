/// <reference lib="webworker" />

import { CacheFirst, ExpirationPlugin, NetworkOnly, StaleWhileRevalidate } from "serwist";
import { installSerwist } from "@serwist/sw";
import type { PrecacheEntry } from "@serwist/precaching";

declare global {
  interface WorkerGlobalScope {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

installSerwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }) =>
        url.origin === "https://student.srmap.edu.in" &&
        url.pathname.startsWith("/srmapstudentcorner/resources/photos/"),
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ url }) =>
        url.pathname === "/_next/image" &&
        url.searchParams.get("url")?.startsWith("https://student.srmap.edu.in/srmapstudentcorner/resources/photos/") === true,
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ url }) => url.pathname.startsWith("/student/srmapstudentcorner/resources/photos/"),
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ url }) => url.pathname.startsWith("/student/srmapstudentcorner/captchas"), 
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ url }) =>
        url.pathname === "/student-enhancer.js",
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ request, url }) =>
        request.destination === "image" &&
        url.origin === self.location.origin &&
        !url.pathname.startsWith("/student/"),
      handler: new CacheFirst({
        cacheName: "site-images",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 200,
            maxAgeSeconds: 60 * 60 * 24 * 30,
          }),
        ],
      }),
    },
    {
      matcher: ({ request }) =>
        request.destination === "script" ||
        request.destination === "style",
      handler: new StaleWhileRevalidate(),
    },
    {
      matcher: ({ request }) =>
        request.mode === "navigate",
      handler: new StaleWhileRevalidate(),
    },
  ],
  cleanupOutdatedCaches: true,
});

// 🔔 Web Push Notification Handlers
self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || "SRMAP Student Portal 🎓";
    const options: any = {
      body: data.body || "You have a new update.",
      icon: data.icon || "/icons/192x192.png",
      badge: data.badge || "/icons/round_corner_logo.png",
      vibrate: [100, 50, 100],
      data: {
        url: data.data?.url || "/dashboard",
      },
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification("SRMAP Portal", {
        body: text,
        icon: "/icons/192x192.png",
      })
    );
  }
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(urlToOpen) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});