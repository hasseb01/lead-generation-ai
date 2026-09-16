import crypto from "node:crypto";
import { detectTechStack, type TechMatch } from "./techStack";

export type WebScanResult = {
  url: string;
  fetchOk: boolean;
  error: string | null;
  techStack: TechMatch[];
  topics: string[];
  summary: string | null;
  contentHash: string | null;
};

const STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "your", "with", "this", "that",
  "from", "have", "has", "our", "all", "can", "will", "more", "about", "into",
  "they", "their", "was", "were", "get", "how", "what", "when", "where", "who",
]);

function stripHtml(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const withoutTags = withoutScripts.replace(/<[^>]+>/g, " ");
  return withoutTags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTopicsHeuristic(text: string): string[] {
  const freq = new Map<string, number>();
  for (const raw of text.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) ?? []) {
    if (STOPWORDS.has(raw)) continue;
    freq.set(raw, (freq.get(raw) ?? 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}

async function analyzeContent(text: string): Promise<{ topics: string[]; summary: string | null }> {
  const sample = text.slice(0, 4000);
  if (!process.env.OPENAI_API_KEY) {
    return { topics: extractTopicsHeuristic(sample), summary: null };
  }
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Here is text scraped from a company's website:\n\n"""${sample}"""\n\nReply with strict JSON only, no markdown fences: {"summary": "<one sentence on what this company does/sells>", "topics": ["<up to 8 short keyword/topic strings describing their business focus>"]}`,
          },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) throw new Error(`OpenAI chat failed: ${res.status}`);
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    const parsed = JSON.parse(data.choices[0].message.content) as { summary?: string; topics?: string[] };
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : null,
      topics: Array.isArray(parsed.topics) ? parsed.topics.slice(0, 8).map(String) : extractTopicsHeuristic(sample),
    };
  } catch {
    // Degrade to the heuristic rather than failing the whole scan.
    return { topics: extractTopicsHeuristic(sample), summary: null };
  }
}

function normalizeUrl(website: string): string {
  return website.startsWith("http") ? website : `https://${website}`;
}

export async function scanWebsite(website: string): Promise<WebScanResult> {
  const url = normalizeUrl(website);

  let html: string;
  let headers: Headers;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LeadFitScoreBot/1.0; +https://example.com/bot)",
      },
    });
    clearTimeout(timeout);
    if (!res.ok) {
      return {
        url, fetchOk: false, error: `Site responded ${res.status}`,
        techStack: [], topics: [], summary: null, contentHash: null,
      };
    }
    headers = res.headers;
    html = await res.text();
  } catch (err) {
    return {
      url, fetchOk: false,
      error: err instanceof Error ? err.message : "Fetch failed",
      techStack: [], topics: [], summary: null, contentHash: null,
    };
  }

  const techStack = detectTechStack(html, headers);
  const text = stripHtml(html);
  const { topics, summary } = await analyzeContent(text);
  const contentHash = crypto.createHash("sha256").update(text).digest("hex");

  return { url, fetchOk: true, error: null, techStack, topics, summary, contentHash };
}
