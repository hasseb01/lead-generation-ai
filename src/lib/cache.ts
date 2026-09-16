// Cache abstraction: uses Upstash Redis (serverless, REST-based) when configured,
// otherwise falls back to an in-process in-memory cache with the same TTL semantics.
// This keeps local dev / demo zero-setup while matching the production caching story
// (cache Places API responses by (industry, location), 24h TTL) described in the plan.

type CacheEntry = { value: unknown; expiresAt: number };

const memoryStore = new Map<string, CacheEntry>();

const hasUpstash = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

async function upstashGet<T>(key: string): Promise<T | null> {
  const res = await fetch(
    `${process.env.UPSTASH_REDIS_REST_URL}/get/${encodeURIComponent(key)}`,
    { headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` } }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { result: string | null };
  return data.result ? (JSON.parse(data.result) as T) : null;
}

async function upstashSet(key: string, value: unknown, ttlSeconds: number) {
  const body = encodeURIComponent(JSON.stringify(value));
  await fetch(
    `${process.env.UPSTASH_REDIS_REST_URL}/set/${encodeURIComponent(key)}/${body}?EX=${ttlSeconds}`,
    { headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` } }
  );
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (hasUpstash) {
    try {
      return await upstashGet<T>(key);
    } catch {
      return null;
    }
  }
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value as T;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (hasUpstash) {
    try {
      await upstashSet(key, value, ttlSeconds);
    } catch {
      // Non-fatal — cache is a performance optimization, not a correctness dependency.
    }
    return;
  }
  memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}
