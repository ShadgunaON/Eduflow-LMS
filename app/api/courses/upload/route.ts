import { NextResponse } from "next/server";
import { uploadToS3, getPresignedUrl } from "../../../../lib/aws/s3";
import { hasRole } from "../../../../lib/rbac";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    const payloadBase64 = token.split(".")[1];
    const payload = JSON.parse(Buffer.from(payloadBase64, "base64").toString("utf-8"));
    const role = payload["custom:role"] || "STUDENT";

    // Only Admins and Instructors can upload course images
    if (!hasRole(role, ["ADMIN", "INSTRUCTOR"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size exceeds 5MB limit" }, { status: 400 });
    }

    // Validate file type (only image types allowed)
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to AWS S3
    const imageUrl = await uploadToS3(buffer, file.name, file.type, "eduflow-courses");

    return NextResponse.json({ imageUrl: await getPresignedUrl(imageUrl) }, { status: 200 });
  } catch (error: any) {
    console.error("Course Thumbnail Upload Error:", error);
    const message = error.message || (typeof error === "string" ? error : JSON.stringify(error));
    return NextResponse.json({ error: message || "Failed to upload file" }, { status: 500 });
  }
}
