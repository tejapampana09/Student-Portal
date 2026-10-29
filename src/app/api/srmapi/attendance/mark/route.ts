import axios from "axios";
import { useMongo } from "@/lib/database/useMongo";
import { NextRequest, NextResponse } from "next/server";
import { httpsAgent } from "@/server/utils/httpAgents";
import { requireAuthResponse, errorResponse, decryptData, enforceRateLimit } from "@/server/utils/functions";
import { handleUserSession } from "@/server/auth/handleUserSession";

const httpMarkClient = axios.create({
    httpsAgent,
    timeout: 10000,
    validateStatus: () => true,
});

const SUBMIT_URL = "https://student.srmap.edu.in/srmapstudentcorner/students/transaction/studentattendanceresources.jsp";

async function postAttendance(code: string, sessionId: string) {
    const payload = new URLSearchParams({
        acode: code.trim().toUpperCase(),
        dynamiclatdata: "0",
        dynamiclonxdata: "0",
        ids: "1"
    }).toString();

    const response = await httpMarkClient.post(SUBMIT_URL, payload, {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0",
            "Cookie": `JSESSIONID=${sessionId}`,
        },
        responseType: "text"
    });

    const text = String(response.data || "");
    let responseData: any = null;
    try {
        responseData = JSON.parse(text.trim());
    } catch {
        try {
            const jsonString = text.replace(/<[^>]+>/g, "").trim();
            responseData = JSON.parse(jsonString);
        } catch {
            responseData = null;
        }
    }

    const isSessionExpired =
        text.includes("StudentLoginPage") ||
        text.includes("Session Expired") ||
        text.includes("Please login again") ||
        (responseData && typeof responseData.result === "string" && responseData.result.toLowerCase().includes("session"));

    return { response, text, responseData, isSessionExpired };
}

export async function POST(req: NextRequest) {
    const auth = await requireAuthResponse(req);
    if (auth instanceof NextResponse) return auth;
    let body;
    try { body = await req.json(); } catch { return errorResponse("Invalid JSON body"); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return errorResponse("Invalid request body");
    const { code, username } = body;
    if (typeof code !== "string" || !/^[A-Za-z]\d{6}$/.test(code.trim())) {
        return errorResponse("Invalid attendance code format (e.g. A123456)");
    }
    const targetUsername = auth.payload.username.trim().toUpperCase();
    if (username !== undefined && (typeof username !== "string" || username.trim().toUpperCase() !== targetUsername)) {
        return errorResponse("You may only submit attendance for your own account", {}, 403);
    }
    const rate = await enforceRateLimit(`mark_att:${targetUsername}`, 10, 60_000);
    if (!rate.allowed) return NextResponse.json({ success: false, message: "Too many requests. Please wait." }, {
        status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) }
    });

    try {
        const initDb = await useMongo();
        const userDoc = await initDb.db("college_db").collection("users").findOne({ username: targetUsername });
        // A caller-supplied portal session cannot establish account ownership.
        const storedSessionId = userDoc?.session_id ? decryptData(userDoc.session_id) : "";
        if (typeof storedSessionId !== "string") return errorResponse("Invalid stored portal session", {}, 503);
        let activeSessionId: string = storedSessionId;

        // If session ID is missing or blank, attempt to retrieve or initiate via stored credentials
        if (!activeSessionId && userDoc?.portal_password) {
            try {
                const password = String(decryptData(userDoc.portal_password));
                const initRes = await handleUserSession({ username: targetUsername, password, allowCachedSession: true });
                if (initRes.success && typeof initRes.sessionId === "string" && initRes.sessionId) {
                    activeSessionId = initRes.sessionId;
                }
            } catch (initErr) {
                console.warn("[Attendance Mark] Auto session creation failed:", initErr);
            }
        }

        if (!activeSessionId) {
            return errorResponse("Active SRM session required. Please initiate or refresh session.", {}, 400);
        }

        let { text, responseData, isSessionExpired } = await postAttendance(code, activeSessionId);
        let renewedSession: { sessionId: string; sessionTime: string } | null = null;

        // If session expired on SRM server, attempt auto-renewal once and retry submission
        if (isSessionExpired && userDoc?.portal_password) {
            console.log(`[Attendance Mark] Session expired on SRM for ${targetUsername}. Attempting automatic renewal...`);
            try {
                const password = String(decryptData(userDoc.portal_password));
                const renewRes = await handleUserSession({ username: targetUsername, password, forceRefresh: true });
                if (renewRes.success && typeof renewRes.sessionId === "string" && renewRes.sessionId) {
                    console.log(`[Attendance Mark] Successfully renewed session for ${targetUsername}. Retrying attendance submission...`);
                    activeSessionId = renewRes.sessionId;
                    renewedSession = { sessionId: renewRes.sessionId, sessionTime: renewRes.sessionTime };
                    const retryResult = await postAttendance(code, activeSessionId);
                    text = retryResult.text;
                    responseData = retryResult.responseData;
                    isSessionExpired = retryResult.isSessionExpired;
                }
            } catch (renewErr) {
                console.warn(`[Attendance Mark] Auto-renewal failed for ${targetUsername}:`, renewErr);
            }
        }

        if (isSessionExpired) {
            return errorResponse("Session expired. Please click Refresh Sessions and try again.", {}, 401);
        }

        if (responseData?.resultstatus === "1") {
            return NextResponse.json({
                success: true,
                message: "Attendance Captured Successfully!",
                ...(renewedSession ? { renewedSession } : {}),
            });
        } else if (typeof responseData?.result === "string" && responseData.result.includes("Your Attendance captured al")) {
            return NextResponse.json({
                success: true,
                message: "Attendance Captured Already!",
                ...(renewedSession ? { renewedSession } : {}),
            });
        } else if (typeof responseData?.result === "string" && responseData.result.includes("You have entered the Wrong Attendance")) {
            return errorResponse("Wrong Attendance Code!", {}, 404);
        } else {
            return errorResponse(responseData?.result || "Incorrect Attendance Code!", {}, 404);
        }
    } catch (err) {
        console.error("Error From /api/srmapi/attendance/mark:- ", err);
        return errorResponse(undefined, {}, 500);
    }
}
