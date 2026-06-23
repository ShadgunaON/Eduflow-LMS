import { NextResponse } from "next/server";
import { getItem, putItem, queryItems, scanByPKPrefix, scanItems } from "../../../lib/aws/dynamo";
import { getPresignedUrl } from "../../../lib/aws/s3";
import { v4 as uuidv4 } from "uuid";
import { auth } from "../../../auth";
import { assignmentSchema } from "../../../app/lib/schemas";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email!;
    const isStudent = (session.user as any).role?.toUpperCase() === "STUDENT";

    if (isStudent) {
      // Find courses student is enrolled in
      const enrollments = await queryItems(`USER#${userEmail}`, "ENROLL#");
      const flattened = [];

      for (const enr of enrollments) {
        const assignments = await queryItems(`COURSE#${enr.courseId}`, "ASSIGN#");
        for (const a of assignments) {
          const sub = await getItem(`USER#${userEmail}`, `SUB#${a.id}`);
          let status = "Pending";
          let score = null;
          let fileUrl = null;
          let textResponse = null;

          if (sub) {
            status = sub.status;
            score = sub.score;
            fileUrl = sub.fileUrl ? await getPresignedUrl(sub.fileUrl) : null;
            textResponse = sub.textResponse;
          } else if (new Date(a.dueDate) < new Date()) {
            status = "Overdue";
          }

          flattened.push({
            id: a.id,
            assignmentId: a.id,
            title: a.title,
            course: enr.courseName,
            dueDate: a.dueDate,
            status,
            score,
            fileUrl,
            textResponse,
          });
        }
      }
      return NextResponse.json(flattened);
    } else {
      // Admin / Instructor
      const allCourses = await scanByPKPrefix("COURSE#");
      const flattened: any[] = [];

      for (const c of allCourses) {
        const assignments = await queryItems(c.PK, "ASSIGN#");
        if (assignments.length === 0) continue;

        const enrollments = await scanItems(`ENROLL#${c.id}`);

        for (const a of assignments) {
          if (enrollments.length === 0) {
            flattened.push({
              id: a.id,
              assignmentId: a.id,
              title: a.title,
              course: c.name,
              dueDate: a.dueDate,
              status: "Pending",
              score: null,
              fileUrl: null,
              textResponse: null,
              studentId: null,
              studentName: "No students enrolled",
            });
            continue;
          }

          for (const enr of enrollments) {
            const sub = await getItem(`USER#${enr.userId}`, `SUB#${a.id}`);
            let status = "Pending";
            let score = null;
            let fileUrl = null;
            let textResponse = null;

            if (sub) {
              status = sub.status;
              score = sub.score;
              fileUrl = sub.fileUrl ? await getPresignedUrl(sub.fileUrl) : null;
              textResponse = sub.textResponse;
            } else if (new Date(a.dueDate) < new Date()) {
              status = "Overdue";
            }

            flattened.push({
              id: `${a.id}_${enr.userId}`,
              assignmentId: a.id,
              title: a.title,
              course: c.name,
              dueDate: a.dueDate,
              status,
              score,
              fileUrl,
              textResponse,
              studentId: enr.userId,
              studentName: enr.studentName || "Unknown Student",
            });
          }
        }
      }

      return NextResponse.json(flattened);
    }
  } catch (error: any) {
    console.error("GET Assignments Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role?.toUpperCase() === "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = assignmentSchema.parse(body);

    const newAssignmentId = uuidv4();
    const assignment = {
      PK: `COURSE#${validated.courseId}`,
      SK: `ASSIGN#${newAssignmentId}`,
      id: newAssignmentId,
      title: validated.title,
      courseId: validated.courseId,
      dueDate: new Date(validated.dueDate).toISOString(),
    };

    await putItem(assignment);

    await putItem({
      PK: "ACTIVITY",
      SK: `DATE#${new Date().toISOString()}`,
      type: "course",
      message: `New assignment added: ${assignment.title}`,
      icon: "📝",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(assignment);
  } catch (error: any) {
    console.error("POST Assignment Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
