import test from "node:test";
import assert from "node:assert/strict";
import { historyEntry, harness, request, malformedJson, paramsFor } from "./api-test-helpers.mjs";
import { createArchiveSync } from "../src/lib/archiveSync.js";

const mutations = (calls) => calls.filter(([name]) => name !== "findMany");

test("sync only upserts and retains server-only matches", async () => {
  const api = harness([historyEntry("server-only")]);
  const result = await api.sync.POST(request({ entries: [historyEntry()] }));
  assert.equal(result.status, 200);
  assert.equal(result.body.synced, 1);
  assert.equal(result.body.deleted, 0);
  assert.deepEqual(new Set(result.body.entries.map((entry) => entry.id)), new Set(["server-only", "match-1"]));
  assert.deepEqual(mutations(api.calls).map(([name]) => name), ["upsert"]);
  assert.deepEqual(api.calls.find(([name]) => name === "findMany")[1], { orderBy: { finishedAt: "desc" } });
});

test("sync accepts legacy bare arrays and treats explicit empty arrays as no-ops", async () => {
  for (const body of [[], { entries: [] }]) {
    const api = harness([historyEntry("retained")]);
    const result = await api.sync.POST(request(body));
    assert.equal(result.status, 200);
    assert.equal(result.body.synced, 0);
    assert.equal(result.body.deleted, 0);
    assert.equal(result.body.entries[0].id, "retained");
    assert.deepEqual(mutations(api.calls), []);
  }
  const api = harness();
  assert.equal((await api.sync.POST(request([historyEntry()]))).status, 200);
  assert.equal(api.stored.size, 1);
});

test("sync rejects malformed containers instead of emptying the archive", async () => {
  for (const body of [null, {}, { entries: null }, { entries: {} }, { entries: "[]" }, "[]", 1, false]) {
    const api = harness([historyEntry("retained")]);
    const result = await api.sync.POST(request(body));
    assert.equal(result.status, 400, JSON.stringify(body));
    assert.equal(api.stored.size, 1);
    assert.deepEqual(api.calls, []);
  }
});

test("sync validates the entire batch before writing the first valid entry", async () => {
  const invalidEntries = [
    null, {}, { ...historyEntry("bad"), id: 3 },
    { ...historyEntry("bad"), date: "2026-02-30" },
    { ...historyEntry("bad"), data: {} },
    { ...historyEntry("bad"), includedInStats: "false" },
  ];
  for (const invalid of invalidEntries) {
    const api = harness([historyEntry("retained")]);
    const result = await api.sync.POST(request({ entries: [historyEntry(), invalid] }));
    assert.equal(result.status, 400);
    assert.deepEqual(api.calls, []);
    assert.deepEqual([...api.stored.keys()], ["retained"]);
  }
  const api = harness();
  assert.equal((await api.sync.POST(request([historyEntry(), historyEntry()]))).status, 400);
  assert.deepEqual(api.calls, []);
});

test("invalid JSON is 400 in every JSON mutation route with zero DB calls", async () => {
  const api = harness();
  assert.equal((await api.matches.POST(malformedJson())).status, 400);
  assert.equal((await api.sync.POST(malformedJson())).status, 400);
  assert.equal((await api.match.PATCH(malformedJson(), paramsFor())).status, 400);
  assert.deepEqual(api.calls, []);
});

test("single save validates wrapped and bare entries before upsert", async () => {
  for (const body of [historyEntry(), { entry: historyEntry() }]) {
    const api = harness();
    const result = await api.matches.POST(request(body));
    assert.equal(result.status, 200);
    assert.equal(result.body.id, "match-1");
    assert.deepEqual(mutations(api.calls).map(([name]) => name), ["upsert"]);
  }
  for (const body of [null, [], {}, { entry: null }, { id: "existing" }, { ...historyEntry(), data: [] }]) {
    const api = harness([historyEntry("existing")]);
    assert.equal((await api.matches.POST(request(body))).status, 400);
    assert.deepEqual(api.calls, []);
  }
});

test("bulk delete requires explicit nonempty ids and scopes deletion", async () => {
  for (const query of ["", "?ids=", "?ids=,", "?ids=%20%20", "?ids=match-1,", "?ids=match-1,,other"]) {
    const api = harness([historyEntry()]);
    assert.equal((await api.matches.DELETE(request(null, query))).status, 400, query);
    assert.deepEqual(api.calls, []);
    assert.equal(api.stored.size, 1);
  }
  const api = harness([historyEntry(), historyEntry("other"), historyEntry("keep")]);
  const result = await api.matches.DELETE(request(null, "?ids=match-1,other,match-1"));
  assert.equal(result.status, 200);
  assert.equal(result.body.deleted, 2);
  assert.deepEqual(api.calls, [["deleteMany", { where: { id: { in: ["match-1", "other"] } } }]]);
  assert.deepEqual([...api.stored.keys()], ["keep"]);
});

