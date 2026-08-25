import { NextRequest, NextResponse } from "next/server";
import { useMongo } from "@/lib/database/useMongo";
import { errorResponse, requireAuthResponse } from "@/server/utils/functions";
import { sendWebPushNotification } from "@/server/notifications/webPushService";

export async function GET(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const initDb = await useMongo();
    const user = await initDb.db("college_db").collection<any>("users").findOne(
      { username: auth.payload.username },
      { projection: { pushSubscription: 1 } }
    );

    return NextResponse.json({
      success: true,
      enabled: !!user?.pushSubscription,
      publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
    });
  } catch (error: any) {
    return errorResponse("Failed to fetch push status", {}, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { action, subscription } = body;

    const initDb = await useMongo();
    const usersCollection = initDb.db("college_db").collection("users");

    if (action === "test") {
      const user = await usersCollection.findOne(
        { username: auth.payload.username },
        { projection: { pushSubscription: 1 } }
      );

      const sub = subscription || user?.pushSubscription;
      if (!sub) {
        return errorResponse("No active push subscription found on device.");
      }

      const sent = await sendWebPushNotification(sub, {
        title: "SRMAP Student Portal 🔔",
        body: "Native Web Push notifications are now active on your device! 🚀",
        url: "/dashboard",
      });

      if (sent) {
        return NextResponse.json({ success: true, message: "Test push notification sent successfully!" });
      } else {
        return errorResponse("Failed to deliver push notification.", {}, 500);
      }
    }

    if (action === "unsubscribe") {
      await usersCollection.updateOne(
        { username: auth.payload.username },
        { $unset: { pushSubscription: "" } }
      );
      return NextResponse.json({ success: true, message: "Unsubscribed from push notifications." });
    }

    // Default: Subscribe
    if (!subscription) {
      return errorResponse("Push subscription payload required.");
    }

    await usersCollection.updateOne(
      { username: auth.payload.username },
      {
        $set: {
          pushSubscription: subscription,
          pushUpdatedAt: new Date().toISOString(),
        },
      }
    );

    return NextResponse.json({ success: true, message: "Push subscription saved successfully" });
  } catch (error: any) {
    return errorResponse(error?.message || "Failed to update push subscription", {}, 500);
  }
}
