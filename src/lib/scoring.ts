import type { RawPlace } from "./mockPlaces";

export type Signals = {
  categoryMatch: boolean;
  hasWebsite: boolean;
  hasPhone: boolean;
  similarity: number; // 0..1
};

export type FitScoreResult = {
  score: number; // 0..100
  reason: string;
  signals: Signals;
};

const STOPWORDS = new Set(["and", "of", "the", "a", "an", "in", "for", "&"]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOPWORDS.has(w))
  );
}

/** Jaccard similarity between token sets — used when no OpenAI key is configured. */
export function tokenOverlapSimilarity(a: string, b: string): number {
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const tok of setA) if (setB.has(tok)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export async function embed(text: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  if (!res.ok) throw new Error(`OpenAI embeddings failed: ${res.status}`);
  const data = (await res.json()) as { data: { embedding: number[] }[] };
  return data.data[0].embedding;
}

async function computeSimilarity(industry: string, companyText: string): Promise<number> {
  if (!process.env.OPENAI_API_KEY) {
    return tokenOverlapSimilarity(industry, companyText);
  }
  try {
    const [industryVec, companyVec] = await Promise.all([embed(industry), embed(companyText)]);
    return Math.max(0, cosineSimilarity(industryVec, companyVec));
  } catch {
    // Embedding call failed (bad key, quota, network) — degrade gracefully instead of failing the search.
    return tokenOverlapSimilarity(industry, companyText);
  }
}

function isCategoryMatch(industry: string, category: string): boolean {
  const industryTokens = tokenize(industry);
  const categoryTokens = tokenize(category);
  for (const tok of industryTokens) {
    for (const catTok of categoryTokens) {
      if (catTok === tok || catTok.includes(tok) || tok.includes(catTok)) return true;
    }
  }
  return false;
}

export async function scoreCompany(industry: string, place: RawPlace): Promise<FitScoreResult> {
  const companyText = `${place.name} ${place.category}`;
  const similarity = await computeSimilarity(industry, companyText);
  const categoryMatch = isCategoryMatch(industry, place.category) || similarity >= 0.5;
  const hasWebsite = Boolean(place.website);
  const hasPhone = Boolean(place.phone);

  const categoryPoints = categoryMatch ? 40 : 0;
  const similarityPoints = Math.round(similarity * 40);
  const websitePoints = hasWebsite ? 10 : 0;
  const phonePoints = hasPhone ? 10 : 0;
  const score = Math.min(100, categoryPoints + similarityPoints + websitePoints + phonePoints);

  const matched: string[] = [];
  const missing: string[] = [];
  if (categoryMatch) matched.push(`category matches "${industry}"`);
  else missing.push(`category = ${place.category}`);
  if (hasWebsite) matched.push("has website");
  else missing.push("no website");
  if (hasPhone) matched.push("has phone");
  else missing.push("no phone");

  const reason = categoryMatch
    ? `Matched: ${matched.join(", ")}`
    : `Mismatch: ${missing.join(", ")}`;

  return {
    score,
    reason,
    signals: { categoryMatch, hasWebsite, hasPhone, similarity },
  };
}
