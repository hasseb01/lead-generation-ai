# Caprae Capital — Full Stack Developer Challenge: Execution Plan

This is a working plan for the whole submission: the feature decision, the technical build, the submission package, and drafts for the written Business Understanding section. Sections marked **[YOUR INPUT NEEDED]** are personal/legal answers I'm not able to fill in for you — everything else is ready to use or adapt.

---

## 0. My recommendation, up front

**Approach: Quality First.**

Go deep on one feature rather than spreading 5 hours across several shallow ones. The reason is scoring math, not preference: "Business Use Case Understanding" and "Technicality" are worth 20 of the 40 total rubric points combined (see the breakdown in section 7), and both explicitly reward exactly the kind of single deep feature you can point to concrete evidence for. A pile of thin "quantity driven" utilities is easy to demo but hard to defend under "why does this matter to the business" — and Caprae's own evaluators built SaaSquatch, so a shallow feature will read as shallow to them specifically.

**Feature: a Lead Fit Score — rank and filter scraped companies by actual ICP match before the user spends a credit enriching them.**

Why this one, not something else: it's the single gap I could reproduce and show evidence for. Searching Industry = "Software" in New York City on the live product returned mostly personal-injury law firms and one generic "Consultant" — the industry filter isn't actually filtering by industry. That's not a cosmetic bug; it's the exact failure mode the evaluation criteria calls out by name: *"prioritize high-impact leads, minimize irrelevant data... Creative approaches that go beyond simple scraping to deliver actionable insights."* Fixing it, with your own test case as the demo, is a much stronger story than a generic "I added a filter" feature.

If time allows in hour 5, add one small second feature in the same data path (dedup + contact-format validation before enrichment) — it's cheap because it reuses the same pipeline, and it directly hits the Technicality bonus line: *"Bonus points will be given for features that improve data quality, such as deduplication, enrichment, or validation."* That keeps you inside "1–2 impactful features" without diluting the main story.

What I'd avoid: rebuilding scraping from scratch, trying to clone the whole product, or picking a feature you can't finish end-to-end in 5 hours. A half-working ambitious feature scores worse across every category than a small feature that fully works and is well-argued.

---

## 1. The feature, precisely

**Lead Fit Score**: after a company search returns results, each row gets a 0–100 score plus a one-line reason ("Matched: SaaS, has website, has phone" / "Mismatch: category = Personal Injury Attorney"). A threshold slider lets the user say "only show me 70+" — the list re-sorts and re-filters live, and a running counter shows **"Estimated credits to enrich the leads currently shown: N"** before they commit to enriching anything.

This single feature does three things the evaluation rubric asks for directly:
- **Prioritizes high-impact leads / minimizes irrelevant data** (Business Use Case Understanding)
- **Reduces complexity and guides the user through filtering before a costly action** (UX/UI)
- **Demonstrates data parsing/classification sophistication and improves data quality** (Technicality)

**Optional second feature (hour 5, only if on schedule): Dedup + Validation Guard.** Before a lead can be enriched, cross-check it against already-saved leads (by domain/phone) and run a lightweight format check (valid phone/email shape) so credits aren't wasted on duplicates or garbage contacts. Same data model, ~45–60 minutes of work, and it's literally named in the rubric's bonus line.

---

## 2. Important scope note

You don't have access to SaaSquatch's actual codebase, so "enhance the tool" has to mean: **build a standalone prototype that implements this feature end-to-end against the same kind of data SaaSquatch works with**, not literally patch their repo. That's also exactly what the Submission Requirements assume — a GitHub repo, a README, a dataset "if permissible," and an optional Jupyter/API demo. Frame the README and video around "here's how I'd bring this into SaaSquatch's existing product" so the judges see it as an extension, not a disconnected side project.

Use a legitimate public data source for company discovery — Google Places API (or a similarly ToS-compliant business-data API) — not scraping SaaSquatch itself or an unauthorized target. This also sidesteps the exact data-quality problem you're fixing: Places API returns a real `types`/category taxonomy you can score against, unlike whatever loose matching is happening on the live product.

---

