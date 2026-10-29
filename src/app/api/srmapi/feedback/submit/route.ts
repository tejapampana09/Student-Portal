import { useMongo } from "@/lib/database/useMongo";
import { NextRequest, NextResponse } from "next/server";
import { isSessionValid } from "@/shared/utils/functions";
import { PARAMETERS, UNAUTHORIZED } from "@/shared/utils/messages";
import { submitFeedback } from "@/server/srmapi/feedback/feedbackSubmit";
import { requireAuthResponse, errorResponse, decryptData } from "@/server/utils/functions";
import { handleUserSession } from "@/server/auth/handleUserSession";

export async function POST(req: NextRequest) {
    let body: any = {};
    try {
        body = await req.json();
    } catch {
        body = {};
    }

    let { sessionId, comment, optionNo, option, selectedSubjectIds, subjectIds } = body;
    const finalOption = Number(optionNo ?? option ?? 5);
    const finalSubjects = selectedSubjectIds ?? subjectIds;

    if (!comment || !finalOption) {
        return errorResponse(PARAMETERS);
    }

    const auth = await requireAuthResponse(req);
    if (auth instanceof NextResponse) return auth;

    try {
        const initDb = await useMongo();
        const db = initDb.db('college_db').collection("users");
        const settingsDb = initDb.db('college_db').collection("settings");

        const user = await db.findOne({ username: auth.payload.username });
        if (!user) {
            return errorResponse(UNAUTHORIZED);
        }

        let activeSessionId = sessionId;
        let renewedSession: { sessionId: string; sessionTime: string } | null = null;

        // Auto-renew if session is missing or session_time is invalid
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
                console.warn("[Feedback Submit] Auto session init failed:", autoErr);
            }
        }

        if (!activeSessionId) {
            return errorResponse("Active SRM session required. Please initiate or refresh your session.", {}, 400);
        }

        let result = await submitFeedback(activeSessionId, comment, finalOption, finalSubjects);

        // If session expired on SRM, renew once and retry
        if ((!result.success && result.message === 'SESSION_EXPIRED') && user.portal_password) {
            try {
                const password = String(decryptData(user.portal_password));
                const renewRes = await handleUserSession({ username: auth.payload.username, password });
                if (renewRes.success && renewRes.sessionId) {
                    activeSessionId = renewRes.sessionId;
                    renewedSession = { sessionId: renewRes.sessionId, sessionTime: renewRes.sessionTime };
                    result = await submitFeedback(activeSessionId, comment, finalOption, finalSubjects);
                }
            } catch (retryErr) {
                console.warn("[Feedback Submit] Retry renewal failed:", retryErr);
            }
        }

        if (!result.success) {
            return NextResponse.json({
                success: false,
                message: result.message || "Failed to submit feedback",
                renewedSession
            }, { status: 200 });
        }

        try {
            await settingsDb.findOneAndUpdate(
                { id: "feedback" },
                { $inc: { count: 1 } },
                { upsert: true, returnDocument: "after" }
            );
        } catch (cntErr) {
            console.warn("[Feedback Submit] Counter increment failed:", cntErr);
        }

        return NextResponse.json({
            success: true,
            message: result.message || "Feedback submitted successfully!",
            processedSubjects: result.processedSubjects,
            renewedSession
        });

    } catch (err: any) {
        console.error("Error From /api/srmapi/feedback/submit:- ", err);
        return errorResponse(err?.message || "Internal server error", {}, 500);
    }
}
