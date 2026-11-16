import test from "node:test";
import assert from "node:assert/strict";
import {
  MAP_POOL,
  MAP_ZONES,
  ROLES,
  createMatchFromSetup,
  simulateEntireMatch,
  simulateRound,
  startMatch,
  stepMatch,
  uid,
} from "../src/lib/simulation.js";
import {
  createRandomState,
  hasRandomState,
  random,
  withRandomState,
} from "../src/lib/simulationRandom.js";

// Independent, explicit inputs; do not reconstruct source from baseline markers.
function team(id, overrides = {}) {
  return {
    id,
    name: id,
    tag: id,
    region: "EU",
    preferredMaps: [...MAP_POOL],
    coach: {
      id: `${id}-coach`, name: "Coach", nickname: "Coach",
      tacticalRating: 75, motivationRating: 75, mapKnowledge: 75,
      preferredMaps: [...MAP_POOL],
    },
    players: Array.from({ length: 5 }, (_, index) => ({
      id: `${id}-${index}`, name: `Player ${index}`, nickname: `${id}${index}`,
      role: ROLES[index], isCaptain: index === 4,
      aim: 75, gameSense: 75, utility: 90, entry: 75, clutch: 75,
      consistency: 80, ...overrides,
    })),
  };
}

function setup(seed = "test", overrides = {}) {
  return createMatchFromSetup(team("AAA"), team("BBB"), {
    seed, format: "BO1", matchDate: "2026-01-01", ...overrides,
  });
}

function roundInputs(overrides = {}) {
  const map = setup("round-inputs").maps[0];
  const a = structuredClone(map.teamAState);
  const b = structuredClone(map.teamBState);
  a.side = "T";
  b.side = "CT";
  for (const state of [a, b]) {
    for (const player of state.players) {
      player.money = 16000;
      Object.assign(player, overrides);
    }
  }
  return [a, b];
}

function runRound(seed, inputs = roundInputs(), mapName = "Mirage", context = {}) {
  return simulateRound(...inputs, mapName, { score: { teamA: 0, teamB: 0 } }, {
    seed, roundNumber: 2, isOvertime: false, displayRound: "R2", halfLabel: "1H",
    timeoutCalled: null, roundType: { teamA: "full", teamB: "full" },
    matchFormat: "BO3", ...context,
  });
}

