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
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON payload", {}, 400);
  }

  const { title, reason: bug_description } = body;
  const validTitles = ["Bug", "Feature Request", "UI Issue", "Contact", "Error"];

  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  // STRICT VALIDATION: Title check, reason type check, length bounds (10 to 4000 chars)
  if (
    typeof title !== "string" ||
    !validTitles.includes(title.trim()) ||
    typeof bug_description !== "string" ||
    bug_description.trim().length < 10 ||
    bug_description.length > 4000
  ) {
    return errorResponse(
      "Validation Failed: Title must be a valid category and reason must be between 10 and 4000 characters.",
      {},
      400
    );
  }

  const username = auth.payload.username;
  const serverTimestamp = new Date().toISOString();

  try {
    const initDb = await useMongo();
    const db = initDb.db("college_db").collection("users");
    const user = await db.findOne({ username });

    if (!user) {
      return errorResponse("Unauthorized Access!", {}, 401);
    }

    const embedMessage: DiscordEmbedMessage = {
      embeds: [
        {
          title: `${username} (${title.trim()})`,
          description: bug_description.trim(),
          color: 5814783,
          fields: [
            {
              name: "Authenticated Student",
              value: `> ${username}`,
              inline: true,
            },
          ],
          footer: {
            text: serverTimestamp,
          },
        },
      ],
    };

    if (!process.env.D_REPORT) {
      console.error("D_REPORT webhook environment variable is not configured.");
      return errorResponse("Reporting service is currently unconfigured.", {}, 503);
    }

    try {
      const webhookRes = await axios.post(String(process.env.D_REPORT), embedMessage);
      if (webhookRes.status >= 400) {
        throw new Error(`Discord webhook returned status ${webhookRes.status}`);
      }
    } catch (webhookErr) {
      console.error("Discord report webhook failed:", webhookErr);
      return errorResponse("Failed to deliver report to support team. Please try again later.", {}, 502);
    }

    return NextResponse.json({ success: true, message: "Report Submitted Successfully!" });
  } catch (err) {
    console.error("Error From /api/tools/report:", err);
    return errorResponse(undefined, {}, 500);
  }
}
