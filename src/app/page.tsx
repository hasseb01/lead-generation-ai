"use client";

import React, { useMemo, useState } from "react";

type FitScore = {
  score: number;
  reason: string;
  categoryMatch: boolean;
  hasWebsite: boolean;
  hasPhone: boolean;
  similarity: number;
};

type Company = {
  id: string;
  placeId: string;
  name: string;
  category: string | null;
  address: string | null;
  website: string | null;
  phone: string | null;
  rating: number | null;
  domain: string | null;
  isDuplicate: boolean;
  validContact: boolean;
  fitScore: FitScore | null;
};

type EmailCheck = {
  id: string;
  email: string;
  status: "valid" | "invalid" | "risky" | "unknown";
  reason: string;
  syntaxValid: boolean;
  mxFound: boolean;
  smtpDeliverable: boolean | null;
  isDisposable: boolean;
  isRoleAccount: boolean;
  isCatchAll: boolean | null;
  guessed: boolean;
};

function emailStatusColor(status: EmailCheck["status"]) {
  if (status === "valid") return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
  if (status === "risky") return "bg-amber-500/20 text-amber-300 border-amber-500/40";
  if (status === "unknown") return "bg-slate-500/20 text-slate-300 border-slate-500/40";
  return "bg-rose-500/20 text-rose-300 border-rose-500/40";
}

type TechMatch = { name: string; category: string; evidence: string };

type WebScan = {
  id: string;
  url: string;
  fetchOk: boolean;
  error: string | null;
  techStack: string | null; // JSON-encoded TechMatch[]
  topics: string | null; // JSON-encoded string[]
  summary: string | null;
  changedSincePrev: boolean;
  createdAt: string;
};

type Lookalike = {
  companyId: string;
  name: string;
  domain: string | null;
  category: string | null;
  similarity: number;
};

type SearchResponse = {
  searchId: string;
  source: "google_places" | "mock";
  companies: Company[];
};

function scoreColor(score: number) {
  if (score >= 70) return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
  if (score >= 40) return "bg-amber-500/20 text-amber-300 border-amber-500/40";
  return "bg-rose-500/20 text-rose-300 border-rose-500/40";
}

