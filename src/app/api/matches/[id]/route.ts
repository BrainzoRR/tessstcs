import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isValidHistoryId } from "@/lib/historyValidation.js";

export const dynamic = "force-dynamic";

/** PATCH /api/matches/[id] — update includedInStats flag. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.includedInStats !== "boolean") {
    return NextResponse.json({ error: "includedInStats must be boolean" }, { status: 400 });
  }
  try {
    const { id } = await params;
    if (!isValidHistoryId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const data = { includedInStats: body.includedInStats };
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
    if (!isValidHistoryId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await db.matchRecord.deleteMany({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/matches/[id] DELETE]", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
