import { NextResponse } from "next/server";
import { getItem, putItem } from "../../../../lib/aws/dynamo";
import { auth } from "../../../../auth";
import { quizAttemptSchema } from "../../../lib/schemas";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = quizAttemptSchema.parse(body);
    const userId = session.user.id as string;

    const isCompleted = validated.status === "Completed" || (validated.score !== undefined && validated.score > 0);
    const status = isCompleted ? "Completed" : "In Progress";
    const score = validated.score ?? 0;
    const completedAt = isCompleted ? new Date().toISOString() : null;

    const attempt = await getItem(`USER#${userId}`, `ATTEMPT#${validated.quizId}`) || {
      PK: `USER#${userId}`,
      SK: `ATTEMPT#${validated.quizId}`,
      quizId: validated.quizId,
      userId,
    };

    attempt.status = status;
    attempt.score = score;
    attempt.completedAt = completedAt;

    await putItem(attempt);

    return NextResponse.json(attempt);
  } catch (error: any) {
    console.error("POST Quiz Attempt Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
