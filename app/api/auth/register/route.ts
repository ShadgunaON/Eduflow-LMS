// =============================================================================
// app/api/auth/register/route.ts — EduFlow LMS | User Registration
//
// POST: Creates a new user account with hashed password and sends a
// verification email. Defaults to STUDENT role.
// =============================================================================

import { NextResponse } from "next/server";
import { z } from "zod";
import { putItem, getItem } from "../../../../lib/aws/dynamo";
import { cognitoSignUp } from "../../../../lib/aws/cognito";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = registerSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, password } = validated.data;

    // Check if email already exists
    const existingUser = await getItem(`USER#${email}`, "PROFILE");
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Register in AWS Cognito
    try {
      await cognitoSignUp(email, password, name, "STUDENT");
      console.log("Successfully registered in AWS Cognito");
    } catch (cognitoError: any) {
      console.error("[COGNITO_REGISTER_ERROR]", cognitoError.name || cognitoError.message);
      return NextResponse.json(
        { error: "Failed to register user in Cognito: " + (cognitoError.message || "Unknown error") },
        { status: 500 }
      );
    }

    // Save user profile to DynamoDB
    await putItem({
      PK: `USER#${email}`,
      SK: "PROFILE",
      email,
      name,
      role: "STUDENT",
      createdAt: new Date().toISOString(),
    });

    // In Cognito mock mode, verification is auto-approved. In real mode, Cognito sends the email.
    // So we don't need to manually send emails here.
    
    return NextResponse.json(
      { success: "Verification email sent! Please check your inbox." },
      { status: 201 }
    );
  } catch (error) {
    console.error("[REGISTER_ERROR]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