function withoutWallClock(match) {
  const copy = structuredClone(match);
  delete copy.createdAt;
  if (copy.results) {
    delete copy.results.createdAt;
    delete copy.results.finishedAt;
  }
  return copy;
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

test("serialized scoped RNG resumes, nests, and restores after exceptions", () => {
  const state = createRandomState("serialized");
  const ambient = Math.random;
  withRandomState(state, () => random());
  const resumed = JSON.parse(JSON.stringify(state));
  assert.equal(withRandomState(state, random), withRandomState(resumed, random));
  const expected = structuredClone(state);
  withRandomState(state, () => {
    assert.equal(hasRandomState(), true);
    assert.throws(() => withRandomState(createRandomState("nested"), () => {
      random();
      throw new Error("scope test");
    }), /scope test/);
    assert.equal(random(), withRandomState(expected, random));
  });
  assert.equal(hasRandomState(), false);
  assert.equal(Math.random, ambient);
  assert.equal(state.draws, 3);
});

test("seeded setup and IDs do not depend on ambient random or UID calls", () => {
  const ambient = Math.random;
  let first;
  let second;
  try {
    Math.random = () => { throw new Error("ambient RNG was used"); };
    first = setup("repeatable");
    uid("unrelated");
    second = setup("repeatable");
  } finally {
    Math.random = ambient;
  }
  assert.deepEqual(withoutWallClock(first), withoutWallClock(second));
  assert.notDeepEqual(first.rng, setup("different").rng);
});

test("interleaved matches and JSON resume preserve the entire deterministic state", () => {
  const original = startMatch(setup("interleave"));
  const serializedInput = JSON.stringify(original);
  let standalone = original;
  for (let index = 0; index < 5; index += 1) standalone = stepMatch(standalone);
  let interleaved = JSON.parse(serializedInput);
  let other = startMatch(setup("other-stream"));
  for (let index = 0; index < 5; index += 1) {
    other = stepMatch(other);
    interleaved = stepMatch(JSON.parse(JSON.stringify(interleaved)));
  }
  assert.deepEqual(interleaved, standalone);
  assert.equal(JSON.stringify(original), serializedInput, "stepMatch mutated its input");
});

test("instant simulation equals repeated stepping and respects a finite step budget", () => {
  const input = startMatch(setup("instant"));
  let stepped = input;
  let budget = 200;
  while (stepped.status === "live" && budget-- > 0) stepped = stepMatch(stepped);
  assert.equal(stepped.status, "finished");
  assert.deepEqual(withoutWallClock(simulateEntireMatch(input)), withoutWallClock(stepped));
  assert.throws(() => simulateEntireMatch(input, { maxSteps: 1 }), (error) => {
    assert.equal(error.code, "SIMULATION_STEP_LIMIT");
    assert.equal(error.partialMatch.maps[0].rounds.length, 1);
    return true;
  });
  assert.equal(input.maps[0].rounds.length, 0);
});

test("MR12 halftime and MR3 overtime retain their side/reset transitions", () => {
  let match = startMatch(setup("transitions"));
  let map = match.maps[0];
  const initialSide = map.teamAState.side;
  map.roundNumber = 12;
  map.score = { teamA: 5, teamB: 6 };
  match = stepMatch(match);
  assert.equal(match.maps[0].nextReset, "halftime");
  match = stepMatch(match);
  map = match.maps[0];
  assert.notEqual(map.teamAState.side, initialSide);
  assert.equal(map.rounds.at(-1).halfLabel, "2H");
  assert.deepEqual(map.rounds.at(-1).roundType, { teamA: "pistol", teamB: "pistol" });

  // A serialized, valid 12:12 start of overtime (prior log history omitted).
  map.score = { teamA: 12, teamB: 12 };
  map.roundNumber = 25;
  map.nextReset = "ot-start";
  match = stepMatch(match);
  map = match.maps[0];
  assert.equal(map.overtimeNumber, 1);
  assert.equal(map.rounds.at(-1).displayRound, "OT1-R1");
  assert.equal(map.teamAState.side, map.initialSides.teamA);
  assert.ok(map.rounds.at(-1).economy.teamAEquipmentValue > 10000);

  map.score = { teamA: 13, teamB: 13 };
  map.roundNumber = 27;
  map.upcomingOtRound = 3;
  match = stepMatch(match);
  assert.equal(match.maps[0].nextReset, "ot-swap");
  match = stepMatch(match);
  map = match.maps[0];
  assert.equal(map.rounds.at(-1).displayRound, "OT1-R4");
  assert.notEqual(map.teamAState.side, map.initialSides.teamA);

  map.score = { teamA: 15, teamB: 15 };
  map.roundNumber = 31;
  map.nextReset = "ot-start";
  match = stepMatch(match);
  assert.equal(match.maps[0].overtimeNumber, 2);
  assert.equal(match.maps[0].rounds.at(-1).displayRound, "OT2-R1");
  assert.notEqual(match.maps[0].teamAState.side, map.initialSides.teamA);
});

test("completed maps use 13-round regulation or four-of-six overtime targets", () => {
  for (const format of ["BO1", "BO3", "BO5"]) {
    const result = simulateEntireMatch(startMatch(setup(`complete-${format}`, { format })));
    assert.equal(Math.max(...Object.values(result.seriesScore)), { BO1: 1, BO3: 2, BO5: 3 }[format]);
    for (const map of result.maps.filter((item) => item.finished)) {
      const scores = Object.values(map.score).sort((a, b) => b - a);
      assert.equal(scores[0], map.overtimeNumber ? 13 + map.overtimeNumber * 3 : 13);
      if (map.overtimeNumber) assert.ok(scores[0] - scores[1] >= 2);
      else assert.ok(map.rounds.length <= 24);
    }
  }
});

test("damage statistics equal actual opponent HP removed, never nominal overkill", () => {
  const inputs = roundInputs();
  const original = structuredClone(inputs);
  for (let index = 0; index < 80; index += 1) {
    const result = runRound(`hp-${index}`, inputs, MAP_POOL[index % MAP_POOL.length]);
    for (const [own, enemy] of [["teamA", "teamB"], ["teamB", "teamA"]]) {
      const stats = result.summary.playerRoundStats[own];
      const hpLost = 500 - sum(result[`${enemy}State`].players.map((player) => player.hp));
      assert.equal(sum(stats.map((player) => player.damage)), hpLost, `HP mismatch: ${index}/${own}`);
      for (const player of result[`${own}State`].players) {
        assert.equal(player.alive, player.hp > 0);
        assert.ok(player.hp >= 0 && player.hp <= 100);
      }
    }
  }
  assert.deepEqual(inputs, original, "simulateRound mutated its inputs");
});

test("flash assists belong only to the killing side and grenade capacity is four", () => {
  const inputs = roundInputs({ role: "Support", utility: 100, gameSense: 95 });
  let credited = 0;
  let losingFlash = 0;
  for (let index = 0; index < 100; index += 1) {
    const result = runRound(`flash-${index}`, inputs);
    const { timeline, startLoadouts } = result.summary;
    const players = [...result.teamAState.players, ...result.teamBState.players];
    const expected = Object.fromEntries(players.map((player) => [player.id, 0]));
    const flashThrows = {};
    let latestFlash = null;
    for (const event of timeline) {
      if (event.kind === "flash") {
        latestFlash = event;
        flashThrows[event.actorId] = (flashThrows[event.actorId] ?? 0) + 1;
      }
      if (event.kind !== "kill") continue;
      if (event.flashAssistId) {
        assert.ok(result[`${event.killerTeamKey}State`].players.some((player) => player.id === event.flashAssistId));
        expected[event.flashAssistId] += 1;
        credited += 1;
      }
      if (latestFlash?.victimId === event.killerId) {
        assert.equal(event.flashAssistId ?? null, null, "losing flasher received kill credit");
        losingFlash += 1;
      }
      latestFlash = null;
    }
    for (const player of players) {
      assert.equal(player.stats.flashAssists, expected[player.id]);
      assert.ok((flashThrows[player.id] ?? 0) <= 2, "more than two flashes carried");
    }
    for (const loadout of [...startLoadouts.teamA, ...startLoadouts.teamB]) {
      assert.equal(loadout.utilityCount, 4, "rich Support must carry exactly four grenades");
    }
  }
  assert.ok(credited > 0, "did not exercise winning flash support");
  assert.ok(losingFlash > 0, "did not exercise a losing flash-supported duel");
});

test("plant-relative bomb deadlines, real defuse durations, and terminal outcomes agree", () => {
  const seen = new Set();
  for (const kit of [false, true]) {
    const inputs = roundInputs({
      role: kit ? "Support" : "Entry Fragger", gameSense: kit ? 95 : 70,
      utility: kit ? 100 : 0,
    });
    // A stronger retaking side exercises both kit/no-kit completions instead
    // of relying on a very rare fast clean sweep between equal teams.
    inputs[0].players.forEach((player) => { player.aim = 40; player.entry = 40; });
    inputs[1].players.forEach((player) => { player.aim = 100; player.entry = 100; });
    for (let index = 0; index < 180; index += 1) {
      const result = runRound(`bomb-${kit}-${index}`, inputs);
      const { summary } = result;
      const tKey = summary.sides.teamA === "T" ? "teamA" : "teamB";
      const ctKey = tKey === "teamA" ? "teamB" : "teamA";
      const aliveT = result[`${tKey}State`].players.filter((player) => player.alive).length;
      const aliveCT = result[`${ctKey}State`].players.filter((player) => player.alive).length;
      const plant = summary.timeline.find((event) => event.bombPlanted);
      const defuse = summary.timeline.find((event) => event.defuse);
      const explosion = summary.timeline.find((event) => event.bombExploded);
      assert.equal(summary.bombPlanted, Boolean(plant));
      assert.ok(summary.timeline.every((event) => event.elapsed <= summary.endedAt));
      if (plant) {
        assert.equal(summary.plantedAt, plant.elapsed);
        assert.equal(summary.detonationAt, plant.elapsed + 40);
        assert.ok(summary.endedAt <= summary.detonationAt);
      }
      if (summary.reason === "elimination") {
        assert.equal(result[`${summary.loserKey}State`].players.filter((player) => player.alive).length, 0);
        assert.equal(Boolean(explosion), false, "elimination cannot invent an explosion");
      } else if (summary.reason === "time") {
        assert.equal(summary.winnerKey, ctKey);
        assert.equal(summary.endedAt, 115);
        assert.equal(plant, undefined);
        assert.ok(aliveT > 0 && aliveCT > 0);
        seen.add("time");
      } else if (summary.reason === "defuse") {
        const start = summary.timeline.find((event) => event.defuseStarted);
        assert.ok(plant && start && defuse && aliveCT > 0);
        assert.equal(summary.winnerKey, ctKey);
        assert.equal(defuse.elapsed - start.elapsed, kit ? 5 : 10);
        assert.equal(defuse.defuseDuration, kit ? 5 : 10);
        assert.ok(defuse.elapsed < plant.elapsed + 40);
        assert.equal(explosion, undefined);
        seen.add(kit ? "kit" : "no-kit");
      } else if (summary.reason === "bomb exploded") {
        assert.ok(plant && explosion);
        assert.equal(explosion.elapsed, plant.elapsed + 40);
        assert.equal(summary.winnerKey, tKey);
        assert.equal(defuse, undefined);
        seen.add("explosion");
      } else assert.fail(`unknown round reason ${summary.reason}`);
    }
  }
  for (const branch of ["time", "kit", "no-kit", "explosion"]) assert.ok(seen.has(branch), `uncovered branch ${branch}`);
});

// Independently specified Mirage route/time expectations. A zone being on the
// map is insufficient: it must belong to the victim side in this phase.
const mirageRoutes = {
  A: { entry: ["A ramp", "palace"], hold: ["ticket", "jungle"], support: ["connector", "top mid"], retake: ["ticket", "jungle", "connector"], postPlant: ["A ramp", "palace", "jungle"] },
  B: { entry: ["apartments", "bench"], hold: ["market", "van"], support: ["catwalk", "window"], retake: ["market", "van", "catwalk"], postPlant: ["apartments", "bench", "van"] },
  Mid: { entry: ["top mid"], hold: ["window", "connector", "catwalk"], support: ["top mid"] },
};
const mirageWindows = {
  apartments: [12, 42], bench: [40, 115], market: [46, 115], van: [45, 115],
  "top mid": [12, 36], window: [14, 44], connector: [18, 70], catwalk: [18, 60],
  "a ramp": [18, 55], palace: [24, 60], ticket: [42, 115], jungle: [38, 115],
};
function mirageVictimPool(site, phase, side) {
  const target = mirageRoutes[site];
  const mid = mirageRoutes.Mid;
  if (phase === "lurk") return side === "CT"
    ? ["window", "connector", "apartments", ...mid.hold] : [...mid.entry, ...mid.support];
  if (site === "Mid") return side === "CT" ? [...mid.hold, ...mid.support] : [...mid.entry, ...mid.support.slice(0, 1)];
  if (phase === "early") return side === "CT"
    ? [...mid.hold.slice(0, 1), ...target.hold.slice(0, 1), ...target.support.slice(0, 1)] : [...mid.entry, ...target.entry.slice(0, 1)];
  if (phase === "utility") return side === "CT"
    ? [...target.hold.slice(0, 1), ...target.support] : [...target.entry, ...mid.entry.slice(0, 1)];
  if (phase === "retake") return side === "CT" ? target.retake : target.postPlant;
  assert.equal(phase, "site");
  return side === "CT" ? [...target.hold, ...target.support] : [...target.entry, ...target.support.slice(0, 1)];
}

test("kill routes use the victim-side intersection and never bypass time windows", () => {
  const inputs = roundInputs();
  let checked = 0;
  for (let index = 0; index < 80; index += 1) {
    const { summary } = runRound(`routes-${index}`, inputs);
    for (const event of summary.timeline.filter((entry) => entry.kind === "kill")) {
      assert.ok(mirageVictimPool(event.site, event.phase, event.victimSide).includes(event.zone), `${event.victimSide}/${event.phase}/${event.zone}`);
      const [min, max] = mirageWindows[event.zone.toLowerCase()];
      assert.ok(event.elapsed >= min && event.elapsed <= max, `${event.zone}@${event.elapsed}`);
      checked += 1;
    }
  }
  assert.ok(checked > 100);
  for (const mapName of MAP_POOL) {
    const knownZones = Object.values(MAP_ZONES[mapName]).flat();
    const { summary } = runRound(`known-${mapName}`, inputs, mapName);
    for (const event of summary.timeline.filter((entry) => entry.kind === "kill")) {
      assert.ok(knownZones.includes(event.zone), `${mapName}/${event.zone}`);
    }
  }
});

test("persistent map form affects forecasts and fights without format coin flips", () => {
  const neutral = roundInputs({ consistency: 100, mapForm: 1, role: "Entry Fragger" });
  const favored = structuredClone(neutral);
  favored[0].players.forEach((player) => { player.mapForm = 1.25; });
  favored[1].players.forEach((player) => { player.mapForm = 0.75; });
  let neutralKills = 0;
  let favoredKills = 0;
  for (let index = 0; index < 60; index += 1) {
    const baseline = runRound(`form-${index}`, neutral);
    const boosted = runRound(`form-${index}`, favored);
    assert.ok(boosted.summary.preRoundExpectancy.teamA > baseline.summary.preRoundExpectancy.teamA);
    neutralKills += sum(baseline.summary.playerRoundStats.teamA.map((player) => player.kills));
    favoredKills += sum(boosted.summary.playerRoundStats.teamA.map((player) => player.kills));
    assert.ok(boosted.teamAState.players.every((player) => player.mapForm === 1.25));
  }
  assert.ok(favoredKills > neutralKills, `${favoredKills} <= ${neutralKills}`);
  const bo1 = runRound("format-free", neutral, "Mirage", { matchFormat: "BO1" });
  assert.deepEqual(runRound("format-free", neutral, "Mirage", { matchFormat: "BO3" }), bo1);
  assert.deepEqual(runRound("format-free", neutral, "Mirage", { matchFormat: "BO5" }), bo1);

  const stable = createMatchFromSetup(team("stable-a", { consistency: 100 }), team("stable-b", { consistency: 100 }), { seed: "stable", format: "BO1" });
  for (const state of [stable.maps[0].teamAState, stable.maps[0].teamBState]) {
    assert.equal(state.mapForm, 1);
    assert.ok(state.players.every((player) => player.mapForm === 1));
  }
  const volatile = createMatchFromSetup(team("volatile-a", { consistency: 0 }), team("volatile-b", { consistency: 0 }), { seed: "volatile", format: "BO1" });
  assert.ok(volatile.maps[0].teamAState.players.some((player) => player.mapForm !== 1));
});
