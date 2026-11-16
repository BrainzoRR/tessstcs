// Server-side helpers to convert between the app's MatchHistoryEntry shape
// (used by archiveStats.js) and the Prisma MatchRecord row.

import { validateHistoryEntry } from "./historyValidation.js";

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
  const error = validateHistoryEntry(entry);
  if (error) throw new TypeError(error);
  const rawData = entry.data as Record<string, any>;

  // Strip heavy fields before serializing to avoid Vercel's 4.5MB request
  // body limit. We keep enough data for Analyst Desk (expectancy curves,
  // round swings, player form board) and heatmaps (death markers via
  // timeline zone/site metadata), while stripping the truly heavy parts:
  // - teamAPlayers/teamBPlayers: full live-state player objects (2.5MB)
  // - logs: redundant with timeline
  // - startLoadouts/loadouts: full weapon+armor snapshots per player per round
  // - snapshot inside timeline events: full game state copy (~3KB each)
  // We KEEP: playerRoundStats, preRoundExpectancy, spectatorLeaders, and
  // timeline (with snapshot stripped from each event). This lets Analyst Desk
  // and heatmaps work on saved matches while staying ~300-500KB per BO5.
  const HEAVY_MAP_KEYS = new Set([
    "teamAPlayers",
    "teamBPlayers",
    "teamAState",
    "teamBState",
  ]);
  const HEAVY_ROUND_KEYS = new Set([
    "logs",
    "startLoadouts",
    "loadouts",
  ]);
  const data: Record<string, any> = { ...rawData };
  if (Array.isArray(data.maps)) {
    data.maps = data.maps.map((m: any) => {
      if (!m || typeof m !== "object") return m;
      const rest: Record<string, any> = {};
      for (const key of Object.keys(m)) {
        if (HEAVY_MAP_KEYS.has(key)) continue;
        rest[key] = m[key];
      }
      // Slim down each round: strip logs/startLoadouts/loadouts but KEEP
      // playerRoundStats, preRoundExpectancy, spectatorLeaders, timeline.
      // For timeline, strip the heavy `snapshot` field from each event
      // (full game state ~3KB each) but keep event metadata (kind, clock,
      // zone, site, label, meta) for analyst desk and heatmap markers.
      if (Array.isArray(rest.rounds)) {
        rest.rounds = rest.rounds.map((r: any) => {
          if (!r || typeof r !== "object") return r;
          const slim: Record<string, any> = {};
          for (const key of Object.keys(r)) {
            if (HEAVY_ROUND_KEYS.has(key)) continue;
            // Strip `snapshot` from timeline events but keep the rest
            if (key === "timeline" && Array.isArray(r[key])) {
              slim[key] = r[key].map((event: any) => {
                if (!event || typeof event !== "object") return event;
                const { snapshot, ...eventRest } = event;
                return eventRest;
              });
            } else {
              slim[key] = r[key];
            }
          }
          return slim;
        });
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
