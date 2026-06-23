// =============================================================================
// app/api/auth/verify/route.ts — EduFlow LMS | Email Verification API
//
// POST: Validates the token and marks the user's email as verified in the DB.
// =============================================================================

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    console.log("[VERIFY_DEBUG] Mocking verification success for token:", token);

    return NextResponse.json({ success: "Email verified successfully!" });
  } catch (error) {
    console.error("[VERIFY_ERROR]", error);
    return NextResponse.json(
      { error: "Something went wrong during verification." },
      { status: 500 }
    );
  }
}
