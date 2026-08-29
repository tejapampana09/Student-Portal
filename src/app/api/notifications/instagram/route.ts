import { NextRequest, NextResponse } from "next/server";
import { requireAuthResponse } from "@/server/utils/functions";
import { useMongo } from "@/lib/database/useMongo";
import { sendInstagramDirectMessage } from "@/server/notifications/instagramService";

export async function GET(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const initDb = await useMongo();
    const user = await initDb.db("college_db").collection<any>("users").findOne(
      { username: auth.payload.username },
      { projection: { instagram: 1 } }
    );

    return NextResponse.json({
      success: true,
      instagram: user?.instagram || { handle: "", enabled: false },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Failed to fetch Instagram settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { action, handle, enabled } = body;
    const initDb = await useMongo();
    const usersCollection = initDb.db("college_db").collection("users");

    if (action === "save") {
      const cleanHandle = (handle || "").replace(/^@/, "").trim();
      await usersCollection.updateOne(
        { username: auth.payload.username },
        {
          $set: {
            "instagram.handle": cleanHandle,
            "instagram.enabled": Boolean(enabled),
            "instagram.updatedAt": new Date().toISOString(),
          },
        },
        { upsert: true }
      );

      return NextResponse.json({
        success: true,
        message: "Instagram settings updated successfully",
        instagram: { handle: cleanHandle, enabled: Boolean(enabled) },
      });
    }

    if (action === "test") {
      const user = await usersCollection.findOne({ username: auth.payload.username });
      const targetHandle = (handle || user?.instagram?.handle || "").replace(/^@/, "").trim();

      if (!targetHandle) {
        return NextResponse.json({ success: false, message: "Please provide an Instagram username." }, { status: 400 });
      }

      const testMsg = `🚀 Test Notification from SRMAP Student Portal!\n\nHey @${targetHandle}, your Instagram DM alerts are connected.\nYou'll receive daily morning briefings & attendance alerts here! 🎓`;
      const result = await sendInstagramDirectMessage(targetHandle, testMsg);

      if (!result.success) {
        return NextResponse.json({ success: false, message: result.error || "Failed to send Instagram DM" }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Test Direct Message sent to @${targetHandle}! 📩`,
      });
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Error in Instagram notification route:", error);
    return NextResponse.json({ success: false, message: error?.message || "Internal server error" }, { status: 500 });
  }
}
