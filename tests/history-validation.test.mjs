import test from "node:test";
import assert from "node:assert/strict";
import { isValidHistoryId, validateHistoryEntry, validateImport } from "../src/lib/historyValidation.js";
import { historyEntry } from "./api-test-helpers.mjs";
import { buildHistoryEntry } from "../src/lib/simulation.js";

test("current buildHistoryEntry output is accepted unchanged", () => {
  const entry = buildHistoryEntry(historyEntry().data);
  const before = structuredClone(entry);
  assert.equal(validateHistoryEntry(entry), null);
  const entries = [entry];
  for (const payload of [entries, { entries }]) {
    const result = validateImport(payload);
    assert.equal(result.ok, true);
    assert.equal(result.entries, entries);
  }
  assert.deepEqual(entry, before);
});

test("older entries may omit display labels and use the original results timestamp", () => {
  const current = historyEntry();
  const legacy = { id: current.id, data: current.data };
  delete legacy.data.tournament;
  delete legacy.data.winnerKey;
  delete legacy.data.finishedAt;
  assert.equal(validateHistoryEntry(legacy), null);
  legacy.date = "2026-11-13";
  assert.equal(validateHistoryEntry(legacy), null);
});

test("required core results are not silently replaced with defaults", () => {
  for (const key of ["teamA", "teamB", "seriesScore", "format", "maps", "players"]) {
    const entry = historyEntry();
    delete entry.data[key];
    assert.equal(validateImport([entry]).ok, false, key);
  }
  for (const value of [null, [], false, "archive", 12]) {
    const entry = historyEntry();
    entry.data = value;
    assert.notEqual(validateHistoryEntry(entry), null);
  }
});

test("ids are nonempty strings and duplicate or conflicting ids are rejected", () => {
  for (const id of [undefined, null, "", " \t", 1, {}, [], "bad\nid"]) {
    assert.equal(isValidHistoryId(id), false);
    assert.equal(validateImport([{ ...historyEntry(), id }]).ok, false);
  }
  assert.equal(isValidHistoryId("match-with-unicode-матч"), true);
  assert.equal(validateImport([historyEntry(), historyEntry()]).ok, false);
  const entry = historyEntry();
  entry.data.id = "different";
  assert.notEqual(validateHistoryEntry(entry), null);
});

test("invalid dates are rejected instead of normalized or replaced by now", () => {
  for (const date of [null, 0, "1", "not-a-date", "2026-02-30", "2026-13-01", "2026-11-13T12:00:00", "2026-11-13T24:00:00Z", "2026-11-13T23:60:00Z"]) {
    assert.equal(validateImport([{ ...historyEntry(), date }]).ok, false, String(date));
  }
  for (const field of ["finishedAt", "createdAt"]) {
    const entry = historyEntry();
    entry.data[field] = "invalid";
    assert.notEqual(validateHistoryEntry(entry), null);
  }
  const noDate = historyEntry();
  delete noDate.date;
  delete noDate.data.finishedAt;
  delete noDate.data.createdAt;
  assert.notEqual(validateHistoryEntry(noDate), null);
  for (const matchDate of [null, "2026-02-29", "2026-11-13T00:00:00Z", "2026-1-1"]) {
    assert.notEqual(validateHistoryEntry({ ...historyEntry(), matchDate }), null);
    const entry = historyEntry();
    entry.data.tournament.matchDate = matchDate;
    assert.notEqual(validateHistoryEntry(entry), null);
  }
  const leapDay = historyEntry();
  leapDay.matchDate = "2024-02-29";
  assert.equal(validateHistoryEntry(leapDay), null);
});

test("wrong field types do not flow into Prisma columns or analyst views", () => {
  const changes = [
    (e) => { e.includedInStats = "false"; },
    (e) => { e.tournamentName = {}; },
    (e) => { e.mapsPlayed = []; },
    (e) => { e.eventType = "other"; },
    (e) => { e.data.teamA.name = " "; },
    (e) => { e.data.teamB.tag = 5; },
    (e) => { e.data.seriesScore.teamA = "1"; },
    (e) => { e.data.seriesScore.teamB = -1; },
    (e) => { e.data.seriesScore.teamB = 1.5; },
    (e) => { e.data.seriesScore.teamB = 2147483648; },
    (e) => { e.data.format = "BO7"; },
    (e) => { e.data.winnerKey = "other"; },
    (e) => { e.data.tournament = []; },
    (e) => { e.data.tournament.stage = 5; },
    (e) => { e.data.mvp = { nickname: false }; },
    (e) => { e.data.players = [null]; },
    (e) => { e.data.maps = [null]; },
    (e) => { e.data.maps[0].score = { teamA: "13", teamB: 10 }; },
    (e) => { e.data.maps[0].rounds = [null]; },
  ];
  for (const change of changes) {
    const entry = historyEntry();
    change(entry);
    assert.equal(validateImport([entry]).ok, false, change.toString());
  }
});

test("an invalid tail entry rejects the entire import without filtering", () => {
  const entry = historyEntry();
  const entries = [entry, { id: "incomplete" }];
  const before = structuredClone(entries);
  const result = validateImport(entries);
  assert.equal(result.ok, false);
  assert.match(result.error, /^Entry 2:/);
  assert.equal("entries" in result, false);
  assert.deepEqual(entries, before);
  for (const payload of [null, {}, "[]", { entries: null }, { entries: {} }, { matchHistory: entries }]) {
    assert.equal(validateImport(payload).ok, false);
  }
  assert.equal(validateImport([]).ok, true);
});
