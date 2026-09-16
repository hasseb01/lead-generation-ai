import { NextRequest, NextResponse } from "next/server";
import { findLookalikes } from "@/lib/lookalikes";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const results = await findLookalikes(id);
  return NextResponse.json({ results });
}
