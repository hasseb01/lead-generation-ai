// Free, keyless alternative to Google Places: geocode the location via Nominatim,
// then search OpenStreetMap businesses in that area via the Overpass API. Used when
// GOOGLE_PLACES_API_KEY is not set (or the Places call fails), before falling back to mock data.

import type { RawPlace } from "./mockPlaces";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OVERPASS_ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];
const USER_AGENT = "LeadFitScoreTool/1.0 (demo lead-gen app; no billing/API key required)";

type BBox = { south: number; west: number; north: number; east: number };

async function geocodeLocation(location: string): Promise<BBox> {
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(location)}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Nominatim geocoding failed: ${res.status}`);
  const data = (await res.json()) as Array<{ boundingbox: [string, string, string, string] }>;
  if (!data.length) throw new Error(`No geocoding match for location "${location}"`);
  const [south, north, west, east] = data[0].boundingbox.map(Number);
  return { south, west, north, east };
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  tags?: Record<string, string>;
};

async function queryOverpass(query: string): Promise<OverpassElement[]> {
  let lastError: unknown;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": USER_AGENT,
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) throw new Error(`Overpass query failed: ${res.status}`);
      const data = (await res.json()) as { elements: OverpassElement[] };
      return data.elements ?? [];
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("All Overpass endpoints failed");
}

function humanizeCategory(tags: Record<string, string>): string {
  const key = ["office", "shop", "craft", "amenity"].find((k) => tags[k]);
  const raw = (key ? tags[key] : "business").replace(/^yes$/i, "business");
  return raw
    .split(/[_-]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function buildAddress(tags: Record<string, string>, fallbackLocation: string): string {
  const streetPart =
    tags["addr:housenumber"] && tags["addr:street"]
      ? `${tags["addr:housenumber"]} ${tags["addr:street"]}`
      : tags["addr:street"];
  const parts = [streetPart, tags["addr:city"]].filter(Boolean);
  return parts.length ? parts.join(", ") : fallbackLocation;
}

/** Real business search via OpenStreetMap (Nominatim + Overpass) — free, no API key or billing. */
export async function fetchFromOverpass(industry: string, location: string): Promise<RawPlace[]> {
  const bbox = await geocodeLocation(location);
  const term = escapeRegex(industry.trim());
  const bboxStr = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;

  const query = `
    [out:json][timeout:10];
    (
      nwr["name"~"${term}",i](${bboxStr});
      nwr["office"~"${term}",i](${bboxStr});
      nwr["shop"~"${term}",i](${bboxStr});
      nwr["craft"~"${term}",i](${bboxStr});
      nwr["description"~"${term}",i](${bboxStr});
    );
    out center 40;
  `;

  const elements = await queryOverpass(query);

  const seen = new Set<string>();
  const places: RawPlace[] = [];
  for (const el of elements) {
    if (!el.tags?.name) continue;
    const placeId = `osm-${el.type}-${el.id}`;
    if (seen.has(placeId)) continue;
    seen.add(placeId);
    places.push({
      placeId,
      name: el.tags.name,
      category: humanizeCategory(el.tags),
      address: buildAddress(el.tags, location),
      website: el.tags.website ?? el.tags["contact:website"] ?? null,
      phone: el.tags.phone ?? el.tags["contact:phone"] ?? null,
      rating: null,
    });
  }
  return places;
}