export default function Home() {
  const [industry, setIndustry] = useState("Software");
  const [location, setLocation] = useState("New York City");
  const [productKeyword, setProductKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [threshold, setThreshold] = useState(40);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [emailChecks, setEmailChecks] = useState<Record<string, EmailCheck>>({});
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const [webScans, setWebScans] = useState<Record<string, WebScan>>({});
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [lookalikes, setLookalikes] = useState<Record<string, Lookalike[]>>({});
  const [lookalikesLoadingId, setLookalikesLoadingId] = useState<string | null>(null);

  const [manualEmail, setManualEmail] = useState("");
  const [manualResult, setManualResult] = useState<EmailCheck | null>(null);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const shown = useMemo(() => {
    if (!result) return [];
    return result.companies
      .filter((c) => (c.fitScore?.score ?? 0) >= threshold)
      .sort((a, b) => (b.fitScore?.score ?? 0) - (a.fitScore?.score ?? 0));
  }, [result, threshold]);

  const creditEstimate = useMemo(
    () => shown.filter((c) => !c.isDuplicate).length,
    [shown]
  );
  const duplicateCount = shown.length - creditEstimate;

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry, location, productKeyword: productKeyword || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Search failed (${res.status})`);
      }
      const data = (await res.json()) as SearchResponse;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCompanyEmail(companyId: string) {
    setVerifyingId(companyId);
    try {
      const res = await fetch(`/api/companies/${companyId}/verify-email`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Verification failed");
      setEmailChecks((prev) => ({ ...prev, [companyId]: data as EmailCheck }));
    } catch (err) {
      setEmailChecks((prev) => ({
        ...prev,
        [companyId]: {
          id: "error",
          email: "",
          status: "unknown",
          reason: err instanceof Error ? err.message : "Verification failed",
          syntaxValid: false,
          mxFound: false,
          smtpDeliverable: null,
          isDisposable: false,
          isRoleAccount: false,
          isCatchAll: null,
          guessed: true,
        },
      }));
    } finally {
      setVerifyingId(null);
    }
  }

  async function handleManualVerify(e: React.FormEvent) {
    e.preventDefault();
    setManualLoading(true);
    setManualError(null);
    setManualResult(null);
    try {
      const res = await fetch("/api/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: manualEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Verification failed");
      setManualResult(data as EmailCheck);
    } catch (err) {
      setManualError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setManualLoading(false);
    }
  }

  async function handleScanWebsite(companyId: string) {
    setScanningId(companyId);
    try {
      const res = await fetch(`/api/companies/${companyId}/scan`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan failed");
      setWebScans((prev) => ({ ...prev, [companyId]: data as WebScan }));
    } catch (err) {
      setWebScans((prev) => ({
        ...prev,
        [companyId]: {
          id: "error",
          url: "",
          fetchOk: false,
          error: err instanceof Error ? err.message : "Scan failed",
          techStack: null,
          topics: null,
          summary: null,
          changedSincePrev: false,
          createdAt: new Date().toISOString(),
        },
      }));
    } finally {
      setScanningId(null);
    }
  }

  async function handleFindLookalikes(companyId: string) {
    setLookalikesLoadingId(companyId);
    try {
      const res = await fetch(`/api/companies/${companyId}/lookalikes`, { method: "POST" });
      const data = await res.json();
      setLookalikes((prev) => ({ ...prev, [companyId]: (data.results ?? []) as Lookalike[] }));
    } catch {
      setLookalikes((prev) => ({ ...prev, [companyId]: [] }));
    } finally {
      setLookalikesLoadingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Lead Fit Score <span className="text-teal-400">— Company Finder</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Rank and filter scraped companies by ICP match before spending a credit enriching them.
          </p>
        </header>

        <form
          onSubmit={handleSearch}
          className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-5 sm:grid-cols-4"
        >
          <div className="sm:col-span-1">
            <label className="mb-1 block text-xs font-medium text-slate-400">Industry</label>
            <input
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-teal-500"
              placeholder="Software"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="mb-1 block text-xs font-medium text-slate-400">Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-teal-500"
              placeholder="New York City"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="mb-1 block text-xs font-medium text-slate-400">Product keyword (optional)</label>
            <input
              value={productKeyword}
              onChange={(e) => setProductKeyword(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-teal-500"
              placeholder="e.g. SaaS"
            />
          </div>
          <div className="flex items-end sm:col-span-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Searching…" : "Search"}
            </button>
          </div>
        </form>

        {error && (
          <div className="mb-6 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        {loading && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-900/60" />
            ))}
          </div>
        )}

        {!loading && result && (
          <>
            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                  <span>Minimum fit score: {threshold}</span>
                  <span>
                    Data source:{" "}
                    {result.source === "google_places" ? (
                      <span className="text-teal-400">Google Places API (live)</span>
                    ) : (
                      <span className="text-amber-400">Mock demo data — add GOOGLE_PLACES_API_KEY for live results</span>
                    )}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full accent-teal-500"
                />
              </div>
              <div className="rounded-lg border border-teal-500/30 bg-teal-500/10 px-4 py-2 text-sm text-teal-200">
                Estimated credits to enrich leads currently shown:{" "}
                <span className="font-semibold text-white">{creditEstimate}</span>
                {duplicateCount > 0 && (
                  <span className="ml-1 text-teal-400">
                    ({duplicateCount} duplicate{duplicateCount === 1 ? "" : "s"} excluded)
                  </span>
                )}
              </div>
            </div>

            {shown.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center text-sm text-slate-400">
                No leads matched — try broadening your industry term or lowering the score threshold.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Fit Score</th>
                      <th className="px-4 py-3">Company</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Address</th>
                      <th className="px-4 py-3">Flags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((c) => (
                      <React.Fragment key={c.id}>
                        <tr
                          onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                          className="cursor-pointer border-t border-slate-800 bg-slate-900/40 transition hover:bg-slate-900"
                        >
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex min-w-[3rem] items-center justify-center rounded-full border px-2 py-1 text-xs font-semibold ${scoreColor(
                                c.fitScore?.score ?? 0
                              )}`}
                            >
                              {c.fitScore?.score ?? 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-white">{c.name}</td>
                          <td className="px-4 py-3 text-slate-300">{c.category ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-400">{c.address ?? "—"}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {c.isDuplicate && (
                                <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300">
                                  duplicate
                                </span>
                              )}
                              {!c.validContact && (
                                <span className="rounded border border-rose-500/40 bg-rose-500/10 px-1.5 py-0.5 text-[10px] text-rose-300">
                                  invalid contact
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedId === c.id && c.fitScore && (
                          <tr className="border-t border-slate-800 bg-slate-950/60">
                            <td colSpan={5} className="px-4 py-3 text-xs text-slate-300">
                              <div className="mb-1 font-medium text-slate-200">{c.fitScore.reason}</div>
                              <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
                                <div>Category match: {c.fitScore.categoryMatch ? "yes" : "no"}</div>
                                <div>Has website: {c.fitScore.hasWebsite ? "yes" : "no"}</div>
                                <div>Has phone: {c.fitScore.hasPhone ? "yes" : "no"}</div>
                                <div>Similarity: {(c.fitScore.similarity * 100).toFixed(0)}%</div>
                              </div>

                              <div className="mt-3 border-t border-slate-800 pt-3">
                                <div className="mb-2 flex items-center justify-between">
                                  <span className="font-medium text-slate-200">Email verification</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleVerifyCompanyEmail(c.id);
                                    }}
                                    disabled={!c.domain || verifyingId === c.id}
                                    className="rounded-md border border-teal-500/40 bg-teal-500/10 px-2.5 py-1 text-[11px] font-medium text-teal-300 transition hover:bg-teal-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    {verifyingId === c.id ? "Verifying…" : "Verify Email"}
                                  </button>
                                </div>
                                {!c.domain && (
                                  <div className="text-slate-500">No website domain on file to check.</div>
                                )}
                                {emailChecks[c.id] && (
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${emailStatusColor(
                                        emailChecks[c.id].status
                                      )}`}
                                    >
                                      {emailChecks[c.id].status}
                                    </span>
                                    <span className="font-mono text-slate-300">{emailChecks[c.id].email}</span>
                                    <span className="text-slate-400">{emailChecks[c.id].reason}</span>
                                  </div>
                                )}
                              </div>

                              <div className="mt-3 border-t border-slate-800 pt-3">
                                <div className="mb-2 flex items-center justify-between">
                                  <span className="font-medium text-slate-200">AI Web Scanner</span>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleFindLookalikes(c.id);
                                      }}
                                      disabled={lookalikesLoadingId === c.id}
                                      className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      {lookalikesLoadingId === c.id ? "Finding…" : "Find similar companies"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleScanWebsite(c.id);
                                      }}
                                      disabled={!c.website || scanningId === c.id}
                                      className="rounded-md border border-teal-500/40 bg-teal-500/10 px-2.5 py-1 text-[11px] font-medium text-teal-300 transition hover:bg-teal-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      {scanningId === c.id ? "Scanning…" : "Scan Website"}
                                    </button>
                                  </div>
                                </div>

                                {!c.website && <div className="text-slate-500">No website on file to scan.</div>}

                                {webScans[c.id] && !webScans[c.id].fetchOk && (
                                  <div className="rounded border border-rose-500/30 bg-rose-500/5 px-2 py-1.5 text-rose-300">
                                    Couldn&apos;t scan this site: {webScans[c.id].error}
                                  </div>
                                )}

                                {webScans[c.id] && webScans[c.id].fetchOk && (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-slate-400">
                                      <span>
                                        Last scanned: {new Date(webScans[c.id].createdAt).toLocaleTimeString()}
                                      </span>
                                      {webScans[c.id].changedSincePrev && (
                                        <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300">
                                          changed since last scan
                                        </span>
                                      )}
                                    </div>
                                    {webScans[c.id].summary && (
                                      <div className="text-slate-300">{webScans[c.id].summary}</div>
                                    )}
                                    {webScans[c.id].techStack && (
                                      <div className="flex flex-wrap gap-1">
                                        {(JSON.parse(webScans[c.id].techStack!) as TechMatch[]).map((t) => (
                                          <span
                                            key={t.name}
                                            title={`${t.category}: ${t.evidence}`}
                                            className="rounded border border-teal-500/30 bg-teal-500/10 px-1.5 py-0.5 text-[10px] text-teal-300"
                                          >
                                            {t.name}
                                          </span>
                                        ))}
                                        {(JSON.parse(webScans[c.id].techStack!) as TechMatch[]).length === 0 && (
                                          <span className="text-slate-500">No known technologies detected</span>
                                        )}
                                      </div>
                                    )}
                                    {webScans[c.id].topics && (
                                      <div className="flex flex-wrap gap-1">
                                        {(JSON.parse(webScans[c.id].topics!) as string[]).map((t) => (
                                          <span
                                            key={t}
                                            className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-300"
                                          >
                                            {t}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {lookalikes[c.id] && (
                                  <div className="mt-2 space-y-1">
                                    {lookalikes[c.id].length === 0 ? (
                                      <div className="text-slate-500">
                                        No lookalikes yet — scan a few companies&apos; websites first so there&apos;s
                                        something to compare against.
                                      </div>
                                    ) : (
                                      lookalikes[c.id].map((l) => (
                                        <div key={l.companyId} className="flex items-center gap-2">
                                          <span className="text-slate-200">{l.name}</span>
                                          <span className="text-slate-500">{l.category}</span>
                                          <span className="ml-auto text-teal-400">
                                            {(l.similarity * 100).toFixed(0)}% similar
                                          </span>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {!loading && !result && !error && (
          <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
            Run a search to see companies ranked by fit score.
          </div>
        )}

        <section className="mt-10 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-sm font-semibold text-white">Validators</h2>
          <p className="mt-1 mb-4 text-xs text-slate-400">
            Check any email address — real DNS/MX lookup and a live SMTP mailbox probe, not just a
            format check.
          </p>
          <form onSubmit={handleManualVerify} className="flex flex-col gap-2 sm:flex-row">
            <input
              value={manualEmail}
              onChange={(e) => setManualEmail(e.target.value)}
              required
              type="email"
              placeholder="user@example.com"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-teal-500"
            />
            <button
              type="submit"
              disabled={manualLoading}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {manualLoading ? "Checking…" : "Verify"}
            </button>
          </form>

          {manualError && <div className="mt-3 text-sm text-rose-400">{manualError}</div>}

          {manualResult && (
            <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${emailStatusColor(
                    manualResult.status
                  )}`}
                >
                  {manualResult.status}
                </span>
                <span className="font-mono text-slate-200">{manualResult.email}</span>
              </div>
              <div className="mb-2 text-slate-300">{manualResult.reason}</div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-400 sm:grid-cols-3">
                <div>MX found: {manualResult.mxFound ? "yes" : "no"}</div>
                <div>
                  SMTP deliverable:{" "}
                  {manualResult.smtpDeliverable === null ? "unknown" : manualResult.smtpDeliverable ? "yes" : "no"}
                </div>
                <div>Disposable: {manualResult.isDisposable ? "yes" : "no"}</div>
                <div>Role account: {manualResult.isRoleAccount ? "yes" : "no"}</div>
                <div>
                  Catch-all domain:{" "}
                  {manualResult.isCatchAll === null ? "n/a" : manualResult.isCatchAll ? "yes" : "no"}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
