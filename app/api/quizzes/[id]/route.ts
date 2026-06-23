import { NextResponse } from "next/server";
import { getItem, putItem, scanItems, deleteItem } from "../../../../lib/aws/dynamo";
import { quizSchema } from "../../../../app/lib/schemas";
import { auth } from "../../../../auth";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const items = await scanItems(`QUIZ#${params.id}`);
    const quiz = items[0];
    if (quiz) {
      const course = await getItem(`COURSE#${quiz.courseId}`, "METADATA");
      quiz.course = course;
    }

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    return NextResponse.json(quiz);
  } catch (error: any) {
    console.error("GET Quiz Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const session = await auth();
    if (!session?.user || (session.user as any).role === "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = quizSchema.partial().parse(body);

    const items = await scanItems(`QUIZ#${params.id}`);
    const quiz = items[0];
    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const updated = { ...quiz, ...validated, updatedAt: new Date().toISOString() };
    await putItem(updated);

    await putItem({
      PK: "ACTIVITY",
      SK: `DATE#${new Date().toISOString()}`,
      type: "course",
      message: `Quiz updated: ${updated.title}`,
      icon: "📝",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const session = await auth();
    if (!session?.user || (session.user as any).role === "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const items = await scanItems(`QUIZ#${params.id}`);
    const quiz = items[0];
    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Delete attempts
    const attempts = await scanItems(`ATTEMPT#${params.id}`);
    for (const a of attempts) {
      await deleteItem(a.PK, a.SK);
    }

    // Delete quiz
    await deleteItem(quiz.PK, quiz.SK);

    await putItem({
      PK: "ACTIVITY",
      SK: `DATE#${new Date().toISOString()}`,
      type: "course",
      message: `Quiz removed: ${quiz.title}`,
      icon: "🗑️",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
