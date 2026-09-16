import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyEmail, rankGenericPrefixes } from "@/lib/emailVerify";
import type { EmailCheckResult } from "@/lib/emailVerify";

/** Guesses a monitored generic inbox (info@, sales@, ...) for a company's domain — ranked
 * by category — and verifies each candidate for real until one resolves as deliverable.
 * There's no scraped contact-person name in this dataset, so this checks generic role
 * inboxes rather than inventing a fake person's email. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await db.company.findUnique({ where: { id } });
  if (!company) {
    return NextResponse.json({ error: "company not found" }, { status: 404 });
  }
  if (!company.domain) {
    return NextResponse.json({ error: "company has no known website domain to check" }, { status: 400 });
  }

  const prefixes = await rankGenericPrefixes(company.category);

  let best: EmailCheckResult | null = null;
  let triedPrefix = prefixes[0];
  for (const prefix of prefixes) {
    const candidate = `${prefix}@${company.domain}`;
    const result = await verifyEmail(candidate);
    if (best === null) {
      best = result;
      triedPrefix = prefix;
    }
    if (result.status === "valid" || result.status === "risky") {
      best = result;
      triedPrefix = prefix;
      break;
    }
  }

  if (!best) {
    return NextResponse.json({ error: "verification failed" }, { status: 500 });
  }

  const saved = await db.emailVerification.create({
    data: {
      companyId: company.id,
      email: best.email,
      status: best.status,
      reason: `Guessed "${triedPrefix}@${company.domain}" — ${best.reason}`,
      syntaxValid: best.syntaxValid,
      mxFound: best.mxFound,
      smtpDeliverable: best.smtpDeliverable,
      isDisposable: best.isDisposable,
      isRoleAccount: best.isRoleAccount,
      isCatchAll: best.isCatchAll,
      guessed: true,
    },
  });

  return NextResponse.json(saved);
}
