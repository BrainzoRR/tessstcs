import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const count = await db.matchRecord.count();
    const recent = await db.matchRecord.findMany({
      take: 10,
      orderBy: { finishedAt: "desc" },
      select: {
        id: true, finishedAt: true, matchDate: true, tournamentName: true,
        teamAName: true, teamBName: true, seriesScoreA: true, seriesScoreB: true,
        includedInStats: true,
      },
    });
    const url = process.env.DATABASE_URL || "(not set)";
    let dbHost = "(unknown)";
    let dbScheme = "(unknown)";
    try {
      const u = new URL(url);
      dbHost = u.host;
      dbScheme = u.protocol.replace(":", "");
    } catch {
      dbScheme = url.startsWith("file:") ? "file (SQLite!)" : "(unparseable)";
    }
    return NextResponse.json({
      ok: true, dbProvider: dbScheme, dbHost, totalMatches: count, recentMatches: recent,
      hint: dbScheme === "file"
        ? "SQLite — data will NOT persist on Vercel. Set DATABASE_URL to Neon postgresql://."
        : count === 0 ? "DB is empty." : "DB connected with matches.",
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
