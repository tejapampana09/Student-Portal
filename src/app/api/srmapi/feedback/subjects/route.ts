import { useMongo } from "@/lib/database/useMongo";
import { NextRequest, NextResponse } from "next/server";
import { isSessionValid } from "@/shared/utils/functions";
import { PARAMETERS, UNAUTHORIZED } from "@/shared/utils/messages";
import { requireAuthResponse, errorResponse, decryptData } from "@/server/utils/functions";
import { handleUserSession } from "@/server/auth/handleUserSession";
import { fetchFeedbackSubjects } from "@/server/srmapi/feedback/feedbackSubjects";

export async function POST(req: NextRequest) {
    let body: any = {};
    try {
        body = await req.json();
    } catch {
        body = {};
    }

    const auth = await requireAuthResponse(req);
    if (auth instanceof NextResponse) return auth;

    try {
        const initDb = await useMongo();
        const db = initDb.db('college_db').collection("users");
        const user = await db.findOne({ username: auth.payload.username });

        if (!user) return errorResponse(UNAUTHORIZED);

        let activeSessionId = body.sessionId || "";
        let renewedSession: { sessionId: string; sessionTime: string } | null = null;

        // If session ID is missing or invalid according to session_time, attempt auto-renewal if credentials exist
        const sessionTimeValid = user.session_time ? isSessionValid(user.session_time) : false;
        if ((!activeSessionId || !sessionTimeValid) && user.portal_password) {
            try {
                const password = String(decryptData(user.portal_password));
                const initRes = await handleUserSession({ username: auth.payload.username, password });
                if (initRes.success && initRes.sessionId) {
                    activeSessionId = initRes.sessionId;
                    renewedSession = { sessionId: initRes.sessionId, sessionTime: initRes.sessionTime };
                }
            } catch (autoErr) {
                console.warn("[Feedback Subjects] Auto session renewal failed:", autoErr);
            }
        }

        if (!activeSessionId) {
            return errorResponse(PARAMETERS);
        }

        let fetchResult = await fetchFeedbackSubjects(activeSessionId);

        // If session expired on SRM server, attempt auto-renewal once and retry
        if (fetchResult.isSessionExpired && user.portal_password) {
            try {
                const password = String(decryptData(user.portal_password));
                const renewRes = await handleUserSession({ username: auth.payload.username, password });
                if (renewRes.success && renewRes.sessionId) {
                    activeSessionId = renewRes.sessionId;
                    renewedSession = { sessionId: renewRes.sessionId, sessionTime: renewRes.sessionTime };
                    fetchResult = await fetchFeedbackSubjects(activeSessionId);
                }
            } catch (renewErr) {
                console.warn("[Feedback Subjects] Retry renewal failed:", renewErr);
            }
        }

        const { subjects } = fetchResult;

        if (subjects.length === 0) {
            return NextResponse.json({
                success: false,
                message: 'No pending feedback subjects found. Your feedback may have already been submitted or the feedback window is currently closed on SRM.',
                renewedSession
            });
        }

        return NextResponse.json({
            success: true,
            subjects,
            renewedSession
        });
    } catch (err) {
        console.error("Error From /api/srmapi/feedback/subjects:- ", err);
        return errorResponse(undefined, {}, 500);
    }
}
