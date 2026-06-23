import { NextResponse } from "next/server";
import { scanByPKPrefix, putItem, queryItems } from "../../../lib/aws/dynamo";
import { cognitoSignUp } from "../../../lib/aws/cognito";
import { v4 as uuidv4 } from "uuid";
import { auth } from "../../../auth";
import { hasRole, ROUTE_PERMISSIONS } from "../../../lib/rbac";
import { studentSchema } from "../../lib/schemas";

// GET /api/students — Fetch all students
export async function GET(req: Request) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!hasRole(role, ROUTE_PERMISSIONS["/api/students"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Fetch all users
    const allUsers = await scanByPKPrefix("USER#", "PROFILE");
    const students = allUsers.filter((u: any) => u.role === "STUDENT");

    // Sort descending
    students.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    const total = students.length;
    const paginatedStudents = students.slice(skip, skip + limit);

    // Map to match the frontend interface shape and fetch their enrollments
    const result = await Promise.all(
      paginatedStudents.map(async (s: any) => {
        const enrollments = await queryItems(`USER#${s.email}`, "ENROLL#");
        return {
          id: s.email,
          name: s.name,
          email: s.email,
          course: enrollments.length > 0 ? (enrollments[0] as any).courseName : "Not Enrolled",
        };
      })
    );

    return NextResponse.json({
      data: result,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch students";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/students — Create a new student
export async function POST(req: Request) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!hasRole(role, ROUTE_PERMISSIONS["/api/students"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const validated = studentSchema.parse(body);

    // Create in Cognito
    const tempPassword = `Temp@${uuidv4().slice(0, 8)}`;
    await cognitoSignUp(validated.email, tempPassword, validated.name, "STUDENT");

    // Save user profile to DynamoDB
    const newUser = {
      PK: `USER#${validated.email}`,
      SK: "PROFILE",
      email: validated.email,
      name: validated.name,
      role: "STUDENT",
      createdAt: new Date().toISOString(),
    };
    await putItem(newUser);

    // Log activity
    await putItem({
      PK: "ACTIVITY",
      SK: `DATE#${new Date().toISOString()}`,
      type: "student",
      message: `${newUser.name} registered as a new student`,
      icon: "🎓",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(
      { id: newUser.email, name: newUser.name, email: newUser.email, course: "Not Enrolled" },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create student";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
