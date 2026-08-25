import { google } from "googleapis";

export function getOAuth2Client(redirectUri?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials are not configured in environment variables.");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getGmailAuthUrl(redirectUri: string, state: string) {
  const oauth2Client = getOAuth2Client(redirectUri);
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    state,
  });
}

export interface StudentEmail {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  isImportant: boolean;
}

export async function fetchStudentEmails(refreshToken: string, maxResults = 8): Promise<StudentEmail[]> {
  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const response = await gmail.users.messages.list({
      userId: "me",
      q: "newer_than:7d -label:SPAM -label:TRASH",
      maxResults,
    });

    const messages = response.data.messages || [];
    const emails: StudentEmail[] = [];

    for (const msg of messages) {
      if (!msg.id) continue;
      try {
        const detail = await gmail.users.messages.get({
          userId: "me",
          id: msg.id,
          format: "metadata",
          metadataHeaders: ["From", "Subject", "Date"],
        });

        const headers = detail.data.payload?.headers || [];
        const from = headers.find((h) => h.name?.toLowerCase() === "from")?.value || "Unknown";
        const subject = headers.find((h) => h.name?.toLowerCase() === "subject")?.value || "(No Subject)";
        const dateRaw = headers.find((h) => h.name?.toLowerCase() === "date")?.value || "";

        const isImportant =
          /placement|cdc|exam|dean|registrar|fee|circular|interview|shortlist/i.test(subject) ||
          /srmap\.edu\.in|cdc|placement/i.test(from);

        emails.push({
          id: msg.id,
          from,
          subject,
          snippet: detail.data.snippet || "",
          date: dateRaw ? new Date(dateRaw).toLocaleDateString([], { month: "short", day: "numeric" }) : "",
          isImportant,
        });
      } catch (err) {
        console.error("Error fetching message details:", err);
      }
    }

    return emails;
  } catch (error) {
    console.error("Error fetching student emails:", error);
    return [];
  }
}
