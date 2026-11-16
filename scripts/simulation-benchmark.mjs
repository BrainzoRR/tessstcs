import { performance } from "node:perf_hooks";
import {
  MAP_POOL,
  ROLES,
  createMatchFromSetup,
  simulateEntireMatch,
  simulateRound,
  startMatch,
} from "../src/lib/simulation.js";

// Dependency-free current-engine measurement, not a claimed before/after result.
// Run: node scripts/simulation-benchmark.mjs --rounds 300 --matches 2 --seed bench
const args = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf(`--${name}`);
  return index < 0 ? fallback : args[index + 1];
}
function count(name, fallback, max) {
  const value = Number(option(name, fallback));
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new Error(`--${name} must be an integer from 1 to ${max}`);
  }
  return value;
}
const rounds = count("rounds", 300, 10000);
const matches = count("matches", 2, 30);
const seed = option("seed", "sim-benchmark-v1");
if (!seed || seed.startsWith("--")) throw new Error("--seed needs a value");

function team(id) {
  return {
    id, name: id, tag: id, region: "EU", preferredMaps: [...MAP_POOL],
    coach: { id: `${id}-coach`, nickname: "Coach", tacticalRating: 80, motivationRating: 80, mapKnowledge: 80, preferredMaps: [...MAP_POOL] },
    players: ROLES.map((role, index) => ({
      id: `${id}-${index}`, nickname: `${id}${index}`, role, isCaptain: index === 4,
      aim: 80, gameSense: 80, utility: 85, entry: 80, clutch: 80, consistency: 80,
    })),
  };
}
const a = team("AAA");
const b = team("BBB");
const base = createMatchFromSetup(a, b, { seed: `${seed}-inputs`, format: "BO1", matchDate: "2026-01-01" });
const inputs = [base.maps[0].teamAState, base.maps[0].teamBState];
for (const state of inputs) for (const player of state.players) player.money = 10000;
const roundContext = {
  roundNumber: 2, isOvertime: false, displayRound: "R2", halfLabel: "1H",
  timeoutCalled: null, roundType: { teamA: "full", teamB: "full" }, matchFormat: "BO1",
};
function simulate(index) {
  return simulateRound(...inputs, MAP_POOL[index % MAP_POOL.length], { score: { teamA: 0, teamB: 0 } }, {
    ...roundContext, seed: `${seed}-round-${index}`,
  });
}
for (let index = 0; index < 20; index += 1) simulate(index);
const heapBefore = process.memoryUsage().heapUsed;
const start = performance.now();
let kills = 0;
let damage = 0;
let plants = 0;
let defuses = 0;
let explosions = 0;
let checksum = 2166136261;
for (let index = 0; index < rounds; index += 1) {
  const { summary } = simulate(index);
  for (const player of [...summary.playerRoundStats.teamA, ...summary.playerRoundStats.teamB]) {
    kills += player.kills;
    damage += player.damage;
  }
  plants += Number(summary.bombPlanted);
  defuses += Number(summary.reason === "defuse");
  explosions += Number(summary.reason === "bomb exploded");
  const signature = `${summary.mapName}:${summary.winnerKey}:${summary.reason}:${summary.endedAt}`;
  for (let char = 0; char < signature.length; char += 1) checksum = Math.imul(checksum ^ signature.charCodeAt(char), 16777619) >>> 0;
}
const roundMs = performance.now() - start;
const matchStart = performance.now();
let totalMatchRounds = 0;
for (let index = 0; index < matches; index += 1) {
  const result = simulateEntireMatch(startMatch(createMatchFromSetup(a, b, {
    seed: `${seed}-match-${index}`, format: "BO1", matchDate: "2026-01-01",
  })));
  totalMatchRounds += result.maps.flatMap((map) => map.rounds).length;
}
const matchMs = performance.now() - matchStart;
console.log(JSON.stringify({
  engine: "current", seed, node: process.version,
  comparison: "Unavailable: the historical fixture is a marker-dependent reverse patch, not an archived original; no baseline comparison was run.",
  standaloneRounds: {
    count: rounds, elapsedMs: Number(roundMs.toFixed(2)),
    roundsPerSecond: Number((rounds * 1000 / roundMs).toFixed(2)),
    kills, actualHpDamage: damage, plants, defuses, explosions,
    checksum: checksum.toString(16),
  },
  fullMatches: { count: matches, rounds: totalMatchRounds, elapsedMs: Number(matchMs.toFixed(2)) },
  heapDeltaMiB: Number(((process.memoryUsage().heapUsed - heapBefore) / 1024 / 1024).toFixed(2)),
  limitations: "Heap delta includes GC noise; timings depend on Node/machine. Seeded outcome checksum is reproducible, performance is not.",
}, null, 2));
