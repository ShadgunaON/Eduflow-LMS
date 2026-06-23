import { NextResponse } from "next/server";
import { getItem, putItem } from "../../../../lib/aws/dynamo";
import { auth } from "../../../../auth";
import { uploadToS3, getPresignedUrl } from "../../../../lib/aws/s3";

export async function POST(req: Request) {
  try {
    const session = await auth();
    console.log("Upload request received, user:", session?.user?.email);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      console.log("Upload failed: No file provided");
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
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
    const userEmail = session.user.email;
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
