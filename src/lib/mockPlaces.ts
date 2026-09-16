// Bundled mock company data, used whenever GOOGLE_PLACES_API_KEY is not configured.
// The "software" + "new york" entry is a faithful reproduction of the real accuracy gap
// documented in SaaSquatch_Leads_Product_Analysis.md section 5: searching Industry =
// "Software" in New York City on the live product returned mostly personal-injury law
// firms and one generic "Consultant" instead of software companies. This dataset lets
// the scoring engine demo fixing exactly that case.

export type RawPlace = {
  placeId: string;
  name: string;
  category: string;
  address: string;
  website: string | null;
  phone: string | null;
  rating: number | null;
};

const SOFTWARE_NEW_YORK: RawPlace[] = [
  // Real matches — should score high once the fit-score engine is applied.
  { placeId: "mock-sw-1", name: "Squarespace", category: "Software Company", address: "225 Varick St, New York, NY", website: "https://squarespace.com", phone: "(212) 555-0101", rating: 4.4 },
  { placeId: "mock-sw-2", name: "Datadog", category: "Software Company", address: "620 8th Ave, New York, NY", website: "https://datadoghq.com", phone: "(212) 555-0102", rating: 4.3 },
  { placeId: "mock-sw-3", name: "MongoDB", category: "Software Company", address: "1633 Broadway, New York, NY", website: "https://mongodb.com", phone: "(212) 555-0103", rating: 4.5 },
  { placeId: "mock-sw-4", name: "Peloton Interactive Engineering", category: "Software Company", address: "441 9th Ave, New York, NY", website: "https://onepeloton.com", phone: "(212) 555-0104", rating: 4.1 },
  { placeId: "mock-sw-5", name: "Codecademy", category: "Software Company", address: "575 Broadway, New York, NY", website: "https://codecademy.com", phone: null, rating: 4.2 },
  // Noise the real product actually returned — should score low / get filtered out.
  { placeId: "mock-noise-1", name: "Weitz & Luxenberg, P.C.", category: "Personal Injury Attorney", address: "700 Broadway, New York, NY", website: "https://weitzlux.com", phone: "(212) 555-0201", rating: 4.6 },
  { placeId: "mock-noise-2", name: "Redmond Law Firm, PLLC", category: "Personal Injury Attorney", address: "26 Broadway, New York, NY", website: null, phone: "(212) 555-0202", rating: 4.0 },
  { placeId: "mock-noise-3", name: "Gair, Gair, Conason Law Firm", category: "Personal Injury Attorney", address: "80 Pine St, New York, NY", website: "https://gairlaw.com", phone: "(212) 555-0203", rating: 4.7 },
  { placeId: "mock-noise-4", name: "New York Legal Consultants", category: "Consultant", address: "1 Wall St, New York, NY", website: null, phone: null, rating: 3.8 },
  { placeId: "mock-noise-5", name: "Chen & Associates 律师事务所", category: "Personal Injury Attorney", address: "111 John St, New York, NY", website: null, phone: "(212) 555-0204", rating: 4.1 },
];

const GENERIC_MATCH_TEMPLATES = [
  { suffix: "Technologies", category: "Software Company" },
  { suffix: "Solutions", category: "Software Company" },
  { suffix: "Labs", category: "Software Company" },
  { suffix: "Systems", category: "Software Company" },
];

const GENERIC_NOISE = [
  { name: "Personal Injury Attorney", category: "Personal Injury Attorney" },
  { name: "General Consultant", category: "Consultant" },
  { name: "Family Law Firm", category: "Law Firm" },
];

/**
 * Deterministic mock generator so any (industry, location) query returns a
 * plausible, reproducible mixed result set — mostly relevant, some noise —
 * without ever calling a real API.
 */
export function getMockPlaces(industry: string, location: string): RawPlace[] {
  const key = `${industry.trim().toLowerCase()}|${location.trim().toLowerCase()}`;
  if (key === "software|new york city" || key === "software|new york, ny" || key === "software|new york") {
    return SOFTWARE_NEW_YORK;
  }

  const results: RawPlace[] = [];
  GENERIC_MATCH_TEMPLATES.forEach((t, i) => {
    results.push({
      placeId: `mock-${key}-match-${i}`,
      name: `${industry} ${t.suffix}`,
      category: t.category,
      address: `${100 + i} Main St, ${location}`,
      website: `https://example-${i}.com`,
      phone: `(555) 010-0${i}`,
      rating: 4 + i * 0.1,
    });
  });
  GENERIC_NOISE.forEach((n, i) => {
    results.push({
      placeId: `mock-${key}-noise-${i}`,
      name: `${n.name} of ${location}`,
      category: n.category,
      address: `${200 + i} Side St, ${location}`,
      website: i === 0 ? null : `https://noise-${i}.com`,
      phone: i === 1 ? null : `(555) 020-0${i}`,
      rating: 3.5 + i * 0.1,
    });
  });
  return results;
}
