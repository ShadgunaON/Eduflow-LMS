import { NextResponse } from "next/server";
import { scanItems, scanByPKPrefix, putItem, getItem } from "../../../lib/aws/dynamo";
import { v4 as uuidv4 } from "uuid";
import { auth } from "../../../auth";
import { hasRole, ROUTE_PERMISSIONS } from "../../../lib/rbac";
import { enrollmentSchema } from "../../lib/schemas";

// GET /api/enrollments — Fetch all enrollments
export async function GET(req: Request) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!hasRole(role, ROUTE_PERMISSIONS["/enrollment"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Fetch from DynamoDB
    const allEnrollments = await scanItems("ENROLL#");

    // Sort descending
    const sortedEnrollments = allEnrollments.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    const total = sortedEnrollments.length;
    const paginatedEnrollments = sortedEnrollments.slice(skip, skip + limit);

    const result = paginatedEnrollments.map((e: any) => ({
      id: e.id,
      userId: e.userId,
      courseId: e.courseId,
      studentName: e.studentName, // Denormalized
      courseName: e.courseName, // Denormalized
      enrolledDate: e.enrolledDate,
      status: e.status,
    }));

    return NextResponse.json({
      data: result,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch enrollments";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/enrollments — Create a new enrollment
export async function POST(req: Request) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!hasRole(role, ["ADMIN", "INSTRUCTOR"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const validated = enrollmentSchema.parse(body);

    const allUsers = await scanByPKPrefix("USER#", "PROFILE");
    const user = allUsers.find((u: any) => u.name === validated.studentName && u.role === "STUDENT");

    const allCourses = await scanByPKPrefix("COURSE#");
    const course = allCourses.find((c: any) => c.name === validated.courseName);
    
    if (!user) return NextResponse.json({ error: "Student not found" }, { status: 404 });
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

    const newEnrollmentId = uuidv4();
    const newEnrollment = {
      PK: `USER#${user.email}`,
      SK: `ENROLL#${course.id}`,
      id: newEnrollmentId,
      userId: user.email,
      courseId: course.id,
      studentName: user.name, // Denormalizing
      courseName: course.name, // Denormalizing
      enrolledDate: validated.enrolledDate,
      status: validated.status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await putItem(newEnrollment);

    // Log activity
    await putItem({
      PK: "ACTIVITY",
      SK: `DATE#${new Date().toISOString()}`,
      type: "enrollment",
      message: `${user.name} enrolled in ${course.name}`,
      icon: "📋",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        id: newEnrollment.id,
        userId: newEnrollment.userId,
        courseId: newEnrollment.courseId,
        studentName: newEnrollment.studentName,
        courseName: newEnrollment.courseName,
        enrolledDate: newEnrollment.enrolledDate,
        status: newEnrollment.status,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create enrollment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
