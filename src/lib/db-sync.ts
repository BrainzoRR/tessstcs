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
  const data = (entry.data ?? {}) as Record<string, any>;
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
