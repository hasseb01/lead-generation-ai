import { db } from "./db";
import { embed, cosineSimilarity, tokenOverlapSimilarity } from "./scoring";

export type Lookalike = {
  companyId: string;
  name: string;
  domain: string | null;
  category: string | null;
  similarity: number;
};

function companyText(name: string, category: string | null, topics: string[]): string {
  return [name, category, ...topics].filter(Boolean).join(" ");
}

/** Finds other scanned companies whose (name + category + scanned topics) are most similar
 * to the target's, via embedding cosine similarity (or token overlap without an OpenAI key).
 * Scoped to companies that already have a web scan, since topics are the strongest signal —
 * without them this degrades to bare category matching, which the Fit Score already covers. */
export async function findLookalikes(companyId: string, limit = 5): Promise<Lookalike[]> {
  const target = await db.company.findUnique({
    where: { id: companyId },
    include: { webScans: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!target) return [];

  const targetTopics = target.webScans[0]?.topics ? (JSON.parse(target.webScans[0].topics) as string[]) : [];
  const targetText = companyText(target.name, target.category, targetTopics);

  const candidates = await db.company.findMany({
    where: { id: { not: companyId }, webScans: { some: {} } },
    include: { webScans: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (candidates.length === 0) return [];

  const hasKey = Boolean(process.env.OPENAI_API_KEY);
  const targetVec = hasKey ? await embed(targetText).catch(() => null) : null;

  const scored: Lookalike[] = [];
  for (const c of candidates) {
    const cTopics = c.webScans[0]?.topics ? (JSON.parse(c.webScans[0].topics) as string[]) : [];
    const cText = companyText(c.name, c.category, cTopics);
    let similarity: number;
    if (targetVec) {
      const cVec = await embed(cText).catch(() => null);
      similarity = cVec ? cosineSimilarity(targetVec, cVec) : tokenOverlapSimilarity(targetText, cText);
    } else {
      similarity = tokenOverlapSimilarity(targetText, cText);
    }
    scored.push({ companyId: c.id, name: c.name, domain: c.domain, category: c.category, similarity });
  }

  return scored.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
}
