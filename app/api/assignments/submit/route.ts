import { NextResponse } from "next/server";
import { getItem, putItem } from "../../../../lib/aws/dynamo";
import { auth } from "../../../../auth";
import { uploadToS3, getPresignedUrl } from "../../../../lib/aws/s3";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = session;
    const userId = session.user.id as string;
    const isStudent = (user as any).role?.toUpperCase() === "STUDENT";

    // Since this can be multipart form data (for file uploads)
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const assignmentId = formData.get("assignmentId") as string;
      const textResponse = formData.get("textResponse") as string;
      const file = formData.get("file") as File | null;
      
      // If admin is grading, they might send studentId and score
      const studentId = formData.get("studentId") as string;
      const score = formData.get("score") as string;

      if (!isStudent && studentId && score) {
        // Admin grading an existing submission
        // Since we changed id to email, studentId is likely an email or we need to look it up.
        // The frontend sends studentId which was the email in our new mapping.
        const sub = await getItem(`USER#${studentId}`, `SUB#${assignmentId}`);
        if (!sub) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
        
        sub.status = "Graded";
        sub.score = score;
        await putItem(sub);

        return NextResponse.json(sub);
      }

      if (!isStudent) {
        return NextResponse.json({ error: "Only students can submit." }, { status: 403 });
      }

      let fileUrl = null;

      if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to AWS S3
        fileUrl = await uploadToS3(buffer, file.name, file.type, "eduflow-assignments");
      }

      const sub = await getItem(`USER#${userId}`, `SUB#${assignmentId}`) || {
        PK: `USER#${userId}`,
        SK: `SUB#${assignmentId}`,
        assignmentId,
        userId,
      };

      sub.status = "Submitted";
      if (fileUrl) sub.fileUrl = fileUrl;
      if (textResponse) sub.textResponse = textResponse;
      sub.submittedAt = new Date().toISOString();

      await putItem(sub);

      await putItem({
        PK: "ACTIVITY",
        SK: `DATE#${new Date().toISOString()}`,
        type: "assignment",
        message: `Assignment submitted`,
        icon: "✅",
        createdAt: new Date().toISOString(),
      });

      const presignedSub = { ...sub, fileUrl: sub.fileUrl ? await getPresignedUrl(sub.fileUrl) : null };
      return NextResponse.json(presignedSub);
    } else {
      // JSON body (e.g. for grading without file upload)
      const body = await req.json();
      const { assignmentId, studentId, score } = body;

      if (isStudent) {
        return NextResponse.json({ error: "Students must use multipart form upload." }, { status: 400 });
      }

      const sub = await getItem(`USER#${studentId}`, `SUB#${assignmentId}`);
      if (!sub) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

      sub.status = "Graded";
      sub.score = score;
      await putItem(sub);

      await putItem({
        PK: "ACTIVITY",
        SK: `DATE#${new Date().toISOString()}`,
        type: "assignment",
        message: `Assignment graded`,
        icon: "✅",
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json(sub);
    }
  } catch (error: any) {
    console.error("POST Assignment Submission Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
