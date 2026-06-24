// Server-side helpers to convert between the app's MatchHistoryEntry shape
// (used by archiveStats.js) and the Prisma MatchRecord row.

interface MatchHistoryEntryInput {
  id: string;
  date?: string;
  teams?: string;
  score?: string;
  mvp?: string;
  mapsPlayed?: string;
  tournamentName?: string;
  stage?: string;
  eventType?: string;
  matchDate?: string;
  includedInStats?: boolean;
  data?: unknown;
}

/** Convert an entry (with full `data` payload) into a Prisma MatchRecord row. */
export function entryToRow(entry: MatchHistoryEntryInput) {
  const rawData = (entry.data ?? {}) as Record<string, any>;

  // Strip the heavy per-map live-state player objects before serializing.
  // The original simulation.js includes `teamAPlayers` / `teamBPlayers` in
  // each map — these are the FULL live match-state objects (with money, hp,
  // every attribute, per-round accumulators, etc.) and bloat a single match
  // to 1-2.5MB. That blows past Vercel's 4.5MB request body limit and is
  // never read back by the UI (which only uses the aggregated `players`
  // array + map metadata). Removing them shrinks a match to ~20-40KB.
  const data: Record<string, any> = { ...rawData };
  if (Array.isArray(data.maps)) {
    data.maps = data.maps.map((m: any) => {
      if (!m || typeof m !== "object") return m;
      // Shallow-copy the map without the two heavy player arrays.
      const rest: Record<string, any> = {};
      for (const key of Object.keys(m)) {
        if (key !== "teamAPlayers" && key !== "teamBPlayers") {
          rest[key] = m[key];
        }
      }
      return rest;
    });
  }

  const tournament = data.tournament ?? {};
  const teamA = data.teamA ?? {};
  const teamB = data.teamB ?? {};
  const seriesScore = data.seriesScore ?? { teamA: 0, teamB: 0 };
  const finishedAtRaw =
    entry.date ?? data.finishedAt ?? data.createdAt ?? new Date().toISOString();
  const finishedAt = new Date(finishedAtRaw);
  const matchDate =
    entry.matchDate ??
    tournament.matchDate ??
    (data.finishedAt ?? data.createdAt ?? finishedAtRaw as string).slice(0, 10);

  const winnerKey: string =
    data.winnerKey ?? (seriesScore.teamA > seriesScore.teamB ? "teamA" : "teamB");
  const winnerName: string = winnerKey === "teamA" ? teamA.name ?? "" : teamB.name ?? "";
  const mvpNickname: string | null = data.mvp?.nickname ?? entry.mvp ?? null;
  const mapsLabel: string =
    entry.mapsPlayed ??
    (Array.isArray(data.maps) ? data.maps.map((m: any) => m.mapName).join(", ") : "");

  return {
    id: entry.id,
    finishedAt,
    matchDate,
    tournamentName: entry.tournamentName ?? tournament.name ?? "Custom Event",
    stage: entry.stage ?? tournament.stage ?? "Group Stage",
    eventType: entry.eventType === "LAN" ? "LAN" : "Online",
    format: data.format ?? "BO3",
    teamAName: teamA.name ?? "",
    teamBName: teamB.name ?? "",
    teamATag: teamA.tag ?? "",
    teamBTag: teamB.tag ?? "",
    seriesScoreA: Number(seriesScore.teamA ?? 0),
    seriesScoreB: Number(seriesScore.teamB ?? 0),
    winnerKey,
    winnerName,
    mvpNickname,
    mapsLabel,
    includedInStats: entry.includedInStats !== false,
    dataJson: JSON.stringify(data),
  };
}

/** Convert a DB row back into a MatchHistoryEntry. */
export function rowToEntry(row: {
  id: string;
  createdAt: Date;
  finishedAt: Date;
  matchDate: string;
  tournamentName: string;
  stage: string;
  eventType: string;
  format: string;
  teamAName: string;
  teamBName: string;
  teamATag: string;
  teamBTag: string;
  seriesScoreA: number;
  seriesScoreB: number;
  winnerKey: string;
  winnerName: string;
  mvpNickname: string | null;
  mapsLabel: string;
  includedInStats: boolean;
  dataJson: string;
}): MatchHistoryEntryInput {
  let data: any = {};
  try {
    data = JSON.parse(row.dataJson);
  } catch {
    data = {};
  }
  return {
    id: row.id,
    date: row.finishedAt.toISOString(),
    teams:
      row.teamAName && row.teamBName
        ? `${row.teamAName} vs ${row.teamBName}`
        : "",
    score: `${row.seriesScoreA}-${row.seriesScoreB}`,
    mvp: row.mvpNickname ?? "n/a",
    mapsPlayed: row.mapsLabel,
    tournamentName: row.tournamentName,
    stage: row.stage,
    eventType: row.eventType,
    matchDate: row.matchDate,
    includedInStats: row.includedInStats,
    data,
  };
}
