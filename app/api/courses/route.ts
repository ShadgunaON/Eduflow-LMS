import { NextResponse } from "next/server";
import { scanByPKPrefix, putItem } from "../../../lib/aws/dynamo";
import { getPresignedUrl } from "../../../lib/aws/s3";
import { v4 as uuidv4 } from "uuid";
import { auth } from "../../../auth";
import { hasRole } from "../../../lib/rbac";
import { courseSchema } from "../../lib/schemas";

// GET /api/courses — Fetch all courses with pagination
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Fetch from DynamoDB
    const allCourses = await scanByPKPrefix("COURSE#");
    
    // Sort descending by createdAt
    const sortedCourses = allCourses.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    const total = sortedCourses.length;
    const paginatedCourses = sortedCourses.slice(skip, skip + limit);

    const result = await Promise.all(paginatedCourses.map(async (c: any) => ({
      id: c.id,
      name: c.name,
      duration: c.duration,
      fee: c.fee,
      category: c.category,
      imageUrl: await getPresignedUrl(c.imageUrl),
    })));

    return NextResponse.json({
      data: result,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch courses";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/courses — Create a new course
export async function POST(req: Request) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!hasRole(role, ["ADMIN", "INSTRUCTOR"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const validated = courseSchema.parse(body);

    const newCourseId = uuidv4();
    const newCourse = {
      PK: `COURSE#${newCourseId}`,
      SK: "METADATA",
      id: newCourseId,
      ...validated,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await putItem(newCourse);

    // Log activity
    await putItem({
      PK: "ACTIVITY",
      SK: `DATE#${new Date().toISOString()}`,
      type: "course",
      message: `${newCourse.name} course added to catalog`,
      icon: "📚",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(
      { id: newCourse.id, name: newCourse.name, duration: newCourse.duration, fee: newCourse.fee, category: newCourse.category, imageUrl: newCourse.imageUrl },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create course";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
