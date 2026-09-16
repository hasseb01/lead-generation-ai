import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyEmail } from "@/lib/emailVerify";

/** Standalone check for an arbitrary email address — powers the Validators panel. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const result = await verifyEmail(email);

  const saved = await db.emailVerification.create({
    data: {
      email: result.email,
      status: result.status,
      reason: result.reason,
      syntaxValid: result.syntaxValid,
      mxFound: result.mxFound,
      smtpDeliverable: result.smtpDeliverable,
      isDisposable: result.isDisposable,
      isRoleAccount: result.isRoleAccount,
      isCatchAll: result.isCatchAll,
      guessed: false,
    },
  });

  return NextResponse.json(saved);
}
