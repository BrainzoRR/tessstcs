import test from 'node:test';
import assert from 'node:assert/strict';
import { createArchiveSync, restorePendingHistory, OUTBOX_KEY } from '../src/lib/archiveSync.js';
const entry = (id, extra = {}) => ({ id, date: '2026-01-01T00:00:00Z', data: { teamA: {}, teamB: {} }, ...extra });
function storage() { const values = new Map(); return { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) }; }
const response = (entries = []) => ({ ok: true, json: async () => ({ entries }) });
function setup(options = {}) {
  const calls = [], states = [];
  const queue = createArchiveSync({ storage: storage(), request: async (url, init) => { calls.push({ url, init }); return response(); }, onStatus: s => states.push(s), schedule: () => 1, cancel: () => {}, ...options });
  return { queue, calls, states };
}
test('unchanged hydrated archives are not uploaded again', async () => {
  const original = entry('a');
  const calls = [];
  const { queue } = setup({ initialEntries: [original], request: async (url, init) => { calls.push({ url, init }); return response([original]); } });
  await queue.flush(); queue.observe([original]); await queue.flush();
  assert.equal(calls.length, 1);
});
test('local-only records are durably sent as individual entries', async () => {
  const { queue, calls } = setup({ initialEntries: [entry('a'), entry('b')] });
  await queue.flush();
  assert.equal(calls.length, 3);
  assert.equal(JSON.parse(calls[1].init.body).entry.id, 'a');
  assert.equal(Object.keys(queue.snapshot().operations).length, 0);
});
test('deletion survives reload and never becomes an empty-list reconciliation', async () => {
  const disk = storage();
  const { queue, calls } = setup({ initialEntries: [entry('a')], storage: disk });
  queue.observe([]);
  assert.deepEqual(restorePendingHistory([entry('a')], disk), []);
  await queue.flush();
  assert.equal(calls.at(-1).init.method, 'DELETE');
  assert.equal(calls.at(-1).url, '/api/matches/a');
  assert.deepEqual(restorePendingHistory([entry('a')], disk), []);
});
test('an in-flight save cannot acknowledge a later deletion', async () => {
  let release;
  let started;
  const saving = new Promise(resolve => { started = resolve; });
  const methods = [];
  const { queue } = setup({ initialEntries: [], request: async (url, init) => {
    if (!init?.method) return response();
    methods.push(init.method);
    if (init.method === 'POST') { started(); return new Promise(resolve => { release = resolve; }); }
    return response();
  } });
  await queue.flush();
  queue.observe([entry('a')]);
  const inFlight = queue.flush();
  await saving;
  queue.observe([]);
  release(response()); await inFlight;
  assert.deepEqual(methods, ['POST', 'DELETE']);
  assert.deepEqual(queue.snapshot().deletedIds, ['a']);
});
test('failed initial GET retries and preserves pending work', async () => {
  let fail = true;
  const { queue, states } = setup({ initialEntries: [entry('a')], request: async () => { if (fail) throw new Error('offline'); return response(); } });
  await queue.flush();
  assert.equal(states.at(-1).state, 'error');
  fail = false; await queue.flush();
  assert.equal(states.at(-1).state, 'synced');
});
test('failed POST stays in outbox for another session', async () => {
  const disk = storage();
  const { queue } = setup({ storage: disk, request: async (url, init) => init?.method ? { ok: false, status: 500 } : response() });
  await queue.flush(); queue.observe([entry('a')]); await queue.flush();
  assert.equal(restorePendingHistory([], disk)[0].id, 'a');
});
test('quota errors are visible rather than reported as synced', async () => {
  const { queue, states } = setup({ storage: { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } } });
  await queue.flush(); queue.observe([entry('a')]); await queue.flush();
  assert.equal(states.at(-1).state, 'error');
  assert.equal(states.at(-1).storageFailed, true);
});
test('local preview never contacts an API', async () => {
  const { queue, calls } = setup({ localOnly: true });
  queue.start(); queue.observe([entry('a')]); await queue.flush();
  assert.equal(calls.length, 0);
});
test('prototype-like IDs remain ordinary operation keys', async () => {
  const { queue, calls } = setup();
  await queue.flush(); queue.observe([entry('__proto__')]); await queue.flush();
  assert.equal(JSON.parse(calls.at(-1).init.body).entry.id, '__proto__');
});
test('cross-tab tombstones do not continually rewrite storage', () => {
  const disk = storage(); let writes = 0;
  const raw = disk.setItem; disk.setItem = (...args) => { writes++; raw(...args); };
  const first = setup({ initialEntries: [entry('a')], storage: disk, localOnly: true }).queue;
  first.observe([]);
  const second = setup({ initialEntries: [entry('a')], storage: disk, localOnly: true }).queue;
  second.refreshFromStorage(); first.refreshFromStorage(); second.refreshFromStorage();
  assert.ok(writes < 4);
  assert.ok(JSON.parse(disk.getItem(OUTBOX_KEY)).deletedIds.includes('a'));
});
