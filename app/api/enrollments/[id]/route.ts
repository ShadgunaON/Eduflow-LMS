import { NextResponse } from "next/server";
import { putItem, deleteItem, scanItems } from "../../../../lib/aws/dynamo";
import { enrollmentSchema } from "../../../../app/lib/schemas";
import { auth } from "../../../../auth";
import { hasRole, ROUTE_PERMISSIONS } from "../../../../lib/rbac";

// PATCH /api/enrollments/:id — Update an enrollment
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!hasRole(role, ["ADMIN", "INSTRUCTOR"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const validated = enrollmentSchema.partial().parse(body);

    const enrollments = await scanItems("ENROLL#");
    const enrollment = enrollments.find((e: any) => e.id === id);
    
    if (!enrollment) {
      return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
    }

    const { courseName, studentName, ...dataToUpdate } = validated;
    const updated = { ...enrollment, ...dataToUpdate, updatedAt: new Date().toISOString() };
    await putItem(updated);

    await putItem({
      PK: "ACTIVITY",
      SK: `DATE#${new Date().toISOString()}`,
      type: "enrollment",
      message: `Enrollment for ${updated.studentName} updated`,
      icon: "✏️",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      id: updated.id,
      userId: updated.userId,
      courseId: updated.courseId,
      studentName: updated.studentName,
      courseName: updated.courseName,
      enrolledDate: updated.enrolledDate,
      status: updated.status,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update enrollment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// DELETE /api/enrollments/:id — Delete an enrollment
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!hasRole(role, ["ADMIN", "INSTRUCTOR"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    const enrollments = await scanItems("ENROLL#");
    const enrollment = enrollments.find((e: any) => e.id === id);

    if (!enrollment) {
      return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
    }

    await deleteItem(enrollment.PK, enrollment.SK);

    await putItem({
      PK: "ACTIVITY",
      SK: `DATE#${new Date().toISOString()}`,
      type: "enrollment",
      message: `${enrollment.studentName}'s enrollment removed`,
      icon: "🗑️",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete enrollment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
