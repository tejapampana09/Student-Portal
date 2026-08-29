import { google } from "googleapis";

export function getOAuth2Client(redirectUri?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials are not configured in environment variables.");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generates Gmail OAuth URL requesting strictly Gmail scopes.
 */
export function getGmailAuthUrl(redirectUri: string, state: string) {
  const oauth2Client = getOAuth2Client(redirectUri);
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
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
      maxResults,
      q: "category:primary OR label:INBOX",
    });

    const messages = response.data.messages || [];
    const emailList: StudentEmail[] = [];

    for (const msg of messages) {
      if (!msg.id) continue;
      try {
        const msgDetail = await gmail.users.messages.get({
          userId: "me",
          id: msg.id,
          format: "metadata",
          metadataHeaders: ["Subject", "From", "Date"],
        });

        const headers = msgDetail.data.payload?.headers || [];
        const subject = headers.find((h) => h.name?.toLowerCase() === "subject")?.value || "(No Subject)";
        const from = headers.find((h) => h.name?.toLowerCase() === "from")?.value || "Unknown Sender";
        const dateRaw = headers.find((h) => h.name?.toLowerCase() === "date")?.value || "";

        let date = "";
        if (dateRaw) {
          try {
            const d = new Date(dateRaw);
            date = `${d.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
          } catch {
            date = dateRaw;
          }
        }

        const isImportant =
          subject.toLowerCase().includes("placement") ||
          subject.toLowerCase().includes("exam") ||
          subject.toLowerCase().includes("urgent") ||
          subject.toLowerCase().includes("hall ticket") ||
          from.toLowerCase().includes("cdc") ||
          from.toLowerCase().includes("srmap");

        emailList.push({
          id: msg.id,
          from: from.split("<")[0].trim().replace(/"/g, "") || from,
          subject,
          snippet: msgDetail.data.snippet || "",
          date,
          isImportant,
        });
      } catch (err) {
        console.error(`Error fetching email details for msg ${msg.id}:`, err);
      }
    }

    return emailList;
  } catch (error) {
    console.error("Error fetching Gmail messages:", error);
    throw error;
  }
}
