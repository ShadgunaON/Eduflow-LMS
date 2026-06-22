// =============================================================================
// app/api/auth/register/route.ts — EduFlow LMS | User Registration
//
// POST: Creates a new user account with hashed password and sends a
// verification email. Defaults to STUDENT role.
// =============================================================================

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../lib/prisma";
import { generateVerificationToken } from "../../../../lib/tokens";
import { sendVerificationEmail } from "../../../../lib/mail";
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
    const existingUser = await prisma.user.findUnique({ where: { email } });
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

    // Generate verification token and send email
    const verificationToken = await generateVerificationToken(email);
    const emailResult = await sendVerificationEmail(email, verificationToken.token);

    if (!emailResult.success) {
      // If email fails, we should ideally rollback user creation, but for now we'll just return the error
      // so the user knows it failed.
      return NextResponse.json(
        { error: "Account created, but failed to send verification email. " + ((emailResult as any).error?.message || "Please contact support.") },
        { status: 500 }
      );
    }

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