## 3. Technical architecture

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Next.js (React) + TypeScript + Tailwind CSS** | One framework for UI + API routes keeps the 5-hour build simple; Tailwind lets you match a polished dark UI fast (Design is worth 5 pts on its own) |
| Backend | **Next.js API routes** (Node/TypeScript) | No separate backend service to stand up or deploy; everything ships as one Vercel project |
| Company data source | **Google Places API (Text Search + Place Details)** | Real category/type taxonomy to score against, legitimate ToS-compliant source, generous free tier |
| Scoring | **Rule-based signals + embedding similarity** (OpenAI `text-embedding-3-small`, cosine similarity between the requested industry and the place's category/name) | Fast to build, explainable (you can show *why* a score was given, not just a black-box number), cheap at demo scale |
| Database | **Postgres via Supabase (free tier)** | Managed, zero ops, has a clean web UI to show in the video; schema: `searches`, `companies`, `fit_scores` |
| ORM | **Prisma** | Type-safe schema + migrations, fast to scaffold |
| Caching | **Upstash Redis (serverless, free tier)** — cache Places API responses by `(industry, location)` key, 24h TTL | Cuts repeat-query latency and API cost; pairs natively with a serverless deploy; call out in README as "what would scale to production traffic" |
| Hosting | **Vercel (serverless)** | Static assets on the edge, API routes as serverless functions — right fit for a spiky, low-traffic demo; zero-config CI from GitHub |
| Deployment | **GitHub → Vercel auto-deploy on push to `main`**, env vars (Places API key, OpenAI key, Supabase/Upstash URLs) set in Vercel dashboard | Standard, reproducible, nothing to explain away in the video |
| Cloud provider | **Vercel + Supabase + Upstash** (all serverless/managed — no AWS/GCP/Azure account needed) | If you'd rather name a "big three" provider for the answer, the equivalent stack is AWS Lambda + RDS Postgres + ElastiCache, but the managed trio above is achievable inside 5 hours and just as legitimate an architecture answer |

**Data storage strategy, specifically**: three tables — `searches` (query params + timestamp + credit estimate), `companies` (raw normalized fields from Places API), `fit_scores` (score, explanation text, signals JSON, FK to company). This is also your "dataset" deliverable — export the `companies` + `fit_scores` join as a CSV sample in the repo (synthetic/public-API-sourced data is fine to include).

**Performance**: cache Places API + embedding calls (Redis, above); debounce the threshold slider client-side so re-filtering doesn't hammer the API; paginate results server-side rather than loading everything at once.

---

## 4. UX design choices

- Mirror the dark, teal/blue-gradient aesthetic of the live product so it reads as "an extension of SaaSquatch," not a visually unrelated tool.
- Fit Score shown as a colored chip inline in the results table (green ≥70, amber 40–69, red <40), **table sorted by score descending by default** — the point is that high-impact leads float to the top without the user doing anything.
- A score threshold slider above the table that live-filters and re-sorts.
- A persistent "Estimated credits to enrich leads currently shown: N" readout next to the slider — this directly answers the cost-preview gap I found missing in the live product's enrichment flow.
- Click-to-expand "why this score" on any row, showing the underlying signals (category match, has website, has phone, embedding similarity %) — builds trust and doubles as a transparency/ethics point for the "Other" category.
- Skeleton loaders during search + explicit empty states ("No leads matched — try broadening your industry term") rather than a blank table.

---

## 5. Hour-by-hour build plan (5 hours)

1. **Hour 1 — Scaffold**: `create-next-app` w/ TypeScript + Tailwind, Supabase project + Prisma schema + migration, Places API key, repo init with README skeleton and this plan's architecture table pasted in.
2. **Hour 2 — Data pipeline**: API route that takes `industry` + `location`, calls Places Text Search, normalizes results, writes to `companies` + `searches`.
3. **Hour 3 — Scoring engine**: rule-based signal extraction + embedding similarity → Fit Score + explanation string, written to `fit_scores`. Test it specifically against "Software, New York City" and confirm law firms now score low / get filtered — this is your evidence for the video.
4. **Hour 4 — Frontend**: results table with score chips, sort-by-score default, threshold slider, live credit-estimate readout, "why this score" expand, loading/empty states.
5. **Hour 5 — Polish + stretch + ship**: if on schedule, add the dedup/validation guard; otherwise spend the time on empty-state/error handling and visual polish. Deploy to Vercel, write the README (setup instructions + architecture summary + what you'd do with more time), record the rationale video, push final repo.

If hour 3 runs long (scoring is the riskiest part), drop the stretch feature first — never the core scoring engine or the deploy step. A deployed, working core feature beats an undeployed ambitious one under every rubric category.

---

## 6. Submission package

**GitHub repo structure**
```
/README.md              — setup instructions, architecture summary, demo link, "what I'd do with more time"
/prisma/schema.prisma    — searches, companies, fit_scores
/app or /pages           — Next.js routes + API routes
/lib/scoring.ts          — scoring engine (rule signals + embedding similarity)
/lib/places.ts           — Places API client + Redis caching
/data/sample_leads.csv   — exported sample dataset (companies + fit_scores)
/notebook/fit_score_demo.ipynb   — optional: walks through the scoring logic on the "Software, NYC" test case with before/after tables
```

**README must cover** (per Submission Requirements + Game Rule #4): setup instructions; the exact stack named layer by layer (use the table in section 3); data storage strategy; caching/performance approach; hosting model (serverless, and why); deployment process; cloud provider(s). Don't make the evaluator infer any of these — they're explicitly graded.

**Video walkthrough (aim for ~90 seconds, cap at 2:00)** — suggested beats:
1. (10s) The problem, with your own evidence: "I searched 'Software' in NYC on the live product and got mostly law firms — the industry filter isn't really filtering."
2. (15s) The feature: Fit Score + threshold slider + credit estimate, shown live on your own tool with the same query, now correctly ranking real software companies to the top.
3. (15s) "Why this score" expand — one click, showing the signals, establishing this isn't a black box.
4. (15s) Quick architecture callout: Next.js + Postgres/Supabase + Redis caching + Vercel serverless — say it fast, it's fully written in the README for anyone who wants detail.
5. (15–20s) If you built the second feature: 10 seconds on dedup/validation.
6. (10–15s) Close on business value: fewer wasted enrichment credits, faster time-to-qualified-lead, and how you'd wire this into SaaSquatch's existing Company Finder → Data Enhancement flow if given real access.

**Notebook/API demo (optional but recommended)**: a short notebook that runs the scoring function against a handful of saved Places results and prints a before/after table (raw order vs. score-sorted order) is a fast, low-risk way to satisfy this without extra build time — you can generate it from the same `/lib/scoring.ts` logic via a thin Python port or by calling your deployed API and printing the response.

---

## 7. How this maps to the evaluation criteria

| Criterion | Points | How the Fit Score feature earns it |
|---|---|---|
| Business Use Case Understanding | 10 | Directly targets "prioritize high-impact leads, minimize irrelevant data" using a real, reproduced gap in the live product as evidence |
| UX/UI | 10 | Default sort-by-score, live threshold filter, credit-cost preview before a costly action, "why this score" transparency |
| Technicality | 10 | Real data pipeline (Places API), explainable scoring (rules + embeddings), caching, and — if hour 5 lands — dedup/validation |
| Design | 5 | Visual continuity with the live product's dark UI, color-coded score chips, clean empty/loading states |
| Other | 5 | Transparent/explainable scoring is an ethical-data-use angle; framing the README around "how this plugs into the existing product" shows product judgment beyond the code |

---

## 8. Business Understanding — drafts

These are grounded in Caprae's own public material (the two Substack posts, and Kevin Hong's LinkedIn posts on hiring/culture and on search-fund CEO termination/governance issues). Treat them as strong first drafts — the "why I want to work here" answer especially should end up in your own voice before you submit.

### What is Caprae's Mission?

Caprae Capital positions itself as an "anti-PE" private equity and search fund firm — built by founders and entrepreneurs, for founders and entrepreneurs, rather than following the traditional institutional PE playbook. Its stated mission centers on rebuilding parts of the finance world "from the inside out," using speed and AI as the primary levers rather than headcount or capital alone: the firm has stated a belief that a large share of traditional finance work will be automated, and it's building tooling (like SaaSquatch Leads) and processes to get ahead of that shift rather than resist it.

Operationally, the mission shows up as a merit-based, transparency-first culture: advancement tied to demonstrated capability rather than tenure, feedback given publicly and fast, and communication overhead treated as a first-class problem to engineer away (their own framing: "Delay = Time per step × Number of steps," borrowing practices like GitLab's public-by-default decisions and Amazon's written-narrative-before-meetings). The firm also spends real effort on ecosystem-level transparency beyond its own deals — for example, Kevin Hong's ongoing research into search-fund CEO termination patterns and the frequent absence of employment agreements, particularly where underrepresented CEOs are disproportionately affected — suggesting the mission isn't just "close deals fast" but "fix structural problems in how search funds and ETA deals are run."

### Why do you want to work at Caprae Capital? **[YOUR INPUT NEEDED — draft below to personalize]**

*Draft starting point, written from what's on your profile — replace/extend with your own reasoning before submitting:*

I'm drawn to Caprae because the firm is building real software (SaaSquatch Leads, shipped and already at 1,200+ users in three weeks per their own launch numbers) to solve problems inside its own deal pipeline, rather than treating tech as a side project — that's the same posture I take running Nexigo Solutions, where I build the tools my own client and family-business operations actually run on rather than buying off-the-shelf. The merit-based, fast-feedback culture described in Caprae's own writing (public feedback, written-first decisions, capability over tenure) is the environment I already prefer working in. And the ETA/search-fund space specifically is interesting to me because it's a market where good software and good data — not just capital — genuinely change outcomes, which is exactly the kind of problem I want to spend my time on.

### How is Caprae Changing the ETA Space and Broader PE?

Caprae's positioning is explicitly against the traditional PE model — its own recruiting language calls it "the most anti-PE finance firm," built by and for operators rather than institutional allocators. Two concrete ways this shows up: first, tooling — SaaSquatch Leads is an internally-built, AI-driven lead generation and enrichment platform that Caprae uses in its own sourcing and now sells to other search-fund operators and independent sponsors, effectively productizing the sourcing edge that used to be a manual, headcount-heavy process for individual searchers. Second, governance advocacy — Kevin Hong's ongoing research into CEO termination patterns in search funds (the frequent absence of employment agreements, recurring patterns tied to specific law firms, and disproportionate impact on underrepresented CEOs) is public, evidence-based pressure on a structural blind spot in the ETA ecosystem that most PE firms have no incentive to surface. Combined with an operating philosophy built around speed (their own "Delay = Time × Steps" framing) and merit over hierarchy, Caprae is positioning itself less as a capital allocator and more as an infrastructure-and-accountability layer for the search fund/ETA space.

---

## 9. Personal & logistics questions — **[YOUR INPUT NEEDED, not filled in]**

I don't have this information about you and won't guess at it — these need your own answers:

- **Current working status in the US** — your actual visa/work-authorization status (or confirmation you'd be working remotely from Pakistan, if that's the plan — worth noting Caprae's own hiring posts explicitly advertise global/remote roles, so a non-US location isn't automatically disqualifying).
- **Willing/able to work 40 hrs/week minimum?** — straightforward yes/no based on your actual availability.
- **Why Caprae Capital?** (the short-form version of section 8's essay) — a 2–3 sentence version once you've finalized the longer answer.
- **Expected salary** — this is a number only you should set; I'd suggest researching comparable full-stack roles at early-stage/PE-adjacent startups in your target market before answering, but I won't propose a figure for you.
- **Employment expectations confirmation** (3-month probation; 9AM–6PM EST + 1hr lunch during the 2–3 month training period; occasional off-hours availability, under ~2 hrs/week, for customer-emergency/time-sensitive items) — confirm whether the EST hours during training are workable against your timezone (Asia/Karachi is UTC+5, EST is UTC-5 — a 10-hour gap — so a 9AM–6PM EST day would land roughly 7PM–4AM your local time) and whether the occasional off-hours ask is acceptable to you.

If you want, tell me your answers to these and I'll fold them into a clean final version of this document.
