import { handleUserSession } from "@/server/auth/handleUserSession";
import { decryptData, errorResponse, requireAuthResponse } from "@/server/utils/functions";
import { useMongo } from "@/lib/database/useMongo";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const auth = await requireAuthResponse(req);
    if (auth instanceof NextResponse) return auth;

    if (!process.env.MONGO_URI) {
        return NextResponse.json({
            success: false,
            requiresPassword: true,
            message: "Saved credentials unavailable in serverless mode. Please enter password to renew session."
        });
    }

    try {
        let initDb: any;
        try {
            initDb = await useMongo();
        } catch (dbErr) {
            return NextResponse.json({
                success: false,
                requiresPassword: true,
                message: "Database connection unavailable. Please enter password to renew session."
            });
        }

        const user = await initDb.db("college_db").collection("users").findOne(
            { username: auth.payload.username },
            { projection: { portal_password: 1, session_id: 1, session_time: 1 } }
        );
        
        if (!user?.portal_password) {
            return NextResponse.json({
                success: false,
                requiresPassword: true,
                message: "Saved portal credentials are unavailable. Please enter password to renew session."
            });
        }

        let password = "";
        try {
            password = String(decryptData(user.portal_password));
        } catch (decryptErr) {
            console.error("Portal password decryption failed:", decryptErr);
            return NextResponse.json({
                success: false,
                requiresPassword: true,
                message: "Session encryption key updated. Please enter password to renew session."
            });
        }

        const result = await handleUserSession({ username: auth.payload.username, password });
        if (!result.success) {
            return NextResponse.json({
                success: false,
                requiresPassword: true,
                message: result.message || "Failed to renew session. Please enter password."
            });
        }

        return NextResponse.json({
            success: true,
            message: "Success!",
            sessionId: result.sessionId,
            sessionTime: result.sessionTime,
        });
    } catch (err: any) {
        console.error("Error From initiate/session:", err?.message || err);
        return NextResponse.json({
            success: false,
            requiresPassword: true,
            message: "Failed to initiate session. Please enter password."
        });
    }
}

export async function POST(req: NextRequest) {
    const auth = await requireAuthResponse(req);
    if (auth instanceof NextResponse) return auth;

    let body: any = {};
    try { body = await req.json(); } catch {}
    const { password } = body;

    if (!password) {
        return NextResponse.json({
            success: false,
            message: "Portal password is required to renew session."
        }, { status: 400 });
    }

    try {
        const result = await handleUserSession({ username: auth.payload.username, password });
        if (!result.success) {
            return NextResponse.json({
                success: false,
                message: result.message || "Invalid portal password or SRM server unreachable."
            }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            message: "Success!",
            sessionId: result.sessionId,
            sessionTime: result.sessionTime,
        });
    } catch (err: any) {
        console.error("Error From POST initiate/session:", err?.message || err);
        return NextResponse.json({
            success: false,
            message: "Failed to initiate session. Please try again."
        }, { status: 500 });
    }
}
