import type { MatchResults } from "./types";

/** Convert a MatchResults object into a Prisma MatchRecord `data` payload. */
export async function buildHistoryEntrySafe(results: MatchResults) {
  const finishedAt = results.finishedAt ? new Date(results.finishedAt) : new Date();
  const matchDate = results.tournament?.matchDate || finishedAt.toISOString().slice(0, 10);
  const teamAName = results.teamA?.name ?? "Team A";
  const teamBName = results.teamB?.name ?? "Team B";
  const teamATag = results.teamA?.tag ?? "";
  const teamBTag = results.teamB?.tag ?? "";
  const seriesScoreA = results.seriesScore?.teamA ?? 0;
  const seriesScoreB = results.seriesScore?.teamB ?? 0;
  const winnerKey = results.winnerKey ?? (seriesScoreA > seriesScoreB ? "teamA" : "teamB");
  const winnerName = winnerKey === "teamA" ? teamAName : teamBName;
  const mvpNickname = results.mvp?.nickname ?? null;
  const mapsLabel = (results.maps ?? []).map((m) => m.mapName).join(", ");

  return {
    finishedAt,
    matchDate,
    tournamentName: results.tournament?.name ?? "Custom Event",
    stage: results.tournament?.stage ?? "Group Stage",
    eventType: results.tournament?.eventType === "LAN" ? "LAN" : "Online",
    format: results.format ?? "BO3",
    teamAName,
    teamBName,
    teamATag,
    teamBTag,
    seriesScoreA,
    seriesScoreB,
    winnerKey,
    winnerName,
    mvpNickname,
    mapsLabel,
    includedInStats: true,
    dataJson: JSON.stringify(results),
  };
}
