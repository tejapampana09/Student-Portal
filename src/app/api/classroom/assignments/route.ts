import { NextRequest, NextResponse } from "next/server";
import { useMongo } from "@/lib/database/useMongo";
import { errorResponse, requireAuthResponse } from "@/server/utils/functions";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const initDb = await useMongo();
    const user = await initDb.db("college_db").collection<any>("users").findOne(
      { username: auth.payload.username },
      { projection: { classroomAssignments: 1 } }
    );

    const assignments = user?.classroomAssignments || [];
    return NextResponse.json({ success: true, assignments });
  } catch (error: any) {
    return errorResponse("Failed to fetch assignments", {}, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { title, courseCode, courseName, dueDate, dueTime, description, type } = body;

    if (!title || !courseCode) {
      return errorResponse("Title and Course Code are required.");
    }

    const newAssignment = {
      id: `task-${crypto.randomBytes(6).toString("hex")}`,
      title: title.trim(),
      courseCode: courseCode.trim().toUpperCase(),
      courseName: courseName || courseCode,
      dueDate: dueDate || new Date().toISOString().split("T")[0],
      dueTime: dueTime || "23:59",
      dueFormatted: `${dueDate || "Today"} ${dueTime || "23:59"}`,
      description: description || "",
      type: type || "Assignment", // "Assignment" | "Lab Task" | "Project" | "Quiz"
      status: "PENDING", // "PENDING" | "COMPLETED"
      createdAt: new Date().toISOString(),
    };

    const initDb = await useMongo();
    await initDb.db("college_db").collection<any>("users").updateOne(
      { username: auth.payload.username },
      { $push: { classroomAssignments: newAssignment } as any }
    );

    return NextResponse.json({ success: true, assignment: newAssignment });
  } catch (error: any) {
    return errorResponse(error?.message || "Failed to add assignment", {}, 500);
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return errorResponse("Assignment ID and status are required.");
    }

    const initDb = await useMongo();
    await initDb.db("college_db").collection<any>("users").updateOne(
      { username: auth.payload.username, "classroomAssignments.id": id },
      { $set: { "classroomAssignments.$.status": status } }
    );

    return NextResponse.json({ success: true, id, status });
  } catch (error: any) {
    return errorResponse(error?.message || "Failed to update assignment", {}, 500);
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return errorResponse("Assignment ID is required.");
    }

    const initDb = await useMongo();
    await initDb.db("college_db").collection<any>("users").updateOne(
      { username: auth.payload.username },
      { $pull: { classroomAssignments: { id } } as any }
    );

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    return errorResponse(error?.message || "Failed to delete assignment", {}, 500);
  }
}
