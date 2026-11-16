// Durable, single-client archive outbox. No database credentials or React dependency.
export const OUTBOX_KEY = 'cs2sim_archive_outbox_v1';
const emptyJournal = () => ({ version: 1, operations: Object.create(null), deletedIds: [] });
export function readArchiveJournal(storage) {
  try {
    const value = JSON.parse(storage?.getItem(OUTBOX_KEY) || 'null');
    if (value?.version !== 1 || !value.operations || typeof value.operations !== 'object' || Array.isArray(value.operations)) return emptyJournal();
    const operations = Object.create(null);
    for (const [id, op] of Object.entries(value.operations)) {
      if (!id || !op || !['save', 'delete'].includes(op.kind)) continue;
      if (op.kind === 'save' && op.entry?.id !== id) continue;
      operations[id] = op;
    }
    return { version: 1, operations, deletedIds: Array.isArray(value.deletedIds) ? value.deletedIds.filter(id => typeof id === 'string') : [] };
  } catch { return emptyJournal(); }
}
export function restorePendingHistory(entries, storage) {
  const journal = readArchiveJournal(storage);
  const deleted = new Set(journal.deletedIds);
  const merged = new Map((entries || []).filter(e => e?.id && !deleted.has(e.id)).map(e => [e.id, e]));
  for (const [id, op] of Object.entries(journal.operations)) {
    if (op.kind === 'delete') merged.delete(id);
    else if (!deleted.has(id)) merged.set(id, op.entry);
  }
  return [...merged.values()];
}
export function createArchiveSync({ initialEntries = [], storage, request, slim = e => e, onMerge = () => {}, onStatus = () => {}, schedule = setTimeout, cancel = clearTimeout, localOnly = false }) {
  let journal = readArchiveJournal(storage);
  let entries = initialEntries;
  let baseline = new Map(entries.map(e => [e.id, JSON.stringify(slim(e))]));
  let hydrated = false, stopped = false, running = false, timer = null, attempts = 0, generation = 0;
  let storageFailed = false;
  const status = (state, error = null) => !stopped && onStatus({ state, error, pending: Object.keys(journal.operations).length, storageFailed });
  function persist() {
    try { storage.setItem(OUTBOX_KEY, JSON.stringify(journal)); storageFailed = false; return true; }
    catch { storageFailed = true; status('error', 'outbox-storage'); return false; }
  }
  function enqueue(id, kind, entry) {
    journal.operations[id] = { kind, ...(entry ? { entry: slim(entry) } : {}), revision: ++generation };
    if (kind === 'delete') journal.deletedIds = [...new Set([...journal.deletedIds, id])];
    persist();
  }
  function later(delay = 500) {
    if (timer) cancel(timer);
    if (!stopped && !localOnly) timer = schedule(() => { timer = null; void flush(); }, delay);
  }
  function observe(nextEntries) {
    if (stopped) return;
    entries = nextEntries;
    const next = new Map(nextEntries.map(e => [e.id, JSON.stringify(slim(e))]));
    for (const e of nextEntries) {
      if (next.get(e.id) !== baseline.get(e.id) && !journal.deletedIds.includes(e.id)) enqueue(e.id, 'save', e);
    }
    for (const id of baseline.keys()) if (!next.has(id)) enqueue(id, 'delete');
    baseline = next;
    if (Object.keys(journal.operations).length) { status(localOnly ? 'local' : 'pending'); later(); }
  }
  async function hydrate() {
    status('loading');
    const response = await request('/api/matches', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload?.entries) || payload.entries.some(e => !e || typeof e.id !== 'string' || !e.data)) throw new Error('Invalid archive response');
    if (stopped) return;
    const remote = new Map(payload.entries.map(e => [e.id, e]));
    const merged = new Map(remote);
    for (const entry of entries) {
      if (!remote.has(entry.id) && !journal.deletedIds.includes(entry.id)) {
        merged.set(entry.id, entry);
        if (!journal.operations[entry.id]) enqueue(entry.id, 'save', entry);
      }
    }
    for (const [id, op] of Object.entries(journal.operations)) {
      if (op.kind === 'delete') merged.delete(id);
      else merged.set(id, op.entry);
    }
    for (const id of journal.deletedIds) merged.delete(id);
    entries = [...merged.values()];
    baseline = new Map(entries.map(e => [e.id, JSON.stringify(slim(e))]));
    hydrated = true;
    onMerge(entries);
  }
  async function flush() {
    if (stopped || running || localOnly) { if (localOnly) status('local'); return; }
    running = true;
    try {
      if (!hydrated) await hydrate();
      if (stopped) return;
      status('syncing');
      while (!stopped && Object.keys(journal.operations).length) {
        const [id, op] = Object.entries(journal.operations)[0];
        const response = op.kind === 'delete'
          ? await request(`/api/matches/${encodeURIComponent(id)}`, { method: 'DELETE' })
          : await request('/api/matches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entry: op.entry }) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        // A deletion/change queued while the request was in flight must survive its acknowledgement.
        if (journal.operations[id] === op) { delete journal.operations[id]; persist(); }
      }
      attempts = 0;
      status(storageFailed ? 'error' : 'synced', storageFailed ? 'outbox-storage' : null);
    } catch (error) {
      attempts += 1;
      status('error', error.message);
      later(Math.min(60000, 2000 * 2 ** Math.min(attempts, 5)));
    } finally { running = false; }
  }
  return {
    observe,
    start() { if (localOnly) status('local'); else void flush(); },
    retry() { attempts = 0; later(0); },
    // Explicit user import may restore a deliberately deleted local ID.
    allowRestore(ids) { journal.deletedIds = journal.deletedIds.filter(id => !ids.includes(id)); persist(); },
    refreshFromStorage() {
      const other = readArchiveJournal(storage);
      const deleted = new Set([...journal.deletedIds, ...other.deletedIds]);
      journal.deletedIds = [...deleted];
      for (const id of deleted) {
        if ((other.operations[id]?.kind === 'delete' || journal.operations[id]?.kind === 'save') && journal.operations[id]?.kind !== 'delete') enqueue(id, 'delete');
      }
      const filtered = entries.filter(e => !deleted.has(e.id));
      if (filtered.length !== entries.length) { entries = filtered; baseline = new Map(entries.map(e => [e.id, JSON.stringify(slim(e))])); onMerge(entries); }
      later();
    },
    stop() { stopped = true; if (timer) cancel(timer); },
    flush,
    snapshot() { return JSON.parse(JSON.stringify(journal)); },
  };
}