test("PATCH requires actual booleans and validates the path id", async () => {
  for (const body of [null, [], {}, { includedInStats: "false" }, { includedInStats: 0 }, { includedInStats: null }]) {
    const api = harness([historyEntry()]);
    assert.equal((await api.match.PATCH(request(body), paramsFor())).status, 400);
    assert.deepEqual(api.calls, []);
  }
  for (const includedInStats of [false, true]) {
    const api = harness([historyEntry()]);
    const result = await api.match.PATCH(request({ includedInStats }), paramsFor());
    assert.equal(result.status, 200);
    assert.equal(result.body.includedInStats, includedInStats);
    assert.deepEqual(api.calls, [["update", { where: { id: "match-1" }, data: { includedInStats } }]]);
  }
  for (const id of ["", "  ", 5]) {
    const api = harness();
    assert.equal((await api.match.PATCH(request({ includedInStats: false }), paramsFor(id))).status, 400);
    assert.equal((await api.match.DELETE(request(null), paramsFor(id))).status, 400);
    assert.deepEqual(api.calls, []);
  }
});

test("single delete and GET retain the existing API contracts", async () => {
  const api = harness([historyEntry()]);
  const list = await api.matches.GET();
  assert.equal(list.status, 200);
  assert.equal(list.body.count, 1);
  assert.equal(list.body.entries[0].id, "match-1");
  const result = await api.match.DELETE(request(null), paramsFor());
  assert.deepEqual(result.body, { ok: true });
  assert.deepEqual(api.calls[1], ["deleteMany", { where: { id: "match-1" } }]);
  assert.deepEqual((await api.match.DELETE(request(null), paramsFor())).body, { ok: true });
});

test("missing delete does not block subsequent queued saves", async () => {
  const api = harness();
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const discarded = historyEntry("discarded");
  const retained = historyEntry("retained");
  const queue = createArchiveSync({ initialEntries: [discarded], storage, schedule: () => 1, cancel: () => {},
    request: async (url, init = {}) => {
      let result;
      if (init.method === "DELETE") result = await api.match.DELETE(request(null), paramsFor(decodeURIComponent(url.split("/").at(-1))));
      else if (init.method === "POST") result = await api.matches.POST(request(JSON.parse(init.body)));
      else result = await api.matches.GET();
      return { ok: result.status >= 200 && result.status < 300, status: result.status, json: async () => result.body };
    },
  });
  queue.observe([]);
  queue.observe([retained]);
  await queue.flush();
  assert.equal(api.stored.has("discarded"), false);
  assert.equal(api.stored.has("retained"), true);
  assert.deepEqual(queue.snapshot().operations, {});
  queue.stop();
});

test("server slimming removes only heavy payload and preserves death metadata", async () => {
  const api = harness();
  const entry = historyEntry();
  const original = structuredClone(entry);
  const row = api.entryToRow(entry);
  const slim = JSON.parse(row.dataJson);
  const map = slim.maps[0];
  for (const key of ["teamAPlayers", "teamBPlayers", "teamAState", "teamBState"]) assert.equal(key in map, false);
  const round = map.rounds[0];
  for (const key of ["logs", "loadouts", "startLoadouts"]) assert.equal(key in round, false);
  const { snapshot, ...expectedEvent } = entry.data.maps[0].rounds[0].timeline[0];
  assert.deepEqual(round.timeline[0], expectedEvent);
  assert.deepEqual(round.playerRoundStats, entry.data.maps[0].rounds[0].playerRoundStats);
  assert.equal(round.preRoundExpectancy, 0.6);
  assert.deepEqual(round.spectatorLeaders, ["ace"]);
  assert.deepEqual(entry, original);
  const restored = api.rowToEntry({ ...row, createdAt: new Date(entry.date) });
  assert.equal(restored.date, entry.date);
  assert.deepEqual(restored.data.maps[0].rounds[0].timeline[0].meta, expectedEvent.meta);
  assert.throws(() => api.entryToRow({ id: "bad", data: {} }), TypeError);
});

test("database failures are still server errors, not validation errors", async () => {
  const api = harness();
  api.matchRecord.upsert = async () => { throw new Error("offline mock database"); };
  assert.equal((await api.sync.POST(request([historyEntry()]))).status, 500);
  assert.equal((await api.matches.POST(request(historyEntry()))).status, 500);
});
