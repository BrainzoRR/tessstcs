import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/debug — diagnostic endpoint to verify the DB connection and see
 * what matches are actually persisted. Useful for debugging Vercel + Neon
 * deployments. Returns counts + recent match ids + the DATABASE_URL prefix
 * (host only, no credentials) so you can confirm the right DB is wired up.
 */
export async function GET() {
  try {
    const count = await db.matchRecord.count();
    const recent = await db.matchRecord.findMany({
      take: 10,
      orderBy: { finishedAt: "desc" },
      select: {
        id: true,
        finishedAt: true,
        matchDate: true,
        tournamentName: true,
        teamAName: true,
        teamBName: true,
        seriesScoreA: true,
        seriesScoreB: true,
        includedInStats: true,
      },
    });

    // Reveal only the host of DATABASE_URL (no credentials) so the user can
    // confirm the app is talking to Neon and not a local SQLite file.
    const url = process.env.DATABASE_URL || "(not set)";
    let dbHost = "(unknown)";
    let dbScheme = "(unknown)";
    try {
      const u = new URL(url);
      dbHost = u.host;
      dbScheme = u.protocol.replace(":", "");
    } catch {
      dbScheme = url.startsWith("file:") ? "file (SQLite!)" : "(unparseable)";
      dbHost = url.startsWith("file:") ? url.slice(0, 60) : "(n/a)";
    }

    return NextResponse.json({
      ok: true,
      dbProvider: dbScheme,
      dbHost,
      totalMatches: count,
      recentMatches: recent,
      hint:
        dbScheme === "file"
          ? "⚠️ DATABASE_URL is still a local SQLite file — data will NOT persist on Vercel. Set DATABASE_URL to your Neon postgresql:// connection string in Vercel → Settings → Environment Variables."
          : count === 0
            ? "ℹ️ DB is empty — tables exist but no matches saved yet. Simulate a match and check again."
            : "✅ DB is connected and has matches.",
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        hint:
          "If 'The table MatchRecord does not exist' — run the CREATE TABLE SQL from NEON-SETUP-RU.md in the Neon SQL Editor. If 'PrismaClientInitializationError' — DATABASE_URL is missing or wrong on Vercel.",
      },
      { status: 500 }
    );
  }
}
