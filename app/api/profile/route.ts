import { NextResponse } from "next/server";
import { getItem, putItem } from "../../../lib/aws/dynamo";
import { getPresignedUrl } from "../../../lib/aws/s3";
import { auth } from "../../../auth";
import { profileUpdateSchema, changePasswordSchema } from "../../lib/schemas";

export const dynamic = "force-dynamic";

// GET /api/profile — Fetch current user details
export const GET = auth(async (req) => {
  try {
    const session = req.auth;
    console.log("=== GET /api/profile ===");
    console.log("Session:", JSON.stringify(session, null, 2));

    if (!session?.user?.id && !session?.user?.email) {
      console.log("Unauthorized: Missing user id or email");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email!;
    const user = await getItem(`USER#${userEmail}`, "PROFILE");

    console.log("Found user:", user ? "YES" : "NO");

    if (!user) {
      console.log("User not found in DB for session.user.id:", session.user.id);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.image) {
      user.image = await getPresignedUrl(user.image);
    }

    return NextResponse.json(user);
  } catch (error: unknown) {
    console.error("GET /api/profile Error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

// PUT /api/profile — Update user name and/or password
export const PUT = auth(async (req) => {
  try {
    const session = req.auth;
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Check if it's a password update or name update
    if (body.type === "password") {
      return NextResponse.json({ error: "Password changes must be done via Cognito Forgot Password flow." }, { status: 400 });
    } else {
      // Profile details update
      const validated = profileUpdateSchema.safeParse(body);
      if (!validated.success) {
        return NextResponse.json({ error: validated.error.issues[0].message }, { status: 400 });
      }

      const { name } = validated.data;
      const userEmail = session.user.email!;

      const userToUpdate = await getItem(`USER#${userEmail}`, "PROFILE");

      if (!userToUpdate) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const updatedUser = {
        ...userToUpdate,
        name,
      };

      await putItem(updatedUser);

      // Log activity
      await putItem({
        PK: "ACTIVITY",
        SK: `DATE#${new Date().toISOString()}`,
        type: "student",
        message: `${name} updated their profile information`,
        icon: "✏️",
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json({
        id: updatedUser.email,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        image: updatedUser.image,
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
