import webpush from "web-push";

let vapidConfigured = false;

function ensureVapidConfig(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@srmap.edu.in";

  if (!publicKey || !privateKey) {
    console.error("[WebPush] VAPID keys missing — NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set");
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export interface WebPushResult {
  success: boolean;
  statusCode?: number;
  /** true when subscription is gone (410/404) — caller should delete it from DB */
  subscriptionExpired?: boolean;
  error?: string;
}

export async function sendWebPushNotification(
  subscription: webpush.PushSubscription,
  payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    url?: string;
  }
): Promise<WebPushResult> {
  if (!ensureVapidConfig()) {
    return { success: false, error: "VAPID keys not configured on server." };
  }

  try {
    const dataString = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/icons/icon-192x192.png",
      badge: payload.badge || "/icons/badge-72x72.png",
      data: {
        url: payload.url || "/dashboard",
      },
    });

    const result = await webpush.sendNotification(subscription, dataString);
    console.log(`[WebPush] Delivered — status ${result.statusCode}`);
    return { success: true, statusCode: result.statusCode };
  } catch (error: any) {
    const statusCode: number | undefined = error?.statusCode;
    const body: string = error?.body || "";

    if (statusCode === 410 || statusCode === 404) {
      // Subscription expired or unregistered — caller must delete it from DB
      console.warn(`[WebPush] Subscription expired (${statusCode}) — marking for removal`);
      return { success: false, statusCode, subscriptionExpired: true, error: "Subscription expired" };
    }

    if (statusCode === 401 || statusCode === 403) {
      console.error(`[WebPush] VAPID auth failure (${statusCode}): ${body}`);
      return { success: false, statusCode, error: "Push service authentication error. Check VAPID keys." };
    }

    if (statusCode === 400) {
      console.error(`[WebPush] Bad request (400): ${body}`);
      return { success: false, statusCode, error: "Malformed push request." };
    }

    console.error(`[WebPush] Unexpected error — status: ${statusCode ?? "N/A"}, body: ${body}, msg: ${error?.message}`);
    return { success: false, statusCode, error: error?.message || "Failed to deliver push notification." };
  }
}
