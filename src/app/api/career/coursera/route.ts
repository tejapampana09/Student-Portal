import { NextRequest, NextResponse } from "next/server";
import { useMongo } from "@/lib/database/useMongo";
import { errorResponse, requireAuthResponse } from "@/server/utils/functions";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const initDb = await useMongo();
    const user = await initDb.db("college_db").collection<any>("users").findOne(
      { username: auth.payload.username },
      { projection: { courseraCourses: 1 } }
    );

    return NextResponse.json({
      success: true,
      courses: user?.courseraCourses || [],
    });
  } catch (error: any) {
    return errorResponse("Failed to fetch Coursera courses", {}, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthResponse(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { action, course } = body;
    const initDb = await useMongo();
    const usersCollection = initDb.db("college_db").collection("users");

    if (action === "add") {
      const newCourse = {
        id: new ObjectId().toString(),
        title: course.title,
        platform: course.platform || "Coursera",
        totalModules: Number(course.totalModules) || 4,
        completedModules: Number(course.completedModules) || 0,
        deadline: course.deadline,
        notes: course.notes || "",
        createdAt: new Date().toISOString(),
      };

      await usersCollection.updateOne(
        { username: auth.payload.username },
        { $push: { courseraCourses: newCourse as any } },
        { upsert: true }
      );

      return NextResponse.json({ success: true, course: newCourse });
    }

    if (action === "update") {
      await usersCollection.updateOne(
        { username: auth.payload.username, "courseraCourses.id": course.id },
        {
          $set: {
            "courseraCourses.$.title": course.title,
            "courseraCourses.$.totalModules": Number(course.totalModules),
            "courseraCourses.$.completedModules": Number(course.completedModules),
            "courseraCourses.$.deadline": course.deadline,
            "courseraCourses.$.notes": course.notes || "",
          },
        }
      );

      return NextResponse.json({ success: true, message: "Course updated successfully!" });
    }

    if (action === "delete") {
      await usersCollection.updateOne(
        { username: auth.payload.username },
        { $pull: { courseraCourses: { id: course.id } as any } }
      );

      return NextResponse.json({ success: true, message: "Course deleted successfully!" });
    }

    return errorResponse("Invalid action");
  } catch (error: any) {
    return errorResponse("Failed to manage Coursera courses", {}, 500);
  }
}
