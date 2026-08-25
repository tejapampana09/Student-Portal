import webpush from "web-push";

let vapidConfigured = false;

function ensureVapidConfig() {
  if (vapidConfigured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@srmap.edu.in";

  if (publicKey && privateKey) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
  }
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
): Promise<boolean> {
  ensureVapidConfig();
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

    await webpush.sendNotification(subscription, dataString);
    return true;
  } catch (error: any) {
    console.error("Error sending web push notification:", error?.message || error);
    return false;
  }
}
