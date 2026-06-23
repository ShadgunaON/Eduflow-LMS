import { NextResponse } from "next/server";
import { getItem, putItem, queryItems, scanByPKPrefix, scanItems } from "../../../lib/aws/dynamo";
import { v4 as uuidv4 } from "uuid";
import { auth } from "../../../auth";
import { quizSchema } from "../../../app/lib/schemas";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email!;
    const isStudent = (session.user as any).role?.toUpperCase() === "STUDENT";

    if (isStudent) {
      const enrollments = await queryItems(`USER#${userEmail}`, "ENROLL#");
      const flattened = [];

      for (const enr of enrollments) {
        const quizzes = await queryItems(`COURSE#${enr.courseId}`, "QUIZ#");
        for (const q of quizzes) {
          const attempt = await getItem(`USER#${userEmail}`, `ATTEMPT#${q.id}`);
          flattened.push({
            id: q.id,
            quizId: q.id,
            title: q.title,
            course: enr.courseName,
            duration: q.duration,
            questionsCount: q.questionsCount,
            questions: q.questions,
            status: attempt ? attempt.status : "Not Started",
            score: attempt ? attempt.score : null,
          });
        }
      }
      return NextResponse.json(flattened);
    } else {
      const allCourses = await scanByPKPrefix("COURSE#");
      const flattened: any[] = [];

      for (const c of allCourses) {
        const quizzes = await queryItems(c.PK, "QUIZ#");
        if (quizzes.length === 0) continue;

        const enrollments = await scanItems(`ENROLL#${c.id}`);

        for (const q of quizzes) {
          if (enrollments.length === 0) {
            flattened.push({
              id: q.id,
              quizId: q.id,
              title: q.title,
              course: c.name,
              duration: q.duration,
              questionsCount: q.questionsCount,
              questions: q.questions,
              status: "Not Started",
              score: null,
              studentId: null,
              studentName: "No students enrolled",
            });
            continue;
          }

          for (const enr of enrollments) {
            const attempt = await getItem(`USER#${enr.userId}`, `ATTEMPT#${q.id}`);
            
            flattened.push({
              id: `${q.id}_${enr.userId}`,
              quizId: q.id,
              title: q.title,
              course: c.name,
              duration: q.duration,
              questionsCount: q.questionsCount,
              questions: q.questions,
              status: attempt ? attempt.status : "Not Started",
              score: attempt ? attempt.score : null,
              studentId: enr.userId,
              studentName: enr.studentName || "Unknown Student",
            });
          }
        }
      }
      return NextResponse.json(flattened);
    }
  } catch (error: any) {
    console.error("GET Quizzes Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role?.toUpperCase() !== "TUTOR") {
      return NextResponse.json({ error: "Unauthorized: Only Tutors can create quizzes" }, { status: 403 });
    }

    const body = await req.json();
    const validated = quizSchema.parse(body);

    const newQuizId = uuidv4();
    const quiz = {
      PK: `COURSE#${validated.courseId}`,
      SK: `QUIZ#${newQuizId}`,
      id: newQuizId,
      ...validated,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await putItem(quiz);

    await putItem({
      PK: "ACTIVITY",
      SK: `DATE#${new Date().toISOString()}`,
      type: "course",
      message: `New quiz added: ${quiz.title}`,
      icon: "📝",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(quiz);
  } catch (error: any) {
    console.error("POST Quiz Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
