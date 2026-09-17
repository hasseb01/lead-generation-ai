import { cacheGet, cacheSet } from "./cache";
import { getMockPlaces, type RawPlace } from "./mockPlaces";
import { fetchFromOverpass } from "./overpass";
import { findRealCompanies } from "./realCompanies";

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

type SearchResult = { places: RawPlace[]; source: "google_places" | "osm" | "curated" | "mock" };

/** Fallback chain when no Google Places key is set (or the live call fails):
 *  1. OpenStreetMap (live, free, but public mirrors can be slow/unreliable)
 *  2. Bundled real-company dataset (offline, instant, always available for covered cities)
 *  3. Synthetic mock data (guarantees a result even for locations outside the curated set) */
async function fetchFallback(industry: string, location: string): Promise<SearchResult> {
  try {
    const osmPlaces = await fetchFromOverpass(industry, location);
    if (osmPlaces.length > 0) return { places: osmPlaces, source: "osm" };
  } catch {
    // OSM lookup failed (bad location, rate limit, network) — fall through.
  }

  const curatedPlaces = findRealCompanies(location);
  if (curatedPlaces.length > 0) return { places: curatedPlaces, source: "curated" };

  return { places: getMockPlaces(industry, location), source: "mock" };
}

export async function searchCompanies(industry: string, location: string): Promise<SearchResult> {
  const cacheKey = `places:${industry.trim().toLowerCase()}:${location.trim().toLowerCase()}`;
  const cached = await cacheGet<SearchResult>(cacheKey);
  if (cached) return cached;

  let result: SearchResult;
  if (process.env.GOOGLE_PLACES_API_KEY) {
    try {
      result = { places: await fetchFromGooglePlaces(industry, location), source: "google_places" };
    } catch {
      // Fall back to OSM / curated / mock if the live API errors out (bad key, quota, network)
      // so the demo never hard-fails.
      result = await fetchFallback(industry, location);
    }
  } else {
    result = await fetchFallback(industry, location);
  }

  await cacheSet(cacheKey, result, PLACES_CACHE_TTL_SECONDS);
  return result;
}
