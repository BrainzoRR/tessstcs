import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** PATCH /api/matches/[id] — update includedInStats flag. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (typeof body.includedInStats === "boolean") {
      data.includedInStats = body.includedInStats;
    }
    const updated = await db.matchRecord.update({ where: { id }, data });
    return NextResponse.json({ ok: true, includedInStats: updated.includedInStats });
  } catch (err) {
    console.error("[api/matches/[id] PATCH]", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

/** DELETE /api/matches/[id] — delete a single match. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.matchRecord.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/matches/[id] DELETE]", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
