import { NextResponse } from "next/server";
import { getItem, putItem, deleteItem, queryItems } from "../../../../lib/aws/dynamo";
import { getPresignedUrl } from "../../../../lib/aws/s3";
import { courseSchema } from "../../../../app/lib/schemas";
import { auth } from "../../../../auth";
import { hasRole } from "../../../../lib/rbac";

// PATCH /api/courses/:id — Update a course
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!hasRole(role, ["ADMIN", "INSTRUCTOR"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const validated = courseSchema.partial().parse(body);

    const course = await getItem(`COURSE#${id}`, "METADATA");
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const updated = {
      ...course,
      ...validated,
      updatedAt: new Date().toISOString(),
    };

    await putItem(updated);

    // Log activity
    await putItem({
      PK: "ACTIVITY",
      SK: `DATE#${new Date().toISOString()}`,
      type: "course",
      message: `${updated.name} course updated`,
      icon: "✏️",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      id: updated.id, name: updated.name, duration: updated.duration, fee: updated.fee, category: updated.category, imageUrl: await getPresignedUrl(updated.imageUrl),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update course";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// DELETE /api/courses/:id — Delete a course
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!hasRole(role, ["ADMIN", "INSTRUCTOR"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    const course = await getItem(`COURSE#${id}`, "METADATA");
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Delete all items under COURSE#id (Assignments, Quizzes, Lessons, Metadata)
    const courseItems = await queryItems(`COURSE#${id}`);
    for (const item of courseItems) {
      await deleteItem(item.PK, item.SK);
    }

    // Log activity
    await putItem({
      PK: "ACTIVITY",
      SK: `DATE#${new Date().toISOString()}`,
      type: "course",
      message: `${course.name} course removed`,
      icon: "🗑️",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete course";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
