import axios from "axios";
import { useMongo } from "@/lib/database/useMongo";
import { NextRequest, NextResponse } from "next/server";
import { requireAuthResponse, errorResponse } from "@/server/utils/functions";

interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  footer: {
    text: string;
  };
  fields?: {
    name: string;
    value: string;
    inline: boolean;
  }[];
}

interface DiscordEmbedMessage {
  embeds: DiscordEmbed[];
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, reason: bug_description, time: timestamp } = body;
  const validTitles = ["Bug", "Feature Request", "UI Issue", "Contact", "Error"];

  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  // STRICT SECURITY FIX: Always use authenticated username, NEVER trust body.id to prevent identity spoofing
  const username = auth.payload.username;

  if (!bug_description || !title || !validTitles.includes(title)) {
    return errorResponse("Required Parameters Not Matched!");
  }

  try {
    const initDb = await useMongo();
    const db = initDb.db("college_db").collection("users");
    const user = await db.findOne({ username });

    if (!user) {
      return errorResponse("Unauthorized Access!");
    }

    const embedMessage: DiscordEmbedMessage = {
      embeds: [
        {
          title: `${username}${title ? ` (${title})` : ""}`,
          description: bug_description,
          color: 5814783,
          fields: [
            {
              name: "Authenticated Student",
              value: `> ${username}`,
              inline: true,
            },
          ],
          footer: {
            text: timestamp || new Date().toISOString(),
          },
        },
      ],
    };

    if (process.env.D_REPORT) {
      try {
        await axios.post(String(process.env.D_REPORT), embedMessage);
      } catch (webhookErr) {
        console.error("Discord report webhook failed:", webhookErr);
      }
    }

    return NextResponse.json({ success: true, message: "Report Submitted Successfully!" });
  } catch (err) {
    console.error("Error From /api/tools/report:", err);
    return errorResponse(undefined, {}, 500);
  }
}
