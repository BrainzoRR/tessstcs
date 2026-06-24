import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { entryToRow, rowToEntry } from "@/lib/db-sync";

export const dynamic = "force-dynamic";

interface SyncEntry {
  id: string;
  [key: string]: unknown;
}

/**
 * POST /api/sync
 * Body: { entries: SyncEntry[] }
 * Reconciles the DB with the client's full matchHistory:
 *   - upsert every entry sent by the client (by id)
 *   - delete DB rows whose id is not in the client's list
 * Returns the resulting full list of entries (so the client can refresh).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const incoming: SyncEntry[] = Array.isArray(body?.entries)
      ? body.entries
      : Array.isArray(body)
        ? body
        : [];
    const incomingIds = new Set(incoming.map((e) => e?.id).filter(Boolean));

    // Upsert all incoming entries
    for (const entry of incoming) {
      if (!entry?.id) continue;
      const row = entryToRow(entry);
      await db.matchRecord.upsert({
        where: { id: row.id },
        create: row,
        update: row,
      });
    }

    // Delete rows not present in the incoming list
    const allRows = await db.matchRecord.findMany({ select: { id: true } });
    const toDelete = allRows
      .map((r) => r.id)
      .filter((id) => !incomingIds.has(id));
    if (toDelete.length > 0) {
      await db.matchRecord.deleteMany({ where: { id: { in: toDelete } } });
    }

    // Return the reconciled full list
    const finalRows = await db.matchRecord.findMany({
      orderBy: { finishedAt: "desc" },
    });
    return NextResponse.json({
      ok: true,
      entries: finalRows.map(rowToEntry),
      synced: incoming.length,
      deleted: toDelete.length,
    });
  } catch (err) {
    console.error("[api/sync POST]", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
