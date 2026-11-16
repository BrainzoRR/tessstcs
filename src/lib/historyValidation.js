// Pure archive boundary validation, shared by browser imports and API routes.
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const has = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const isText = (value) => typeof value === "string" && value.trim().length > 0;
const isScore = (value) => Number.isInteger(value) && value >= 0 && value <= 2147483647;
const isScorePair = (value) => isRecord(value) && isScore(value.teamA) && isScore(value.teamB);

export function isValidHistoryId(value) {
  return isText(value) && !/[\u0000-\u001f\u007f]/.test(value);
}

function isCalendarDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isTimestamp(value) {
  // Accept legacy date-only values as well as ISO timestamps, not permissive
  // Date.parse inputs such as numbers, "1", or impossible calendar dates.
  return typeof value === "string"
    && isCalendarDate(value.slice(0, 10))
    && /^\d{4}-\d{2}-\d{2}(?:T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d))?$/.test(value)
    && Number.isFinite(new Date(value).getTime());
}

/**
 * Return null for a usable archive entry, otherwise a human-readable error.
 * The existing buildHistoryEntry shape is preserved verbatim (no stripping,
 * coercion, defaults, or synthesized dates). Display labels/tournament metadata
 * and includedInStats are optional for older archives. Core results are required:
 * data.teamA/teamB.name, format, seriesScore, maps and players. A valid entry.date,
 * data.finishedAt or data.createdAt must be available. Heavy live-state fields
 * and timeline metadata are allowed; entryToRow owns server-side slimming.
 */
export function validateHistoryEntry(entry) {
  if (!isRecord(entry)) return "Entry must be an object";
  if (!isValidHistoryId(entry.id)) return "Entry id must be a nonempty string";
  const data = entry.data;
  if (!isRecord(data)) return "Entry data must be an object";
  if (has(data, "id") && (!isValidHistoryId(data.id) || data.id !== entry.id)) return "Entry and data ids must match";
  if (has(entry, "includedInStats") && typeof entry.includedInStats !== "boolean") return "includedInStats must be boolean";
  for (const key of ["teams", "score", "mvp", "mapsPlayed", "tournamentName", "stage"]) {
    if (has(entry, key) && typeof entry[key] !== "string") return `${key} must be a string`;
  }
  if (has(entry, "eventType") && !["LAN", "Online"].includes(entry.eventType)) return "Invalid eventType";
  for (const [label, value] of [["date", entry.date], ["finishedAt", data.finishedAt], ["createdAt", data.createdAt]]) {
    if (value !== undefined && !isTimestamp(value)) return `Invalid ${label}`;
  }
  if (!isTimestamp(entry.date ?? data.finishedAt ?? data.createdAt)) return "Entry requires a valid archive date";
  if (has(entry, "matchDate") && !isCalendarDate(entry.matchDate)) return "Invalid matchDate";
  for (const key of ["teamA", "teamB"]) {
    if (!isRecord(data[key]) || !isText(data[key].name)) return `data.${key}.name is required`;
    if (has(data[key], "tag") && typeof data[key].tag !== "string") return `data.${key}.tag must be a string`;
  }
  if (!["BO1", "BO3", "BO5"].includes(data.format)) return "Invalid data.format";
  if (!isScorePair(data.seriesScore)) return "data.seriesScore requires nonnegative integer team scores";
  if (has(data, "winnerKey") && !["teamA", "teamB"].includes(data.winnerKey)) return "Invalid data.winnerKey";
  if (has(data, "tournament")) {
    if (!isRecord(data.tournament)) return "data.tournament must be an object";
    for (const key of ["name", "stage"]) {
      if (has(data.tournament, key) && typeof data.tournament[key] !== "string") return `tournament.${key} must be a string`;
    }
    if (has(data.tournament, "matchDate") && !isCalendarDate(data.tournament.matchDate)) return "Invalid tournament.matchDate";
    if (has(data.tournament, "eventType") && !["LAN", "Online"].includes(data.tournament.eventType)) return "Invalid tournament.eventType";
  }
  if (has(data, "mvp") && data.mvp !== null && (!isRecord(data.mvp) || typeof data.mvp.nickname !== "string")) return "Invalid data.mvp";
  if (!Array.isArray(data.players) || data.players.some((player) => !isRecord(player) || !isText(player.nickname))) return "data.players must contain player objects with nicknames";
  if (!Array.isArray(data.maps)) return "data.maps must be an array";
  for (const map of data.maps) {
    if (!isRecord(map) || !isText(map.mapName)) return "Each map requires a mapName";
    if (has(map, "score") && !isScorePair(map.score)) return "Invalid map score";
    if (has(map, "rounds") && (!Array.isArray(map.rounds) || map.rounds.some((round) => !isRecord(round)))) return "Map rounds must contain objects";
  }
  return null;
}

/**
 * Validate an entire import/sync before any mutation. Accepts Entry[] or
 * { entries: Entry[] }; malformed containers are NEVER interpreted as empty.
 * Returns { ok: true, entries } (original array) or { ok: false, error }.
 * Duplicate ids are rejected rather than silently overwriting another entry.
 * Empty arrays are valid additive syncs and must not imply deletion.
 */
export function validateImport(payload) {
  const entries = Array.isArray(payload) ? payload : isRecord(payload) ? payload.entries : undefined;
  if (!Array.isArray(entries)) return { ok: false, error: "Expected an entries array" };
  const seen = new Set();
  for (let index = 0; index < entries.length; index += 1) {
    const error = validateHistoryEntry(entries[index]);
    if (error) return { ok: false, error: `Entry ${index + 1}: ${error}` };
    const { id } = entries[index];
    if (seen.has(id)) return { ok: false, error: `Duplicate entry id: ${id}` };
    seen.add(id);
  }
  return { ok: true, entries };
}
