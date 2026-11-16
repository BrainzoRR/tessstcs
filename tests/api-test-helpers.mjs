import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as validation from "../src/lib/historyValidation.js";

// Only explicitly provided imports are allowed: tests cannot load Prisma or
// the real next/server runtime, even accidentally. No connection string needed.
export function loadTypeScript(relativePath, mocks = {}) {
  const filename = new URL(relativePath, import.meta.url);
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: filename.pathname,
  });
  const moduleRecord = { exports: {} };
  const mockedRequire = (name) => {
    if (Object.prototype.hasOwnProperty.call(mocks, name)) return mocks[name];
    throw new Error(`Unexpected import in isolated API test: ${name}`);
  };
  const execute = vm.runInThisContext(`(function(require, module, exports) {${outputText}\n})`, { filename: filename.pathname });
  execute(mockedRequire, moduleRecord, moduleRecord.exports);
  return moduleRecord.exports;
}

export function historyEntry(id = "match-1") {
  const date = "2026-11-13T10:00:00.000Z";
  return {
    id, date, teams: "Alpha vs Bravo", score: "1-0", mvp: "ace",
    mapsPlayed: "Mirage", tournamentName: "Custom Event", stage: "Grand Final",
    eventType: "LAN", matchDate: "2026-11-13", includedInStats: true,
    data: {
      id, createdAt: date, finishedAt: date, format: "BO1",
      tournament: { name: "Custom Event", stage: "Grand Final", eventType: "LAN", matchDate: "2026-11-13" },
      teamA: { id: "a", name: "Alpha", tag: "ALP" },
      teamB: { id: "b", name: "Bravo", tag: "BRV" },
      seriesScore: { teamA: 1, teamB: 0 }, winnerKey: "teamA",
      players: [{ nickname: "ace", kills: 20, deaths: 10 }],
      mvp: { nickname: "ace" }, highlights: ["ace won the clutch"],
      maps: [{
        mapName: "Mirage", score: { teamA: 13, teamB: 10 },
        teamAPlayers: [{ live: true }], teamBPlayers: [{ live: true }],
        teamAState: { heavy: true }, teamBState: { heavy: true },
        rounds: [{
          number: 1, logs: ["heavy"], startLoadouts: { heavy: true }, loadouts: { heavy: true },
          playerRoundStats: { ace: { kills: 1 } }, preRoundExpectancy: 0.6,
          spectatorLeaders: ["ace"],
          timeline: [{
            id: "death-1", kind: "kill", clock: 31, zone: "A ramp", site: "A", label: "ace killed defender",
            meta: { victimId: "defender", victimZone: "jungle", victimSite: "A", deathZone: "jungle", deathSite: "A" },
            snapshot: { heavy: true },
          }],
        }],
      }],
    },
  };
}

export function harness(initialEntries = []) {
  const { entryToRow, rowToEntry } = loadTypeScript("../src/lib/db-sync.ts", { "./historyValidation.js": validation });
  const stored = new Map(initialEntries.map((entry) => [entry.id, { ...entryToRow(entry), createdAt: new Date(entry.date) }]));
  const calls = [];
  const matchRecord = {
    async findMany(args) { calls.push(["findMany", args]); return [...stored.values()]; },
    async upsert(args) {
      calls.push(["upsert", args]);
      const row = { ...(stored.get(args.where.id) ?? { createdAt: new Date() }), ...(stored.has(args.where.id) ? args.update : args.create) };
      stored.set(row.id, row);
      return row;
    },
    async deleteMany(args) {
      calls.push(["deleteMany", args]);
      const ids = typeof args.where?.id === "string" ? [args.where.id] : args.where?.id?.in;
      if (!ids?.length) throw new Error("Unscoped deletion forbidden in test");
      let count = 0;
      for (const id of ids) if (stored.delete(id)) count += 1;
      return { count };
    },
    async update(args) {
      calls.push(["update", args]);
      const row = stored.get(args.where.id);
      if (!row) throw new Error("Missing fixture row");
      Object.assign(row, args.data);
      return row;
    },
    async delete(args) { calls.push(["delete", args]); stored.delete(args.where.id); return { id: args.where.id }; },
  };
  const mocks = {
    "next/server": { NextResponse: { json: (body, init = {}) => ({ status: init.status ?? 200, body }) } },
    "@/lib/db": { db: { matchRecord } },
    "@/lib/db-sync": { entryToRow, rowToEntry },
    "@/lib/historyValidation.js": validation,
  };
  return {
    calls, stored, matchRecord, entryToRow, rowToEntry,
    matches: loadTypeScript("../src/app/api/matches/route.ts", mocks),
    match: loadTypeScript("../src/app/api/matches/[id]/route.ts", mocks),
    sync: loadTypeScript("../src/app/api/sync/route.ts", mocks),
  };
}

export function request(body, query = "") {
  return { json: async () => body, nextUrl: new URL(`http://localhost/api/matches${query}`) };
}

export const malformedJson = () => ({ json: async () => { throw new SyntaxError("Invalid JSON"); } });
export const paramsFor = (id = "match-1") => ({ params: Promise.resolve({ id }) });
