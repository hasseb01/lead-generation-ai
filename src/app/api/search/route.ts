import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { searchCompanies } from "@/lib/places";
import { scoreCompany } from "@/lib/scoring";
import { extractDomain, isValidContactFormat, findExistingDomainsAndPhones } from "@/lib/dedupValidate";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const industry = typeof body?.industry === "string" ? body.industry.trim() : "";
  const location = typeof body?.location === "string" ? body.location.trim() : "";
  const productKeyword = typeof body?.productKeyword === "string" ? body.productKeyword.trim() : undefined;

  if (!industry || !location) {
    return NextResponse.json({ error: "industry and location are required" }, { status: 400 });
  }

  const { places, source } = await searchCompanies(industry, location);
  const { domains: existingDomains, phones: existingPhones } = await findExistingDomainsAndPhones();

  const search = await db.search.create({
    data: { industry, location, productKeyword },
  });

  const seenDomainsInBatch = new Set<string>();
  const seenPhonesInBatch = new Set<string>();

  const results = await Promise.all(
    places.map(async (place) => {
      const domain = extractDomain(place.website);
      const isDuplicate =
        (domain !== null && (existingDomains.has(domain) || seenDomainsInBatch.has(domain))) ||
        (place.phone !== null && (existingPhones.has(place.phone) || seenPhonesInBatch.has(place.phone)));
      if (domain) seenDomainsInBatch.add(domain);
      if (place.phone) seenPhonesInBatch.add(place.phone);
      const validContact = isValidContactFormat(place.phone, place.website);

      const fit = await scoreCompany(industry, place);

      const company = await db.company.create({
        data: {
          searchId: search.id,
          placeId: place.placeId,
          name: place.name,
          category: place.category,
          address: place.address,
          website: place.website,
          phone: place.phone,
          rating: place.rating,
          domain,
          isDuplicate,
          validContact,
          fitScore: {
            create: {
              score: fit.score,
              reason: fit.reason,
              categoryMatch: fit.signals.categoryMatch,
              hasWebsite: fit.signals.hasWebsite,
              hasPhone: fit.signals.hasPhone,
              similarity: fit.signals.similarity,
              signals: JSON.stringify(fit.signals),
            },
          },
        },
        include: { fitScore: true },
      });

      return company;
    })
  );

  results.sort((a, b) => (b.fitScore?.score ?? 0) - (a.fitScore?.score ?? 0));

  return NextResponse.json({ searchId: search.id, source, companies: results });
}
