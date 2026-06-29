import { NextResponse } from "next/server";
import { getItem, putItem } from "../../../../lib/aws/dynamo";
import { uploadToS3, getPresignedUrl } from "../../../../lib/aws/s3";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    const payloadBase64 = token.split(".")[1];
    const payload = JSON.parse(Buffer.from(payloadBase64, "base64").toString("utf-8"));
    const userEmail = payload.email;

    console.log("Upload request received, user:", userEmail);
    if (!userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      console.error("Upload error details:", "No file provided");
      return NextResponse.json(
        { error: "Failed to upload file to S3", details: "No file provided" },
        { status: 500 }
      );
    }
    console.log(`File detected: ${file.name}, size: ${file.size}, type: ${file.type}`);

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

    console.log("Attempting upload to AWS S3...");
    const imageUrl = await uploadToS3(buffer, file.name, file.type, "eduflow-profiles");
    console.log("Upload successful, URL:", imageUrl);

    // Update user image in DynamoDB
    const userToUpdate = await getItem(`USER#${userEmail}`, "PROFILE");
    if (!userToUpdate) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updatedUser = {
      ...userToUpdate,
      image: imageUrl,
    };
    await putItem(updatedUser);

    // Log activity
    await putItem({
      PK: "ACTIVITY",
      SK: `DATE#${new Date().toISOString()}`,
      type: "student",
      message: `${updatedUser.name || updatedUser.email} updated their profile picture`,
      icon: "🖼️",
      createdAt: new Date().toISOString(),
    });

    console.log("Database update successful for user:", updatedUser.email);
    return NextResponse.json({
      id: updatedUser.email,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      image: await getPresignedUrl(updatedUser.image),
    });
  } catch (error: any) {
    console.error("Profile Upload Error:", error);
    // AWS S3 or upload utilities might throw objects that aren't instances of Error
    const message = error.message || (typeof error === "string" ? error : JSON.stringify(error));
    return NextResponse.json({ error: message || "Failed to upload file" }, { status: 500 });
  }
}
