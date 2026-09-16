# Lead Fit Score — SaaSquatch Leads extension

Built for the Caprae Capital Full Stack Developer take-home challenge. See
`SaaSquatch_Leads_Product_Analysis.md` for the product research and
`Caprae_Challenge_Full_Plan.md` for the full execution plan this build follows.

## The problem this fixes

Searching Industry = **"Software"** in **New York City** on the live SaaSquatch Leads
product returns mostly personal-injury law firms and a generic "Consultant" — the
industry filter isn't actually filtering by industry. That's not cosmetic: it's the
exact failure the challenge brief calls out — *"prioritize high-impact leads, minimize
irrelevant data."*

## The feature: Lead Fit Score

After a company search, every result gets a **0–100 fit score** plus a one-line reason
("Matched: category matches 'Software', has website, has phone" / "Mismatch: category =
Personal Injury Attorney"). Results sort by score descending by default. A **threshold
slider** live-filters the table, and a persistent readout shows **"Estimated credits to
enrich leads currently shown"** before the user commits to a costly enrichment step —
duplicates are automatically excluded from that estimate.

Clicking a row expands **"why this score"**: category match, has-website, has-phone, and
semantic similarity signals — so the score is explainable, not a black box.

**Stretch feature — Dedup + Validation Guard**: every incoming company is cross-checked
by domain/phone against everything already saved (across searches), and flagged if the
phone/website shape looks malformed — both surfaced as badges in the results table, and
both excluded from the credit estimate.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS | One framework for UI + API routes; dark teal/blue UI to match SaaSquatch's own aesthetic |
| Backend | Next.js API routes (Node/TypeScript) | No separate service to deploy |
| Company data source | Google Places API (Text Search + Place Details) | Real `types`/category taxonomy to score against; ToS-compliant. **Falls back to bundled mock data (including a faithful reproduction of the "Software, NYC" bug) when no API key is set**, so the app is demoable with zero setup |
| Scoring | Rule-based signals (category match, has website, has phone) + semantic similarity | Explainable — every score shows its signals, not just a number. Similarity uses OpenAI `text-embedding-3-small` cosine similarity when `OPENAI_API_KEY` is set, and **falls back to a token-overlap heuristic otherwise** so scoring works with zero setup |
| Database | Postgres via Supabase in production; **SQLite locally by default** (zero cloud setup) via the same Prisma schema | Managed Postgres for production, no-friction local dev |
| ORM | Prisma | Type-safe schema + migrations |
| Caching | Upstash Redis (serverless) when `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` are set, caching Places responses by `(industry, location)` for 24h; **in-memory cache fallback otherwise** | Cuts repeat-query latency/cost in production; zero setup for local dev/demo |
| Hosting | Vercel (serverless) | Edge static assets + API routes as serverless functions — right fit for spiky, low-traffic demo traffic |
| Deployment | GitHub → Vercel auto-deploy on push to `main`, env vars set in the Vercel dashboard | Standard, reproducible |
| Cloud provider | Vercel + Supabase + Upstash (managed/serverless trio) | Achievable end-to-end without standing up an AWS/GCP account, while remaining a legitimate serverless architecture answer |

**Data storage strategy**: three tables — `Search` (query params + timestamp),
`Company` (raw normalized fields from Places API, plus `domain`/`isDuplicate`/
`validContact` from the dedup+validation guard), `FitScore` (score, explanation, signal
booleans/floats, FK to company, 1:1). `data/sample_leads.csv` is an exported sample of
the `Company` ⋈ `FitScore` join.

**Performance**: Places API responses are cached by `(industry, location)` for 24h;
the threshold slider filters/sorts client-side (no re-fetch); results are capped to the
top 20 places per search server-side.

## Setup

```bash
npm install
cp .env.example .env   # already done in this repo; edit values as needed
npx prisma migrate dev --name init
npm run dev
```

Open http://localhost:3000. Try Industry = `Software`, Location = `New York City` to see
the reproduction of the original bug fixed live (mock data mode, no keys required).

### Going live (optional)

- **Google Places API**: set `GOOGLE_PLACES_API_KEY` in `.env` to switch from mock data
  to real Text Search + Place Details results.
- **OpenAI embeddings**: set `OPENAI_API_KEY` to switch the similarity signal from a
  token-overlap heuristic to `text-embedding-3-small` cosine similarity.
- **Upstash Redis**: set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` to move
  the Places cache from in-memory to serverless Redis.
- **Supabase Postgres** (production database): in `prisma/schema.prisma`, change
  `provider = "sqlite"` to `provider = "postgresql"`, set `DATABASE_URL` to your Supabase
  connection string, then run `npx prisma migrate dev`.

### Deploying

Push to GitHub, import the repo in Vercel, set the env vars above in the Vercel
dashboard (with `DATABASE_URL` pointed at Supabase — SQLite doesn't work on serverless),
and Vercel auto-deploys on every push to `main`.

## Project structure

```
/prisma/schema.prisma        — Search, Company, FitScore models
/src/app/page.tsx            — search UI: results table, threshold slider, credit estimate
/src/app/api/search/route.ts — search → score → persist → return, in one request
/src/lib/places.ts           — Google Places client, cache-wrapped, with mock fallback
/src/lib/mockPlaces.ts       — bundled mock data incl. the "Software, NYC" reproduction case
/src/lib/scoring.ts          — rule-based signals + similarity → fit score + explanation
/src/lib/dedupValidate.ts    — cross-search dedup + contact-format validation
/src/lib/cache.ts            — Upstash Redis / in-memory cache abstraction
/data/sample_leads.csv       — exported sample of scored leads
/notebook/fit_score_demo.md  — before/after walkthrough of the scoring logic
```

## What I'd do with more time

- Move the dedup check to a Postgres unique/partial index instead of an app-level
  query, once on Supabase, for correctness under concurrent writes.
- Cache embeddings per (industry, category) pair, not just Places responses.
- Add pagination server-side once result sets exceed ~20 companies per search.
- Wire this into SaaSquatch's existing Company Finder → Data Enhancement flow as a
  scoring layer between those two steps, rather than a standalone tool.
