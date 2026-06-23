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
 * Body: { entries: SyncEntry[], mergeOnly?: boolean }
 *
 * Default (mergeOnly=true): upsert every entry sent by the client (add/update
 * by id). Never delete — this is the safe mode used by the autosync effect so
 * a temporarily-empty client matchHistory (e.g. after localStorage quota
 * issues) can never wipe the DB.
 *
 * mergeOnly=false: full reconcile — also delete DB rows whose id is not in the
 * client's list. Used only when the user explicitly clears history or deletes
 * matches (those go through dedicated endpoints instead).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const incoming: SyncEntry[] = Array.isArray(body?.entries)
      ? body.entries
      : Array.isArray(body)
        ? body
        : [];
    const mergeOnly = body?.mergeOnly !== false; // default true (safe)
    const incomingIds = new Set(incoming.map((e) => e?.id).filter(Boolean));

    // Upsert all incoming entries
    let upserted = 0;
    for (const entry of incoming) {
      if (!entry?.id) continue;
      const row = entryToRow(entry);
      await db.matchRecord.upsert({
        where: { id: row.id },
        create: row,
        update: row,
      });
      upserted += 1;
    }

    let deleted = 0;
    if (!mergeOnly) {
      const allRows = await db.matchRecord.findMany({ select: { id: true } });
      const toDelete = allRows
        .map((r) => r.id)
        .filter((id) => !incomingIds.has(id));
      if (toDelete.length > 0) {
        const res = await db.matchRecord.deleteMany({
          where: { id: { in: toDelete } },
        });
        deleted = res.count;
      }
    }

    const finalRows = await db.matchRecord.findMany({
      orderBy: { finishedAt: "desc" },
    });
    return NextResponse.json({
      ok: true,
      entries: finalRows.map(rowToEntry),
      synced: upserted,
      deleted,
      mergeOnly,
    });
  } catch (err) {
    console.error("[api/sync POST]", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}

