import { cacheGet, cacheSet } from "./cache";
import { getMockPlaces, type RawPlace } from "./mockPlaces";

const PLACES_CACHE_TTL_SECONDS = 60 * 60 * 24; // 24h, per the plan's caching strategy

type TextSearchResult = {
  place_id: string;
  name: string;
  types: string[];
  formatted_address: string;
  rating?: number;
};

type PlaceDetailsResult = {
  website?: string;
  formatted_phone_number?: string;
};

function bestCategory(types: string[]): string {
  // Google Places returns a types array like ["software_company", "point_of_interest", "establishment"].
  // Drop the generic catch-all types and humanize the most specific one.
  const specific = types.filter((t) => !["point_of_interest", "establishment"].includes(t));
  const raw = specific[0] ?? types[0] ?? "unknown";
  return raw
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function fetchFromGooglePlaces(industry: string, location: string): Promise<RawPlace[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const query = encodeURIComponent(`${industry} in ${location}`);
  const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`;

  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) throw new Error(`Places Text Search failed: ${searchRes.status}`);
  const searchData = (await searchRes.json()) as { results: TextSearchResult[]; status: string };
  if (searchData.status !== "OK" && searchData.status !== "ZERO_RESULTS") {
    throw new Error(`Places Text Search status: ${searchData.status}`);
  }

  const topResults = (searchData.results ?? []).slice(0, 20);

  const detailed = await Promise.all(
    topResults.map(async (r) => {
      let details: PlaceDetailsResult = {};
      try {
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${r.place_id}&fields=website,formatted_phone_number&key=${apiKey}`;
        const detailsRes = await fetch(detailsUrl);
        if (detailsRes.ok) {
          const detailsData = (await detailsRes.json()) as { result: PlaceDetailsResult };
          details = detailsData.result ?? {};
        }
      } catch {
        // Details lookup is best-effort; missing website/phone just lowers the fit score.
      }
      const place: RawPlace = {
        placeId: r.place_id,
        name: r.name,
        category: bestCategory(r.types ?? []),
        address: r.formatted_address,
        website: details.website ?? null,
        phone: details.formatted_phone_number ?? null,
        rating: r.rating ?? null,
      };
      return place;
    })
  );

  return detailed;
}

export async function searchCompanies(industry: string, location: string): Promise<{ places: RawPlace[]; source: "google_places" | "mock" }> {
  const cacheKey = `places:${industry.trim().toLowerCase()}:${location.trim().toLowerCase()}`;
  const cached = await cacheGet<{ places: RawPlace[]; source: "google_places" | "mock" }>(cacheKey);
  if (cached) return cached;

  let result: { places: RawPlace[]; source: "google_places" | "mock" };
  if (process.env.GOOGLE_PLACES_API_KEY) {
    try {
      result = { places: await fetchFromGooglePlaces(industry, location), source: "google_places" };
    } catch {
      // Fall back to mock data if the live API errors out (bad key, quota, network) so the
      // demo never hard-fails.
      result = { places: getMockPlaces(industry, location), source: "mock" };
    }
  } else {
    result = { places: getMockPlaces(industry, location), source: "mock" };
  }

  await cacheSet(cacheKey, result, PLACES_CACHE_TTL_SECONDS);
  return result;
}
