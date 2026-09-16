import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scanWebsite } from "@/lib/webScan";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await db.company.findUnique({ where: { id } });
  if (!company) {
    return NextResponse.json({ error: "company not found" }, { status: 404 });
  }
  if (!company.website) {
    return NextResponse.json({ error: "company has no website to scan" }, { status: 400 });
  }

  const result = await scanWebsite(company.website);

  let changedSincePrev = false;
  if (result.fetchOk && result.contentHash) {
    const prev = await db.webScan.findFirst({
      where: { companyId: id, fetchOk: true },
      orderBy: { createdAt: "desc" },
    });
    if (prev?.contentHash && prev.contentHash !== result.contentHash) changedSincePrev = true;
  }

  const saved = await db.webScan.create({
    data: {
      companyId: id,
      url: result.url,
      fetchOk: result.fetchOk,
      error: result.error,
      techStack: result.fetchOk ? JSON.stringify(result.techStack) : null,
      topics: result.fetchOk ? JSON.stringify(result.topics) : null,
      summary: result.summary,
      contentHash: result.contentHash,
      changedSincePrev,
    },
  });

  return NextResponse.json(saved);
}
