import { db } from "./db";

/** Cross-checks a batch of newly found companies against already-saved companies
 * (by domain, then by phone) so duplicates don't waste enrichment credits, and
 * flags contacts whose phone/website shape looks malformed before enrichment. */

const PHONE_RE = /^[\d\s().+-]{7,}$/;
const URL_RE = /^https?:\/\/[^\s]+\.[a-z]{2,}/i;

export function extractDomain(website: string | null): string | null {
  if (!website) return null;
  try {
    const url = new URL(website.startsWith("http") ? website : `https://${website}`);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function isValidContactFormat(phone: string | null, website: string | null): boolean {
  if (phone && !PHONE_RE.test(phone)) return false;
  if (website && !URL_RE.test(website)) return false;
  return true;
}

export async function findExistingDomainsAndPhones(): Promise<{ domains: Set<string>; phones: Set<string> }> {
  const existing = await db.company.findMany({
    select: { domain: true, phone: true },
    where: { OR: [{ domain: { not: null } }, { phone: { not: null } }] },
  });
  const domains = new Set(existing.map((c) => c.domain).filter((d): d is string => Boolean(d)));
  const phones = new Set(existing.map((c) => c.phone).filter((p): p is string => Boolean(p)));
  return { domains, phones };
}
