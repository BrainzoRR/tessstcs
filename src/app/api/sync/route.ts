import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { entryToRow, rowToEntry } from "@/lib/db-sync";
import { validateImport } from "@/lib/historyValidation.js";

export const dynamic = "force-dynamic";

/**
 * POST /api/sync — additive upserts, never a destructive reconciliation.
 * Accepts { entries: MatchHistoryEntry[] } or a legacy bare array.
 * Validate and convert the WHOLE batch before the first write. An empty array
 * is a no-op; deletion is only available through explicit DELETE endpoints.
 * Returns all stored entries, including rows absent from this client's archive.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const validation = validateImport(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  try {
    const rows = validation.entries!.map(entryToRow);
    for (const row of rows) {
      await db.matchRecord.upsert({
        where: { id: row.id },
        create: row,
        update: row,
      });
    }
    const finalRows = await db.matchRecord.findMany({
      orderBy: { finishedAt: "desc" },
    });
    return NextResponse.json({
      ok: true,
      entries: finalRows.map(rowToEntry),
      synced: rows.length,
      deleted: 0,
    });
  } catch (err) {
    console.error("[api/sync POST]", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
