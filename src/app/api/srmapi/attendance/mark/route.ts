import axios from "axios";
import { useMongo } from "@/lib/database/useMongo";
import { NextRequest, NextResponse } from "next/server";
import { UNAUTHORIZED } from "@/shared/utils/messages";
import { httpsAgent } from "@/server/utils/httpAgents";
import { requireAuthResponse, errorResponse } from "@/server/utils/functions";

const httpMarkClient = axios.create({
    httpsAgent,
    timeout: 10000,
    validateStatus: () => true,
});

export async function POST(req: NextRequest) {
    let body: any = {};
    try { body = await req.json(); } catch { }
    let { sessionid, code } = body;

    const auth = await requireAuthResponse(req);
    if (auth instanceof NextResponse) return auth;

    if (!code) {
        return errorResponse("Attendance Code is required!");
    }

    try {
        const initDb = await useMongo();
        const db = initDb.db('college_db').collection("users");

        const user = await db.findOne({ username: auth.payload.username });
        if (!user) {
            return errorResponse(UNAUTHORIZED);
        }

        const activeSessionId = sessionid || user.sessionId;
        if (!activeSessionId) {
            return errorResponse("Active SRM session required. Please initiate session first.", {}, 400);
        }

        const SUBMIT_URL = "https://student.srmap.edu.in/srmapstudentcorner/students/transaction/studentattendanceresources.jsp";
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
                "Cookie": `JSESSIONID=${activeSessionId}`,
            },
            responseType: "text"
        });

        const text = String(response.data || "");
        let responseData;
        try {
            responseData = JSON.parse(text.trim());
        } catch {
            const jsonString = text.replace(/<[^>]+>/g, "").trim();
            responseData = JSON.parse(jsonString);
        }

        if (responseData.resultstatus === "1") {
            return NextResponse.json({ success: true, message: "Attendance Captured Successfully!" });
        } else if (typeof responseData.result === "string" &&responseData.result.includes("Your Attendance captured al")) {
            return NextResponse.json({ success: true, message: "Attendance Captured Already!" });
        } else if (typeof responseData.result === "string" &&responseData.result.includes("You have entered the Wrong Attendance")){
            return errorResponse("Wrong Attendance Code!", {}, 404);
        } else {
            return errorResponse("Incorrect Attendance Code!", {}, 404);
        }
    } catch (err) {
        console.error("Error From /api/srmapi/attendance/mark:- ", err);
        return errorResponse(undefined, {}, 500);
    }
}