import type {
  ArchiveFilters,
  ArchiveOptions,
  ArchiveOverview,
  AggregatedPlayer,
  AggregatedTeam,
  AggregatedMap,
  AggregatedTournament,
  AggregatedStats,
  MatchHistoryEntry,
  MatchResults,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function roundMetric(v: number, digits = 0): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

export function createArchiveFilters(): ArchiveFilters {
  return {
    search: "",
    team: "all",
    tournament: "all",
    stage: "all",
    eventType: "all",
    map: "all",
    from: "",
    to: "",
    status: "all",
  };
}

/** Build a MatchHistoryEntry from a stored DB row (with parsed dataJson). */
export function buildEntryFromRow(row: {
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
}): MatchHistoryEntry {
  let data: MatchResults;
  try {
    data = JSON.parse(row.dataJson);
  } catch {
    data = {} as MatchResults;
  }
  return {
    id: row.id,
    date: row.finishedAt.toISOString(),
    teams: `${row.teamAName} vs ${row.teamBName}`,
    score: `${row.seriesScoreA}-${row.seriesScoreB}`,
    mvp: row.mvpNickname ?? "n/a",
    mapsPlayed: row.mapsLabel,
    tournamentName: row.tournamentName,
    stage: row.stage,
    eventType: row.eventType as MatchHistoryEntry["eventType"],
    matchDate: row.matchDate,
    includedInStats: row.includedInStats,
    data,
  };
}

// ---------------------------------------------------------------------------
// Options (for filter dropdowns)
// ---------------------------------------------------------------------------

export function buildArchiveOptions(entries: MatchHistoryEntry[]): ArchiveOptions {
  const teams = new Set<string>();
  const tournaments = new Set<string>();
  const stages = new Set<string>();
  const maps = new Set<string>();

  for (const e of entries) {
    if (e.data?.teamA?.name) teams.add(e.data.teamA.name);
    if (e.data?.teamB?.name) teams.add(e.data.teamB.name);
    if (e.tournamentName) tournaments.add(e.tournamentName);
    if (e.stage) stages.add(e.stage);
    e.data?.maps?.forEach((m) => {
      if (m.mapName) maps.add(m.mapName);
    });
  }

  const sortStr = (v: string[]) => [...v].sort((a, b) => a.localeCompare(b));
  return {
    teams: sortStr([...teams]),
    tournaments: sortStr([...tournaments]),
    stages: sortStr([...stages]),
    maps: sortStr([...maps]),
    eventTypes: ["Online", "LAN"],
  };
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

function entryTeamNames(e: MatchHistoryEntry): string[] {
  return [e.data?.teamA?.name, e.data?.teamB?.name, e.data?.teamA?.tag, e.data?.teamB?.tag].filter(
    Boolean
  ) as string[];
}

function entryMapNames(e: MatchHistoryEntry): string[] {
  return (e.data?.maps ?? []).map((m) => m.mapName).filter(Boolean);
}

export function filterArchiveEntries(
  entries: MatchHistoryEntry[],
  filters: ArchiveFilters,
  options: { statsOnly?: boolean } = {}
): MatchHistoryEntry[] {
  const statsOnly = options.statsOnly === true;
  return entries.filter((e) => {
    if (!e.data) return false;
    if (statsOnly && e.includedInStats === false) return false;

    if (filters.status === "included" && e.includedInStats === false) return false;
    if (filters.status === "excluded" && e.includedInStats !== false) return false;

    if (filters.search) {
      const haystack = [
        e.teams, e.mvp, e.tournamentName, e.stage, e.eventType, e.mapsPlayed,
        ...entryTeamNames(e), ...entryMapNames(e),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(filters.search.toLowerCase())) return false;
    }

    if (filters.team !== "all" && !entryTeamNames(e).includes(filters.team)) return false;
    if (filters.tournament !== "all" && e.tournamentName !== filters.tournament) return false;
    if (filters.stage !== "all" && e.stage !== filters.stage) return false;
    if (filters.eventType !== "all" && e.eventType !== filters.eventType) return false;
    if (filters.map !== "all" && !entryMapNames(e).includes(filters.map)) return false;

    if (filters.from && e.matchDate < filters.from) return false;
    if (filters.to && e.matchDate > filters.to) return false;

    return true;
  });
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export function buildArchiveOverview(
  allEntries: MatchHistoryEntry[],
  includedEntries: MatchHistoryEntry[]
): ArchiveOverview {
  const totalMaps = includedEntries.reduce((s, e) => s + (e.data?.maps?.length ?? 0), 0);
  const totalTournaments = new Set(includedEntries.map((e) => e.tournamentName).filter(Boolean)).size;
  const lanMatches = includedEntries.filter((e) => e.eventType === "LAN").length;
  const onlineMatches = includedEntries.filter((e) => e.eventType === "Online").length;

  return {
    totalMatches: allEntries.length,
    includedMatches: includedEntries.length,
    excludedMatches: allEntries.length - includedEntries.length,
    totalMaps,
    totalTournaments,
    lanMatches,
    onlineMatches,
  };
}

// ---------------------------------------------------------------------------
// Aggregation: players
// ---------------------------------------------------------------------------

function derivePlayerMetrics(s: {
  kills: number; deaths: number; damage: number; headshots: number;
  openingKills: number; entriesWon: number; kastRounds: number;
  roundsPlayed: number;
}) {
  const rp = Math.max(1, s.roundsPlayed);
  const kpr = s.kills / rp;
  const dpr = s.deaths / rp;
  const adr = s.damage / rp;
  const kast = s.kastRounds / rp;
  const impact = (2 * kpr + 2.5 * (s.entriesWon / rp) + s.openingKills / rp) / 3;
  const rawRating = (kpr * 0.73 + (0.44 - dpr) * 0.54 + (adr / 100) * 0.38 + kast * 0.16 + impact * 0.1) * 1.08;
  const sampleWeight = clamp((rp - 1) / 8, 0.14, 1);
  const rating = clamp(1 + (rawRating - 1) * sampleWeight, 0.35, 2.08);
  return {
    kd: roundMetric(s.kills / Math.max(1, s.deaths), 2),
    adr: roundMetric(adr, 1),
    kastPercent: roundMetric(kast * 100, 0),
    hsPercent: roundMetric((s.headshots / Math.max(1, s.kills)) * 100, 0),
    impact: roundMetric(impact, 2),
    rating: roundMetric(rating, 2),
  };
}

export function aggregatePlayerStats(entries: MatchHistoryEntry[]): AggregatedPlayer[] {
  const players = new Map<string, {
    key: string; id: string; nickname: string; role: string;
    teams: Set<string>; seriesPlayed: number;
    kills: number; deaths: number; assists: number; damage: number; headshots: number;
    openingKills: number; entriesWon: number; clutchesWon: number; clutchAttempts: number;
    flashAssists: number; roundsPlayed: number; kastRounds: number; survivedRounds: number;
    tradedRounds: number; bestRoundKills: number;
  }>();

  for (const e of entries) {
    for (const p of e.data?.players ?? []) {
      const key = `${p.id}::${p.nickname}`;
      if (!players.has(key)) {
        players.set(key, {
          key, id: p.id, nickname: p.nickname, role: p.role, teams: new Set(),
          seriesPlayed: 0, kills: 0, deaths: 0, assists: 0, damage: 0, headshots: 0,
          openingKills: 0, entriesWon: 0, clutchesWon: 0, clutchAttempts: 0,
          flashAssists: 0, roundsPlayed: 0, kastRounds: 0, survivedRounds: 0,
          tradedRounds: 0, bestRoundKills: 0,
        });
      }
      const a = players.get(key)!;
      a.seriesPlayed += 1;
      a.role = p.role;
      a.teams.add(p.teamTag ?? p.teamName ?? "");
      a.kills += p.kills ?? 0;
      a.deaths += p.deaths ?? 0;
      a.assists += p.assists ?? 0;
      a.damage += p.damage ?? 0;
      a.headshots += p.headshots ?? 0;
      a.openingKills += p.openingKills ?? 0;
      a.entriesWon += p.entriesWon ?? 0;
      a.clutchesWon += p.clutchesWon ?? 0;
      a.clutchAttempts += p.clutchAttempts ?? 0;
      a.flashAssists += p.flashAssists ?? 0;
      a.roundsPlayed += p.roundsPlayed ?? 0;
      a.kastRounds += p.kastRounds ?? 0;
      a.survivedRounds += p.survivedRounds ?? 0;
      a.tradedRounds += p.tradedRounds ?? 0;
      a.bestRoundKills = Math.max(a.bestRoundKills, p.bestRoundKills ?? 0);
    }
  }

  return [...players.values()]
    .map((p) => ({
      key: p.key, id: p.id, nickname: p.nickname, role: p.role,
      teamLabel: p.teams.size === 1 ? [...p.teams][0] : "Multi",
      seriesPlayed: p.seriesPlayed,
      kills: p.kills, deaths: p.deaths, assists: p.assists, damage: p.damage,
      roundsPlayed: p.roundsPlayed, clutchesWon: p.clutchesWon, clutchAttempts: p.clutchAttempts,
      openingKills: p.openingKills, bestRoundKills: p.bestRoundKills,
      ...derivePlayerMetrics(p),
    }))
    .sort((a, b) => b.rating - a.rating || b.kills - a.kills);
}

// ---------------------------------------------------------------------------
// Aggregation: teams
// ---------------------------------------------------------------------------

export function aggregateTeamStats(entries: MatchHistoryEntry[]): AggregatedTeam[] {
  const teams = new Map<string, {
    id: string; name: string; tag: string;
    seriesPlayed: number; seriesWins: number; seriesLosses: number;
    mapsPlayed: number; mapsWon: number; mapsLost: number;
    roundsWon: number; roundsLost: number;
    ctRoundsWon: number; ctRoundsPlayed: number;
    tRoundsWon: number; tRoundsPlayed: number;
    tournaments: Set<string>;
  }>();

  for (const e of entries) {
    const r = e.data;
    if (!r) continue;
    const pairs = [
      { key: "teamA" as const, team: r.teamA, opp: r.teamB },
      { key: "teamB" as const, team: r.teamB, opp: r.teamA },
    ];
    for (const { key, team } of pairs) {
      const id = team?.id ?? team?.name ?? key;
      if (!teams.has(id)) {
        teams.set(id, {
          id, name: team?.name ?? "", tag: team?.tag ?? "",
          seriesPlayed: 0, seriesWins: 0, seriesLosses: 0,
          mapsPlayed: 0, mapsWon: 0, mapsLost: 0,
          roundsWon: 0, roundsLost: 0,
          ctRoundsWon: 0, ctRoundsPlayed: 0, tRoundsWon: 0, tRoundsPlayed: 0,
          tournaments: new Set(),
        });
      }
      const a = teams.get(id)!;
      a.seriesPlayed += 1;
      a.tournaments.add(e.tournamentName);
      if (r.winnerKey === key) a.seriesWins += 1;
      else a.seriesLosses += 1;

      for (const map of r.maps ?? []) {
        const otherKey = key === "teamA" ? "teamB" : "teamA";
        a.mapsPlayed += 1;
        a.roundsWon += map.score?.[key] ?? 0;
        a.roundsLost += map.score?.[otherKey] ?? 0;
        if (map.winnerKey === key) a.mapsWon += 1;
        else a.mapsLost += 1;
        for (const round of map.rounds ?? []) {
          // We don't track per-team side here directly; approximate via winnerSide
          // and which team is CT. For simplicity count CT/T rounds for the winner.
          if (round.winnerKey === key && round.winnerSide === "CT") {
            a.ctRoundsWon += 1;
            a.ctRoundsPlayed += 1;
          } else if (round.winnerKey === key && round.winnerSide === "T") {
            a.tRoundsWon += 1;
            a.tRoundsPlayed += 1;
          } else if (round.winnerKey !== key && round.winnerSide === "CT") {
            a.ctRoundsPlayed += 1;
          } else if (round.winnerKey !== key && round.winnerSide === "T") {
            a.tRoundsPlayed += 1;
          }
        }
      }
    }
  }

  return [...teams.values()]
    .map((t) => ({
      ...t,
      roundDiff: t.roundsWon - t.roundsLost,
      seriesWinRate: roundMetric((t.seriesWins / Math.max(1, t.seriesPlayed)) * 100, 1),
      mapWinRate: roundMetric((t.mapsWon / Math.max(1, t.mapsPlayed)) * 100, 1),
      ctWinRate: roundMetric((t.ctRoundsWon / Math.max(1, t.ctRoundsPlayed)) * 100, 1),
      tWinRate: roundMetric((t.tRoundsWon / Math.max(1, t.tRoundsPlayed)) * 100, 1),
      tournamentsCount: t.tournaments.size,
    }))
    .sort((a, b) => b.seriesWins - a.seriesWins || b.mapWinRate - a.mapWinRate);
}

// ---------------------------------------------------------------------------
// Aggregation: maps
// ---------------------------------------------------------------------------

export function aggregateMapStats(entries: MatchHistoryEntry[]): AggregatedMap[] {
  const maps = new Map<string, {
    mapName: string; played: number; totalRounds: number; overtimeCount: number;
    ctRoundsWon: number; tRoundsWon: number; teamWins: Map<string, number>;
  }>();

  for (const e of entries) {
    const r = e.data;
    if (!r) continue;
    for (const map of r.maps ?? []) {
      const key = map.mapName || "Unknown Map";
      if (!maps.has(key)) {
        maps.set(key, {
          mapName: key, played: 0, totalRounds: 0, overtimeCount: 0,
          ctRoundsWon: 0, tRoundsWon: 0, teamWins: new Map(),
        });
      }
      const a = maps.get(key)!;
      a.played += 1;
      a.totalRounds += (map.score?.teamA ?? 0) + (map.score?.teamB ?? 0);
      if ((map.halfBreakdown?.overtimes ?? []).length > 0) a.overtimeCount += 1;
      for (const round of map.rounds ?? []) {
        if (round.winnerSide === "CT") a.ctRoundsWon += 1;
        if (round.winnerSide === "T") a.tRoundsWon += 1;
      }
      const winnerName = map.winnerKey === "teamA" ? r.teamA?.name : r.teamB?.name;
      if (winnerName) a.teamWins.set(winnerName, (a.teamWins.get(winnerName) ?? 0) + 1);
    }
  }

  return [...maps.values()]
    .map((m) => {
      const topTeam = [...m.teamWins.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
      const roundTotal = m.ctRoundsWon + m.tRoundsWon;
      return {
        mapName: m.mapName, played: m.played, totalRounds: m.totalRounds,
        averageRounds: roundMetric(m.totalRounds / Math.max(1, m.played), 1),
        overtimeCount: m.overtimeCount,
        ctRoundsWon: m.ctRoundsWon, tRoundsWon: m.tRoundsWon,
        ctRoundWinRate: roundMetric((m.ctRoundsWon / Math.max(1, roundTotal)) * 100, 1),
        tRoundWinRate: roundMetric((m.tRoundsWon / Math.max(1, roundTotal)) * 100, 1),
        topTeam: topTeam?.[0] ?? "-", topTeamWins: topTeam?.[1] ?? 0,
      };
    })
    .sort((a, b) => b.played - a.played || b.averageRounds - a.averageRounds);
}

// ---------------------------------------------------------------------------
// Aggregation: tournaments
// ---------------------------------------------------------------------------

export function aggregateTournamentStats(entries: MatchHistoryEntry[]): AggregatedTournament[] {
  const tourns = new Map<string, {
    name: string; matches: number; maps: number; lanMatches: number; onlineMatches: number;
    participants: Set<string>; stages: Set<string>; latestDate: string;
    winnerCounts: Map<string, number>; mvpCounts: Map<string, number>;
  }>();

  for (const e of entries) {
    const r = e.data;
    if (!r) continue;
    const key = e.tournamentName || "Custom Event";
    if (!tourns.has(key)) {
      tourns.set(key, {
        name: key, matches: 0, maps: 0, lanMatches: 0, onlineMatches: 0,
        participants: new Set(), stages: new Set(), latestDate: e.matchDate,
        winnerCounts: new Map(), mvpCounts: new Map(),
      });
    }
    const a = tourns.get(key)!;
    a.matches += 1;
    a.maps += (r.maps ?? []).length;
    a.stages.add(e.stage);
    if (r.teamA?.name) a.participants.add(r.teamA.name);
    if (r.teamB?.name) a.participants.add(r.teamB.name);
    a.latestDate = a.latestDate > e.matchDate ? a.latestDate : e.matchDate;
    if (e.eventType === "LAN") a.lanMatches += 1;
    else a.onlineMatches += 1;
    const winnerName = r.winnerKey === "teamA" ? r.teamA?.name : r.teamB?.name;
    if (winnerName) a.winnerCounts.set(winnerName, (a.winnerCounts.get(winnerName) ?? 0) + 1);
    const mvpName = r.mvp?.nickname;
    if (mvpName) a.mvpCounts.set(mvpName, (a.mvpCounts.get(mvpName) ?? 0) + 1);
  }

  return [...tourns.values()]
    .map((t) => {
      const topTeam = [...t.winnerCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
      const topMvp = [...t.mvpCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
      return {
        name: t.name, matches: t.matches, maps: t.maps,
        lanMatches: t.lanMatches, onlineMatches: t.onlineMatches,
        participantsCount: [...t.participants].filter(Boolean).length,
        stagesLabel: [...t.stages].filter(Boolean).sort((a, b) => a.localeCompare(b)).join(", "),
        topTeam: topTeam?.[0] ?? "-", topTeamWins: topTeam?.[1] ?? 0,
        topMvp: topMvp?.[0] ?? "-", topMvpCount: topMvp?.[1] ?? 0,
        latestDate: t.latestDate,
      };
    })
    .sort((a, b) => b.latestDate.localeCompare(a.latestDate) || b.matches - a.matches);
}

// ---------------------------------------------------------------------------
// Full aggregated stats bundle
// ---------------------------------------------------------------------------

export function buildAggregatedStats(
  allEntries: MatchHistoryEntry[],
  filters: ArchiveFilters
): AggregatedStats {
  const included = filterArchiveEntries(allEntries, filters, { statsOnly: true });
  return {
    overview: buildArchiveOverview(allEntries, included),
    players: aggregatePlayerStats(included),
    teams: aggregateTeamStats(included),
    maps: aggregateMapStats(included),
    tournaments: aggregateTournamentStats(included),
  };
}
