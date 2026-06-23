// =============================================================================
// app/api/auth/reset/route.ts — EduFlow LMS | Password Reset Request API
//
// POST: Generates a password reset token and sends a reset email.
// =============================================================================

import { NextResponse } from "next/server";
import { z } from "zod";
import { getItem } from "../../../../lib/aws/dynamo";

import { cognitoForgotPassword } from "../../../../lib/aws/cognito";

const resetSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = resetSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const { email } = validated.data;

    // Check if the user exists
    const existingUser = await getItem(`USER#${email}`, "PROFILE");

    if (!existingUser) {
      // Return success even if user doesn't exist for security reasons (prevent enumeration)
      return NextResponse.json({ success: "Reset email sent!" });
    }

    // Trigger AWS Cognito Forgot Password
    try {
      await cognitoForgotPassword(email);
      console.log("Triggered AWS Cognito forgot password");
    } catch (cognitoError: any) {
      console.error("[COGNITO_RESET_ERROR]", cognitoError.name || cognitoError.message);
      return NextResponse.json(
        { error: "Failed to initiate password reset: " + (cognitoError.message || "Unknown error") },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: "Reset email sent!" });
  } catch (error) {
    console.error("[RESET_ERROR]", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
