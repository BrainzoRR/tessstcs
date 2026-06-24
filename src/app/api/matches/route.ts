import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rowToEntry, entryToRow } from "@/lib/db-sync";

export const dynamic = "force-dynamic";

/** GET /api/matches — return all stored matches as entries (newest first). */
export async function GET() {
  try {
    const rows = await db.matchRecord.findMany({
      orderBy: { finishedAt: "desc" },
    });
    const entries = rows.map(rowToEntry);
    return NextResponse.json({ entries, count: entries.length });
  } catch (err) {
    console.error("[api/matches GET]", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

/** POST /api/matches — save a single entry (upsert by id). */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const entry = body?.entry ?? body;
    if (!entry?.id) {
      return NextResponse.json({ error: "No id" }, { status: 400 });
    }
    const row = entryToRow(entry);
    const dataJsonSize = row.dataJson.length;
    console.log(`[api/matches POST] id=${row.id} | dataJson=${dataJsonSize} bytes (${(dataJsonSize/1024).toFixed(1)} KB) | maps=${row.mapsLabel}`);
    if (dataJsonSize > 4_000_000) {
      console.error(`[api/matches POST] dataJson too large (${dataJsonSize} bytes) — would exceed Vercel 4.5MB limit`);
    }
    const saved = await db.matchRecord.upsert({
      where: { id: row.id },
      create: row,
      update: row,
    });
    return NextResponse.json({ ok: true, id: saved.id, size: dataJsonSize });
  } catch (err) {
    console.error("[api/matches POST]", err);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}

/** DELETE /api/matches?ids=a,b,c — delete by ids; or all if no ids. */
export async function DELETE(req: NextRequest) {
  try {
    const idsParam = req.nextUrl.searchParams.get("ids");
    if (idsParam) {
      const ids = idsParam.split(",").filter(Boolean);
      const result = await db.matchRecord.deleteMany({ where: { id: { in: ids } } });
      return NextResponse.json({ deleted: result.count });
    }
    const result = await db.matchRecord.deleteMany({});
    return NextResponse.json({ deleted: result.count });
  } catch (err) {
    console.error("[api/matches DELETE]", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
