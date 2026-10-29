import axios from "axios";
import { useMongo } from "@/lib/database/useMongo";
import { NextRequest, NextResponse } from "next/server";
import { UNAUTHORIZED } from "@/shared/utils/messages";
import { httpsAgent } from "@/server/utils/httpAgents";
import { requireAuthResponse, errorResponse, decryptData } from "@/server/utils/functions";
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
    let body: any = {};
    try { body = await req.json(); } catch { }
    let { sessionid, code, username } = body;

    const auth = await requireAuthResponse(req);
    if (auth instanceof NextResponse) return auth;

    if (!code) {
        return errorResponse("Attendance Code is required!");
    }

    const targetUsername = (username ? String(username) : auth.payload.username).toUpperCase();

    try {
        let db: any = null;
        let userDoc: any = null;
        try {
            const initDb = await useMongo();
            db = initDb.db('college_db').collection("users");
            userDoc = await db.findOne({ username: targetUsername });
        } catch (dbErr) {
            console.warn("[Attendance Mark] DB connection failed:", dbErr);
        }

        let activeSessionId = sessionid;

        // If session ID is missing or blank, attempt to retrieve or initiate via stored credentials
        if (!activeSessionId && userDoc?.portal_password) {
            try {
                const password = String(decryptData(userDoc.portal_password));
                const initRes = await handleUserSession({ username: targetUsername, password });
                if (initRes.success && initRes.sessionId) {
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
                const renewRes = await handleUserSession({ username: targetUsername, password });
                if (renewRes.success && renewRes.sessionId) {
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
