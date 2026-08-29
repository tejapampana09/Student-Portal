import axios from "axios";
import { useMongo } from "@/lib/database/useMongo";
import { NextRequest, NextResponse } from "next/server";
import { PARAMETERS, UNAUTHORIZED } from "@/shared/utils/messages";
import {
  requireAuthResponse,
  errorResponse,
  revokeAllAuthSessions,
} from "@/server/utils/functions";

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

function maskUsername(u: string): string {
  if (!u || u.length <= 4) return "****";
  return `${u.slice(0, 3)}****${u.slice(-3)}`;
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { reason } = body;

  if (!reason) return errorResponse(PARAMETERS);

  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const initDb = await useMongo();
    const db = initDb.db("college_db").collection("users");
    const user = await db.findOne({ username: auth.payload.username });

    if (!user) return errorResponse(UNAUTHORIZED);

    const deleteResult = await db.deleteOne({ username: auth.payload.username });
    await revokeAllAuthSessions(auth.payload.username);

    if (deleteResult.deletedCount !== 1) return errorResponse("Failed To Delete Account!");

    const maskedId = maskUsername(auth.payload.username);
    const embedMessage: DiscordEmbedMessage = {
      embeds: [
        {
          title: `Account Deleted (${maskedId})`,
          description: "Student data permanently deleted from primary database.",
          color: 15158332,
          fields: [
            {
              name: "Masked ID",
              value: `> ${maskedId}`,
              inline: true,
            },
            {
              name: "Deletion Reason",
              value: `> ${String(reason).slice(0, 200)}`,
              inline: false,
            },
          ],
          footer: {
            text: new Date().toISOString(),
          },
        },
      ],
    };

    if (process.env.D_REPORT) {
      try {
        const res = await axios.post(String(process.env.D_REPORT), embedMessage);
        if (res.status >= 400) {
          console.error(`[CRITICAL AUDIT] Account deletion Discord webhook returned status: ${res.status} for user: ${maskedId}`);
        }
      } catch (discordError: any) {
        console.error(`[CRITICAL AUDIT] Account deletion Discord webhook delivery failed for user: ${maskedId}:`, discordError?.message || discordError);
      }
    } else {
      console.warn(`[AUDIT NOTICE] Account deletion completed for user ${maskedId}, but D_REPORT webhook is not configured.`);
    }

    return NextResponse.json({ success: true, message: "Data Deleted Successfully!" });
  } catch (err) {
    console.error("Error From /api/auth/delete:", err);
    return errorResponse(undefined, {}, 500);
  }
}
