import { NextResponse } from "next/server";
import { getItem, putItem, queryItems, deleteItem } from "../../../../lib/aws/dynamo";
import { studentSchema } from "../../../../app/lib/schemas";
import { auth } from "../../../../auth";
import { hasRole, ROUTE_PERMISSIONS } from "../../../../lib/rbac";

// PATCH /api/students/:id — Update a student
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!hasRole(role, ROUTE_PERMISSIONS["/api/students"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const validated = studentSchema.partial().parse(body);

    const { course, ...userData } = validated;
    
    const user = await getItem(`USER#${id}`, "PROFILE");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updatedUser = { ...user, ...userData };
    await putItem(updatedUser);

    const enrollments = await queryItems(`USER#${id}`, "ENROLL#");

    // Log activity
    await putItem({
      PK: "ACTIVITY",
      SK: `DATE#${new Date().toISOString()}`,
      type: "student",
      message: `${updatedUser.name}'s profile updated`,
      icon: "✏️",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      id: updatedUser.email, name: updatedUser.name, email: updatedUser.email, course: enrollments[0]?.courseName || "No Course",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update student";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// DELETE /api/students/:id — Delete a student
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!hasRole(role, ROUTE_PERMISSIONS["/api/students"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    const user = await getItem(`USER#${id}`, "PROFILE");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const items = await queryItems(`USER#${id}`);
    for (const item of items) {
      await deleteItem(item.PK, item.SK);
    }

    await putItem({
      PK: "ACTIVITY",
      SK: `DATE#${new Date().toISOString()}`,
      type: "student",
      message: `${user.name} was removed`,
      icon: "🗑️",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete student";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
