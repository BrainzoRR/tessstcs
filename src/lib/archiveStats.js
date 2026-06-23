const DEFAULT_TOURNAMENT_NAME = "Custom Event";
const DEFAULT_STAGE = "Group Stage";
const DEFAULT_EVENT_TYPE = "Online";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundMetric(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeEventType(value) {
  return value === "LAN" ? "LAN" : DEFAULT_EVENT_TYPE;
}

function buildDefaultTournamentMeta(baseDate) {
  const fallbackDate = safeString(baseDate, new Date().toISOString().slice(0, 10)).slice(0, 10);
  return {
    name: DEFAULT_TOURNAMENT_NAME,
    stage: DEFAULT_STAGE,
    eventType: DEFAULT_EVENT_TYPE,
    matchDate: fallbackDate,
  };
}

function normalizeTournamentMeta(meta, baseDate) {
  const defaults = buildDefaultTournamentMeta(baseDate);
  return {
    name: safeString(meta?.name, defaults.name).trim() || defaults.name,
    stage: safeString(meta?.stage, defaults.stage).trim() || defaults.stage,
    eventType: normalizeEventType(meta?.eventType ?? defaults.eventType),
    matchDate: safeString(meta?.matchDate, defaults.matchDate).slice(0, 10) || defaults.matchDate,
  };
}

export function normalizeResultsDataShape(resultsData) {
  if (!resultsData || typeof resultsData !== "object") {
    return null;
  }

  const baseDate = safeString(resultsData.finishedAt, safeString(resultsData.createdAt, new Date().toISOString())).slice(0, 10);
  return {
    ...resultsData,
    maps: safeArray(resultsData.maps),
    players: safeArray(resultsData.players),
    highlights: safeArray(resultsData.highlights),
    tournament: normalizeTournamentMeta(resultsData.tournament, baseDate),
  };
}

export function getHistoryEntryTeamNames(entry) {
  const results = entry?.data;
  return [
    safeString(results?.teamA?.name),
    safeString(results?.teamB?.name),
    safeString(results?.teamA?.tag),
    safeString(results?.teamB?.tag),
  ].filter(Boolean);
}

export function getHistoryEntryMapNames(entry) {
  const maps = safeArray(entry?.data?.maps).map((map) => safeString(map.mapName)).filter(Boolean);
  if (maps.length) {
    return maps;
  }
  return safeString(entry?.mapsPlayed)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function normalizeHistoryEntry(entry) {
  if (!entry || typeof entry !== "object" || typeof entry.id !== "string") {
    return null;
  }

  const results = normalizeResultsDataShape(entry.data ?? null);
  const fallbackDateIso = safeString(entry.date, safeString(results?.finishedAt, safeString(results?.createdAt, new Date().toISOString())));
  const tournament = normalizeTournamentMeta(
    {
      name: entry.tournamentName ?? results?.tournament?.name,
      stage: entry.stage ?? results?.tournament?.stage,
      eventType: entry.eventType ?? results?.tournament?.eventType,
      matchDate: entry.matchDate ?? results?.tournament?.matchDate,
    },
    fallbackDateIso.slice(0, 10)
  );
  const teamsLabel = safeString(
    entry.teams,
    results?.teamA && results?.teamB ? `${results.teamA.name} vs ${results.teamB.name}` : "Stored Match"
  );
  const scoreLabel = safeString(
    entry.score,
    results?.seriesScore ? `${results.seriesScore.teamA}-${results.seriesScore.teamB}` : "0-0"
  );
  const mapsPlayed = safeString(entry.mapsPlayed, getHistoryEntryMapNames({ ...entry, data: results }).join(", "));

  return {
    ...entry,
    date: fallbackDateIso,
    teams: teamsLabel,
    score: scoreLabel,
    mvp: safeString(entry.mvp, safeString(results?.mvp?.nickname, "n/a")),
    mapsPlayed,
    tournamentName: tournament.name,
    stage: tournament.stage,
    eventType: tournament.eventType,
    matchDate: tournament.matchDate,
    includedInStats: entry.includedInStats !== false,
    data: results,
  };
}

export function sanitizeMatchHistoryEntries(entries) {
  return safeArray(entries)
    .map(normalizeHistoryEntry)
    .filter(Boolean)
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
}

export function createArchiveFilters() {
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

export function buildArchiveOptions(entries) {
  const normalizedEntries = sanitizeMatchHistoryEntries(entries);
  const teams = new Set();
  const tournaments = new Set();
  const stages = new Set();
  const maps = new Set();

  normalizedEntries.forEach((entry) => {
    getHistoryEntryTeamNames(entry).forEach((team) => teams.add(team));
    getHistoryEntryMapNames(entry).forEach((map) => maps.add(map));
    if (entry.tournamentName) {
      tournaments.add(entry.tournamentName);
    }
    if (entry.stage) {
      stages.add(entry.stage);
    }
  });

  const sortStrings = (values) => [...values].sort((left, right) => left.localeCompare(right));

  return {
    teams: sortStrings(teams),
    tournaments: sortStrings(tournaments),
    stages: sortStrings(stages),
    maps: sortStrings(maps),
    eventTypes: ["Online", "LAN"],
  };
}

function matchesDateRange(entry, filters) {
  if (filters.from && entry.matchDate < filters.from) {
    return false;
  }
  if (filters.to && entry.matchDate > filters.to) {
    return false;
  }
  return true;
}

function matchesSearch(entry, searchValue) {
  if (!searchValue) {
    return true;
  }

  const haystack = [
    entry.teams,
    entry.mvp,
    entry.tournamentName,
    entry.stage,
    entry.eventType,
    entry.mapsPlayed,
    ...getHistoryEntryTeamNames(entry),
    ...getHistoryEntryMapNames(entry),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(searchValue.toLowerCase());
}

export function filterArchiveEntries(entries, filters, options = {}) {
  const normalizedEntries = sanitizeMatchHistoryEntries(entries);
  const statsOnly = options.statsOnly === true;

  return normalizedEntries.filter((entry) => {
    if (!entry.data) {
      return false;
    }

    if (statsOnly && entry.includedInStats === false) {
      return false;
    }

    if (filters.status === "included" && entry.includedInStats === false) {
      return false;
    }

    if (filters.status === "excluded" && entry.includedInStats !== false) {
      return false;
    }

    if (!matchesSearch(entry, filters.search ?? "")) {
      return false;
    }

    if (filters.team !== "all" && !getHistoryEntryTeamNames(entry).includes(filters.team)) {
      return false;
    }

    if (filters.tournament !== "all" && entry.tournamentName !== filters.tournament) {
      return false;
    }

    if (filters.stage !== "all" && entry.stage !== filters.stage) {
      return false;
    }

    if (filters.eventType !== "all" && entry.eventType !== filters.eventType) {
      return false;
    }

    if (filters.map !== "all" && !getHistoryEntryMapNames(entry).includes(filters.map)) {
      return false;
    }

    return matchesDateRange(entry, filters);
  });
}

function derivePlayerMetrics(stats) {
  const roundsPlayed = Math.max(1, stats.roundsPlayed);
  const kills = stats.kills;
  const deaths = stats.deaths;
  const assists = stats.assists;
  const damage = stats.damage;
  const headshots = stats.headshots;
  const openingKills = stats.openingKills;
  const entriesWon = stats.entriesWon;
  const kastRounds = stats.kastRounds;
  const clutchesWon = stats.clutchesWon;
  const clutchAttempts = stats.clutchAttempts;
  const bestRoundKills = stats.bestRoundKills;
  const kpr = kills / roundsPlayed;
  const dpr = deaths / roundsPlayed;
  const adr = damage / roundsPlayed;
  const kast = kastRounds / roundsPlayed;
  const impact = (2 * kpr + 2.5 * (entriesWon / roundsPlayed) + openingKills / roundsPlayed) / 3;
  const rawRating =
    (kpr * 0.73 +
      (0.44 - dpr) * 0.54 +
      (adr / 100) * 0.38 +
      kast * 0.16 +
      impact * 0.1) *
    1.08;
  const sampleWeight = clamp((roundsPlayed - 1) / 8, 0.14, 1);
  const rating = clamp(1 + (rawRating - 1) * sampleWeight, 0.35, 2.08);

  return {
    kills,
    deaths,
    assists,
    roundsPlayed,
    clutchesWon,
    clutchAttempts,
    openingKills,
    bestRoundKills,
    kd: roundMetric(kills / Math.max(1, deaths), 2),
    adr: roundMetric(adr, 1),
    kastPercent: roundMetric(kast * 100, 0),
    hsPercent: roundMetric((headshots / Math.max(1, kills)) * 100, 0),
    impact: roundMetric(impact, 2),
    rating: roundMetric(rating, 2),
  };
}

export function aggregatePlayerStats(entries) {
  const players = new Map();

  filterArchiveEntries(entries, createArchiveFilters(), { statsOnly: true }).forEach((entry) => {
    safeArray(entry.data?.players).forEach((player) => {
      const key = `${safeString(player.id, player.nickname)}::${safeString(player.nickname, "player")}`;
      if (!players.has(key)) {
        players.set(key, {
          key,
          id: player.id,
          nickname: player.nickname,
          role: player.role,
          teams: new Set(),
          seriesPlayed: 0,
          kills: 0,
          deaths: 0,
          assists: 0,
          damage: 0,
          headshots: 0,
          openingKills: 0,
          entriesWon: 0,
          clutchesWon: 0,
          clutchAttempts: 0,
          flashAssists: 0,
          roundsPlayed: 0,
          kastRounds: 0,
          survivedRounds: 0,
          tradedRounds: 0,
          bestRoundKills: 0,
        });
      }

      const aggregate = players.get(key);
      aggregate.seriesPlayed += 1;
      aggregate.role = player.role;
      aggregate.teams.add(player.teamTag ?? player.teamName ?? "");
      aggregate.kills += player.kills ?? 0;
      aggregate.deaths += player.deaths ?? 0;
      aggregate.assists += player.assists ?? 0;
      aggregate.damage += player.damage ?? 0;
      aggregate.headshots += player.headshots ?? 0;
      aggregate.openingKills += player.openingKills ?? 0;
      aggregate.entriesWon += player.entriesWon ?? 0;
      aggregate.clutchesWon += player.clutchesWon ?? 0;
      aggregate.clutchAttempts += player.clutchAttempts ?? 0;
      aggregate.flashAssists += player.flashAssists ?? 0;
      aggregate.roundsPlayed += player.roundsPlayed ?? 0;
      aggregate.kastRounds += player.kastRounds ?? 0;
      aggregate.survivedRounds += player.survivedRounds ?? 0;
      aggregate.tradedRounds += player.tradedRounds ?? 0;
      aggregate.bestRoundKills = Math.max(aggregate.bestRoundKills, player.bestRoundKills ?? 0);
    });
  });

  return [...players.values()]
    .map((player) => ({
      ...player,
      teamLabel: player.teams.size === 1 ? [...player.teams][0] : "Multi",
      ...derivePlayerMetrics(player),
    }))
    .sort((left, right) => right.rating - left.rating || right.kills - left.kills);
}

export function aggregateTeamStats(entries) {
  const teams = new Map();

  filterArchiveEntries(entries, createArchiveFilters(), { statsOnly: true }).forEach((entry) => {
    const results = entry.data;
    const teamPairs = [
      { key: "teamA", team: results.teamA, opponent: results.teamB },
      { key: "teamB", team: results.teamB, opponent: results.teamA },
    ];

    teamPairs.forEach(({ key, team, opponent }) => {
      const id = safeString(team?.id, safeString(team?.name, key));
      if (!teams.has(id)) {
        teams.set(id, {
          id,
          name: team.name,
          tag: team.tag,
          seriesPlayed: 0,
          seriesWins: 0,
          seriesLosses: 0,
          mapsPlayed: 0,
          mapsWon: 0,
          mapsLost: 0,
          roundsWon: 0,
          roundsLost: 0,
          ctRoundsWon: 0,
          ctRoundsPlayed: 0,
          tRoundsWon: 0,
          tRoundsPlayed: 0,
          pistolWins: 0,
          ecoWins: 0,
          forceWins: 0,
          fullWins: 0,
          antiEcoWins: 0,
          tournaments: new Set(),
        });
      }

      const aggregate = teams.get(id);
      aggregate.seriesPlayed += 1;
      aggregate.tournaments.add(entry.tournamentName);
      if (results.winnerKey === key) {
        aggregate.seriesWins += 1;
      } else {
        aggregate.seriesLosses += 1;
      }

      safeArray(results.maps).forEach((map) => {
        const otherKey = key === "teamA" ? "teamB" : "teamA";
        aggregate.mapsPlayed += 1;
        aggregate.roundsWon += map.score?.[key] ?? 0;
        aggregate.roundsLost += map.score?.[otherKey] ?? 0;
        if (map.winnerKey === key) {
          aggregate.mapsWon += 1;
        } else {
          aggregate.mapsLost += 1;
        }

        const roundTypeWins = map.roundTypeWins?.[key] ?? {};
        aggregate.pistolWins += roundTypeWins.pistol ?? 0;
        aggregate.ecoWins += roundTypeWins.eco ?? 0;
        aggregate.forceWins += roundTypeWins.force ?? 0;
        aggregate.fullWins += roundTypeWins.full ?? 0;
        aggregate.antiEcoWins += roundTypeWins.antiEco ?? 0;

        safeArray(map.rounds).forEach((round) => {
          const side = round.sides?.[key];
          if (side === "CT") {
            aggregate.ctRoundsPlayed += 1;
          }
          if (side === "T") {
            aggregate.tRoundsPlayed += 1;
          }
          if (round.winnerKey === key && round.winnerSide === "CT") {
            aggregate.ctRoundsWon += 1;
          }
          if (round.winnerKey === key && round.winnerSide === "T") {
            aggregate.tRoundsWon += 1;
          }
        });
      });
    });
  });

  return [...teams.values()]
    .map((team) => ({
      ...team,
      roundDiff: team.roundsWon - team.roundsLost,
      seriesWinRate: roundMetric((team.seriesWins / Math.max(1, team.seriesPlayed)) * 100, 1),
      mapWinRate: roundMetric((team.mapsWon / Math.max(1, team.mapsPlayed)) * 100, 1),
      ctWinRate: roundMetric((team.ctRoundsWon / Math.max(1, team.ctRoundsPlayed)) * 100, 1),
      tWinRate: roundMetric((team.tRoundsWon / Math.max(1, team.tRoundsPlayed)) * 100, 1),
      tournamentsCount: team.tournaments.size,
    }))
    .sort((left, right) => right.seriesWins - left.seriesWins || right.mapWinRate - left.mapWinRate);
}

export function aggregateMapStats(entries) {
  const maps = new Map();

  filterArchiveEntries(entries, createArchiveFilters(), { statsOnly: true }).forEach((entry) => {
    const results = entry.data;
    safeArray(results.maps).forEach((map) => {
      const key = safeString(map.mapName, "Unknown Map");
      if (!maps.has(key)) {
        maps.set(key, {
          mapName: key,
          played: 0,
          totalRounds: 0,
          overtimeCount: 0,
          ctRoundsWon: 0,
          tRoundsWon: 0,
          teamWins: new Map(),
        });
      }

      const aggregate = maps.get(key);
      aggregate.played += 1;
      aggregate.totalRounds += (map.score?.teamA ?? 0) + (map.score?.teamB ?? 0);
      aggregate.overtimeCount += safeArray(map.halfBreakdown?.overtimes).length > 0 ? 1 : 0;
      safeArray(map.rounds).forEach((round) => {
        if (round.winnerSide === "CT") {
          aggregate.ctRoundsWon += 1;
        }
        if (round.winnerSide === "T") {
          aggregate.tRoundsWon += 1;
        }
      });

      const winnerName = map.winnerKey === "teamA" ? results.teamA?.name : results.teamB?.name;
      if (winnerName) {
        aggregate.teamWins.set(winnerName, (aggregate.teamWins.get(winnerName) ?? 0) + 1);
      }
    });
  });

  return [...maps.values()]
    .map((map) => {
      const topTeam = [...map.teamWins.entries()].sort((left, right) => right[1] - left[1])[0] ?? null;
      const roundTotal = map.ctRoundsWon + map.tRoundsWon;
      return {
        ...map,
        averageRounds: roundMetric(map.totalRounds / Math.max(1, map.played), 1),
        ctRoundWinRate: roundMetric((map.ctRoundsWon / Math.max(1, roundTotal)) * 100, 1),
        tRoundWinRate: roundMetric((map.tRoundsWon / Math.max(1, roundTotal)) * 100, 1),
        topTeam: topTeam?.[0] ?? "-",
        topTeamWins: topTeam?.[1] ?? 0,
      };
    })
    .sort((left, right) => right.played - left.played || right.averageRounds - left.averageRounds);
}

export function aggregateTournamentStats(entries) {
  const tournaments = new Map();

  filterArchiveEntries(entries, createArchiveFilters(), { statsOnly: true }).forEach((entry) => {
    const results = entry.data;
    const key = entry.tournamentName || DEFAULT_TOURNAMENT_NAME;
    if (!tournaments.has(key)) {
      tournaments.set(key, {
        name: key,
        matches: 0,
        maps: 0,
        lanMatches: 0,
        onlineMatches: 0,
        participants: new Set(),
        stages: new Set(),
        latestDate: entry.matchDate,
        // Track the tournament's Final match so we can derive the real
        // tournament winner + tournament MVP (MVP of the Final), the way
        // real CS2 events award them. Falls back to "-" when no Final has
        // been played in the archive for this tournament.
        finalEntry: null,
      });
    }

    const aggregate = tournaments.get(key);
    aggregate.matches += 1;
    aggregate.maps += safeArray(results.maps).length;
    aggregate.stages.add(entry.stage);
    aggregate.participants.add(results.teamA?.name);
    aggregate.participants.add(results.teamB?.name);
    aggregate.latestDate = aggregate.latestDate > entry.matchDate ? aggregate.latestDate : entry.matchDate;
    if (entry.eventType === "LAN") {
      aggregate.lanMatches += 1;
    } else {
      aggregate.onlineMatches += 1;
    }

    // Keep the most recent Final match for this tournament.
    if (safeString(entry.stage).toLowerCase() === "final") {
      if (
        !aggregate.finalEntry ||
        new Date(entry.matchDate) > new Date(aggregate.finalEntry.matchDate)
      ) {
        aggregate.finalEntry = entry;
      }
    }
  });

  return [...tournaments.values()]
    .map((tournament) => {
      const final = tournament.finalEntry;
      let topTeam = "-";
      let topMvp = "-";
      let topMvpRating = null;
      if (final && final.data) {
        const winnerKey = final.data.winnerKey;
        topTeam = winnerKey === "teamA" ? final.data.teamA?.name : final.data.teamB?.name;
        if (final.data.mvp) {
          topMvp = final.data.mvp.nickname ?? "-";
          topMvpRating = final.data.mvp.rating ?? null;
        }
      }
      return {
        name: tournament.name,
        matches: tournament.matches,
        maps: tournament.maps,
        lanMatches: tournament.lanMatches,
        onlineMatches: tournament.onlineMatches,
        participantsCount: [...tournament.participants].filter(Boolean).length,
        stagesLabel: [...tournament.stages].filter(Boolean).sort((left, right) => left.localeCompare(right)).join(", "),
        latestDate: tournament.latestDate,
        topTeam: topTeam || "-",
        topTeamWins: final ? 1 : 0,
        topMvp: topMvp || "-",
        topMvpCount: topMvp !== "-" ? 1 : 0,
        topMvpRating,
        hasFinal: Boolean(final),
      };
    })
    .sort((left, right) => right.latestDate.localeCompare(left.latestDate) || right.matches - left.matches);
}

export function buildArchiveOverview(entries) {
  const includedEntries = filterArchiveEntries(entries, createArchiveFilters(), { statsOnly: true });
  const allEntries = sanitizeMatchHistoryEntries(entries);
  const totalMaps = includedEntries.reduce((sum, entry) => sum + safeArray(entry.data?.maps).length, 0);
  const totalTournaments = new Set(includedEntries.map((entry) => entry.tournamentName).filter(Boolean)).size;
  const lanMatches = includedEntries.filter((entry) => entry.eventType === "LAN").length;
  const onlineMatches = includedEntries.filter((entry) => entry.eventType === "Online").length;

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