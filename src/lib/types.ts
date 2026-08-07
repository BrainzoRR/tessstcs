// Shared TypeScript types for the CS2 match stats archive.
// Safe to import from both server and client code.

export const MAP_POOL = [
  "Mirage",
  "Overpass",
  "Anubis",
  "Inferno",
  "Nuke",
  "Dust2",
  "Ancient",
] as const;

export type MapName = (typeof MAP_POOL)[number];

export const REGIONS = ["EU", "NA", "CIS", "APAC", "BR", "MENA"] as const;
export type Region = (typeof REGIONS)[number];

export const ROLES = [
  "Entry Fragger",
  "AWPer",
  "Lurker",
  "Support",
  "IGL",
] as const;
export type Role = (typeof ROLES)[number];

export const MATCH_FORMATS = ["BO1", "BO3", "BO5"] as const;
export type MatchFormat = (typeof MATCH_FORMATS)[number];

export const EVENT_TYPES = ["Online", "LAN"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const TOURNAMENT_STAGES = [
  "Group Stage",
  "Swiss Stage",
  "Play-In",
  "Quarterfinal",
  "Semifinal",
  "Final",
  "Showmatch",
] as const;
export type TournamentStage = (typeof TOURNAMENT_STAGES)[number];

export interface PlayerAttrs {
  aim: number;
  gameSense: number;
  clutch: number;
  utility: number;
  entry: number;
  consistency: number;
}

export interface SeedPlayer {
  id: string;
  nickname: string;
  role: Role;
  nationality: string;
  age: number;
  isCaptain: boolean;
  attrs: PlayerAttrs;
}

export interface SeedCoach {
  nickname: string;
  tacticalRating: number;
  motivationRating: number;
  mapKnowledge: number;
}

export interface SeedTeam {
  id: string;
  name: string;
  tag: string;
  logo: string;
  region: Region;
  coach: SeedCoach;
  preferredMaps: MapName[];
  players: SeedPlayer[];
}

/** Per-player statistics accumulated across all maps of a series. */
export interface PlayerMatchStats {
  id: string;
  teamKey: "teamA" | "teamB";
  teamId: string;
  teamName: string;
  teamTag: string;
  nickname: string;
  role: string;
  kills: number;
  deaths: number;
  assists: number;
  damage: number;
  headshots: number;
  openingKills: number;
  entriesWon: number;
  clutchesWon: number;
  clutchAttempts: number;
  flashAssists: number;
  roundsPlayed: number;
  kastRounds: number;
  survivedRounds: number;
  tradedRounds: number;
  bestRoundKills: number;
  // derived
  kd: number;
  adr: number;
  kastPercent: number;
  hsPercent: number;
  impact: number;
  rating: number;
}

export interface MapResult {
  mapName: string;
  pickedBy: "teamA" | "teamB" | "decider";
  winnerKey: "teamA" | "teamB";
  score: { teamA: number; teamB: number };
  halfBreakdown: {
    firstHalfA: number;
    firstHalfB: number;
    secondHalfA: number;
    secondHalfB: number;
    overtimes: { a: number; b: number }[];
  };
  roundTypeWins: {
    teamA: { pistol: number; eco: number; force: number; full: number; antiEco: number };
    teamB: { pistol: number; eco: number; force: number; full: number; antiEco: number };
  };
  rounds: RoundRecord[];
}

export interface RoundRecord {
  roundIndex: number;
  winnerKey: "teamA" | "teamB";
  winnerSide: "CT" | "T";
  roundType: "pistol" | "eco" | "force" | "full" | "antiEco";
}

export interface MatchResults {
  id: string;
  createdAt: string;
  finishedAt: string;
  format: MatchFormat;
  tournament: {
    name: string;
    stage: string;
    eventType: EventType;
    matchDate: string;
  };
  teamA: { id: string; name: string; tag: string; logo: string };
  teamB: { id: string; name: string; tag: string; logo: string };
  seriesScore: { teamA: number; teamB: number };
  winnerKey: "teamA" | "teamB";
  maps: MapResult[];
  players: PlayerMatchStats[];
  mvp: PlayerMatchStats | null;
  highlights: string[];
}

export interface MatchHistoryEntry {
  id: string;
  date: string;
  teams: string;
  score: string;
  mvp: string;
  mapsPlayed: string;
  tournamentName: string;
  stage: string;
  eventType: EventType;
  matchDate: string;
  includedInStats: boolean;
  data: MatchResults;
}

export interface ArchiveFilters {
  search: string;
  team: string;
  tournament: string;
  stage: string;
  eventType: string;
  map: string;
  from: string;
  to: string;
  status: string; // "all" | "included" | "excluded"
}

export interface ArchiveOptions {
  teams: string[];
  tournaments: string[];
  stages: string[];
  maps: string[];
  eventTypes: string[];
}

export interface ArchiveOverview {
  totalMatches: number;
  includedMatches: number;
  excludedMatches: number;
  totalMaps: number;
  totalTournaments: number;
  lanMatches: number;
  onlineMatches: number;
}

export interface AggregatedPlayer {
  key: string;
  id: string;
  nickname: string;
  role: string;
  teamLabel: string;
  seriesPlayed: number;
  kills: number;
  deaths: number;
  assists: number;
  damage: number;
  roundsPlayed: number;
  clutchesWon: number;
  clutchAttempts: number;
  openingKills: number;
  bestRoundKills: number;
  kd: number;
  adr: number;
  kastPercent: number;
  hsPercent: number;
  impact: number;
  rating: number;
}

export interface AggregatedTeam {
  id: string;
  name: string;
  tag: string;
  seriesPlayed: number;
  seriesWins: number;
  seriesLosses: number;
  mapsPlayed: number;
  mapsWon: number;
  mapsLost: number;
  roundsWon: number;
  roundsLost: number;
  roundDiff: number;
  ctRoundsWon: number;
  ctRoundsPlayed: number;
  tRoundsWon: number;
  tRoundsPlayed: number;
  seriesWinRate: number;
  mapWinRate: number;
  ctWinRate: number;
  tWinRate: number;
  tournamentsCount: number;
}

export interface AggregatedMap {
  mapName: string;
  played: number;
  totalRounds: number;
  averageRounds: number;
  overtimeCount: number;
  ctRoundsWon: number;
  tRoundsWon: number;
  ctRoundWinRate: number;
  tRoundWinRate: number;
  topTeam: string;
  topTeamWins: number;
}

export interface AggregatedTournament {
  name: string;
  matches: number;
  maps: number;
  lanMatches: number;
  onlineMatches: number;
  participantsCount: number;
  stagesLabel: string;
  topTeam: string;
  topTeamWins: number;
  topMvp: string;
  topMvpCount: number;
  latestDate: string;
}

export interface AggregatedStats {
  overview: ArchiveOverview;
  players: AggregatedPlayer[];
  teams: AggregatedTeam[];
  maps: AggregatedMap[];
  tournaments: AggregatedTournament[];
}

export interface SimulateRequest {
  teamAId: string;
  teamBId: string;
  format: MatchFormat;
  tournamentName: string;
  stage: string;
  eventType: EventType;
  matchDate: string;
}
