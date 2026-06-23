// =============================================================================
// app/api/auth/new-password/route.ts — EduFlow LMS | New Password API
//
// POST: Validates the reset token and updates the user's password.
// =============================================================================

import { NextResponse } from "next/server";
import { z } from "zod";

import { cognitoConfirmForgotPassword } from "../../../../lib/aws/cognito";

const newPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Minimum 6 characters required"),
  token: z.string().min(1, "Missing confirmation code"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = newPasswordSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input." },
        { status: 400 }
      );
    }

    const { email, password, token } = validated.data;

    // Attempt AWS Cognito Confirm Forgot Password
    try {
      await cognitoConfirmForgotPassword(email, token, password);
      console.log("AWS Cognito password confirmed successfully");
    } catch (cognitoError: any) {
      console.error("[COGNITO_NEW_PASSWORD_ERROR]", cognitoError.name || cognitoError.message);
      return NextResponse.json(
        { error: "Failed to confirm password: " + (cognitoError.message || "Invalid code") },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: "Password updated successfully!" });
  } catch (error) {
    console.error("[NEW_PASSWORD_ERROR]", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
