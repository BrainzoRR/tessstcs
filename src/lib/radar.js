import {
  RADAR_ASSETS,
  RADAR_VIEWBOXES,
  RADAR_SITE_FALLBACKS,
  RADAR_ZONE_POSITIONS,
  RADAR_ZONE_ALIASES,
  RADAR_ZONE_POLYGONS,
} from "./radarData.js";

export { RADAR_ASSETS, RADAR_VIEWBOXES, RADAR_SITE_FALLBACKS, RADAR_ZONE_POSITIONS, RADAR_ZONE_ALIASES, RADAR_ZONE_POLYGONS };

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const FULL_VIEW = { left: 0, top: 0, width: 1, height: 1 };
const MAP_NAMES = {
  mirage: "Mirage", inferno: "Inferno", nuke: "Nuke", overpass: "Overpass",
  dust: "Dust", dust2: "Dust", "dust 2": "Dust", "dust ii": "Dust",
  ancient: "Ancient", anubis: "Anubis", cache: "Cache",
};

export function normalizeRadarLookupKey(value) {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/\s+/g, " ") : "";
}

export function normalizeRadarMapName(value) {
  const key = normalizeRadarLookupKey(value).replace(/^de_/, "");
  return MAP_NAMES[key] ?? (typeof value === "string" ? value.trim() : "");
}

export function pointInPolygon(point, polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3 || !point?.every(Number.isFinite)) return false;
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const [xi, yi] = polygon[index];
    const [xj, yj] = polygon[previous];
    const cross = (point[0] - xi) * (yj - yi) - (point[1] - yi) * (xj - xi);
    const length = Math.hypot(xj - xi, yj - yi);
    // Include an edge/vertex, without treating a duplicate zero-length edge as an entire plane.
    if (length > 0 && Math.abs(cross) <= 1e-12 * length &&
        point[0] >= Math.min(xi, xj) - 1e-12 && point[0] <= Math.max(xi, xj) + 1e-12 &&
        point[1] >= Math.min(yi, yj) - 1e-12 && point[1] <= Math.max(yi, yj) + 1e-12) return true;
    if ((yi > point[1]) !== (yj > point[1]) && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function polygonBounds(polygon = []) {
  return polygon.reduce((result, [x, y]) => ({
    minX: Math.min(result.minX, x), maxX: Math.max(result.maxX, x),
    minY: Math.min(result.minY, y), maxY: Math.max(result.maxY, y),
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
}

export function polygonCentroid(polygon = []) {
  if (!polygon.length) return null;
  let crossSum = 0;
  let xSum = 0;
  let ySum = 0;
  polygon.forEach(([x, y], index) => {
    const [nextX, nextY] = polygon[(index + 1) % polygon.length];
    const cross = x * nextY - nextX * y;
    crossSum += cross;
    xSum += (x + nextX) * cross;
    ySum += (y + nextY) * cross;
  });
  if (Math.abs(crossSum) > Number.EPSILON) return [xSum / (3 * crossSum), ySum / (3 * crossSum)];
  return [polygon.reduce((sum, point) => sum + point[0], 0) / polygon.length,
    polygon.reduce((sum, point) => sum + point[1], 0) / polygon.length];
}

// A centroid can lie outside a concave polygon (notably Overpass A Long).
// Scan strictly between consecutive vertex heights: every nondegenerate simple
// polygon has a positive interior span on at least one of these scanlines.
export function interiorRadarPoint(polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3) return null;
  const heights = [...new Set(polygon.map((point) => point[1]))].sort((a, b) => a - b);
  let best = null;
  let bestWidth = 0;
  for (let row = 1; row < heights.length; row += 1) {
    const y = (heights[row - 1] + heights[row]) / 2;
    const crossings = [];
    polygon.forEach(([x1, y1], index) => {
      const [x2, y2] = polygon[(index + 1) % polygon.length];
      if ((y1 > y) !== (y2 > y)) crossings.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
    });
    crossings.sort((a, b) => a - b);
    for (let index = 0; index + 1 < crossings.length; index += 2) {
      const width = crossings[index + 1] - crossings[index];
      const point = [(crossings[index] + crossings[index + 1]) / 2, y];
      if (width > bestWidth && pointInPolygon(point, polygon)) {
        best = point;
        bestWidth = width;
      }
    }
  }
  return best;
}

function regionForKey(mapName, key) {
  if (!key) return null;
  const aliases = RADAR_ZONE_ALIASES[mapName] ?? {};
  const polygons = RADAR_ZONE_POLYGONS[mapName] ?? {};
  const label = aliases[key] ?? Object.keys(polygons).find((name) => normalizeRadarLookupKey(name) === key);
  if (label && polygons[label]) return { region: polygons[label], label };
  const match = Object.entries(RADAR_ZONE_POSITIONS[mapName] ?? {})
    .find(([name, region]) => region && normalizeRadarLookupKey(name) === key);
  return match ? { region: match[1], label: label ?? match[0] } : null;
}

export function resolveRadarPosition(mapName, zone, site) {
  const map = normalizeRadarMapName(mapName);
  const zoneKey = normalizeRadarLookupKey(zone);
  const siteKey = normalizeRadarLookupKey(site);
  const scoped = zoneKey && siteKey ? `${zoneKey}::${siteKey}` : "";
  // Exhaust all exact zone representations BEFORE consulting any site fallback.
  // In particular an anchor-only callout must not silently turn into a bombsite.
  const exact = regionForKey(map, scoped) ?? regionForKey(map, zoneKey);
  const match = exact ?? regionForKey(map, siteKey ? `site::${siteKey}` : "");
  const siteName = { a: "A", b: "B", mid: "Mid" }[siteKey];
  const region = match?.region ?? (siteName ? RADAR_SITE_FALLBACKS[map]?.[siteName] : null);
  const fallback = !exact;
  return {
    ...(region ?? { level: "upper", space: "absolute", x: null, y: null }),
    zoneLabel: exact?.label ?? (zoneKey ? String(zone).trim() : match?.label ?? siteName ?? "unknown"),
    matchedZone: match?.label ?? (region ? siteName : null),
    resolution: exact ? "zone" : region ? "site-fallback" : "unknown",
    fallback,
    approximate: true,
    synthetic: true,
    coordinateSource: region ? "callout-estimate" : "unresolved",
    positioned: Boolean(region),
  };
}

export function resolveRadarZoneLabel(mapName, zone, site) {
  return resolveRadarPosition(mapName, zone, site).zoneLabel;
}

export const resolveRadarLabel = resolveRadarZoneLabel;
export const bounds = polygonBounds;
export const centroid = polygonCentroid;

export function getRadarViewBox(mapName, level = "upper") {
  return RADAR_VIEWBOXES[normalizeRadarMapName(mapName)]?.[level] ?? FULL_VIEW;
}

export function hashRadarSeed(value = "") {
  const text = String(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  }
  return hash >>> 0;
}

// Mulberry32 mixing with an independent salted seed, returning [0, 1), never 1.
// Unlike string-hash % 10000, adjacent attempts don't walk a tiny correlated strip.
export function seededRadarUnit(seed, salt = 0) {
  let state = (hashRadarSeed(JSON.stringify([String(seed), salt])) + 0x6D2B79F5) | 0;
  state = Math.imul(state ^ (state >>> 15), state | 1);
  state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
  return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
}

export function radarPointToImage(point, region, mapName) {
  if (region.space === "absolute") return [...point];
  const view = getRadarViewBox(mapName, region.level ?? "upper");
  return [view.left + point[0] * view.width, view.top + point[1] * view.height];
}

export function radarPointFromImage(point, region, mapName) {
  if (region.space === "absolute") return [...point];
  const view = getRadarViewBox(mapName, region.level ?? "upper");
  return [(point[0] - view.left) / view.width, (point[1] - view.top) / view.height];
}

export function isRadarPointInRegion(point, region, mapName) {
  if (!point?.every(Number.isFinite) || !region) return false;
  const [x, y] = radarPointFromImage(point, region, mapName);
  if (region.polygon?.length) return pointInPolygon([x, y], region.polygon);
  const anchors = region.anchors?.length ? region.anchors : [[region.x, region.y]];
  const width = region.anchors ? (region.radius ?? 0.022) * 0.36 : (region.width ?? 0.06) * 0.62;
  const height = region.anchors ? width : (region.height ?? 0.06) * 0.62;
  return anchors.some(([ax, ay]) => Number.isFinite(ax) && Number.isFinite(ay) &&
    Math.abs(x - ax) <= width / 2 + 1e-12 && Math.abs(y - ay) <= height / 2 + 1e-12);
}

export function spawnInRadarRegion(region, seed, mapName) {
  if (!region || region.positioned === false) return { ...region, x: null, y: null, positioned: false };
  let local = null;
  if (region.polygon?.length) {
    const box = polygonBounds(region.polygon);
    for (let attempt = 0; attempt < 64; attempt += 1) {
      const candidate = [box.minX + seededRadarUnit(seed, attempt * 2 + 1) * (box.maxX - box.minX),
        box.minY + seededRadarUnit(seed, attempt * 2 + 2) * (box.maxY - box.minY)];
      if (pointInPolygon(candidate, region.polygon)) {
        local = candidate;
        break;
      }
    }
    local ??= interiorRadarPoint(region.polygon);
  } else {
    const anchors = region.anchors?.length ? region.anchors : [[region.x, region.y]];
    const anchor = anchors[Math.floor(seededRadarUnit(seed, 0) * anchors.length)];
    if (anchor.every((value) => typeof value === "number" && Number.isFinite(value))) {
      const width = region.anchors ? (region.radius ?? 0.022) * 0.36 : (region.width ?? 0.06) * 0.62;
      const height = region.anchors ? width : (region.height ?? 0.06) * 0.62;
      local = [anchor[0] + (seededRadarUnit(seed, 1) - 0.5) * width,
        anchor[1] + (seededRadarUnit(seed, 2) - 0.5) * height];
    }
  }
  if (!local) return { ...region, x: null, y: null, positioned: false };
  const [x, y] = radarPointToImage(local, region, mapName);
  // Do not clamp image-space polygons to a crop: clamping moves points outside
  // their true callout, especially on multi-floor Nuke and edge callouts.
  return { ...region, region, x, y, positioned: true };
}

export function separateRadarMarker(position, priorMarkers = [], seed, mapName) {
  const origin = { ...position, displayX: position.x, displayY: position.y, displayOverlaps: false };
  if (position.positioned === false) return origin;
  const level = position.level ?? "upper";
  const region = position.region ?? position;
  const relevant = priorMarkers.filter((marker) => marker.positioned !== false && (marker.level ?? "upper") === level);
  const distance = level === "lower" ? 0.017 : 0.024;
  const score = (point) => relevant.length ? Math.min(...relevant.map((marker) =>
    Math.hypot(point.x - (marker.displayX ?? marker.x), point.y - (marker.displayY ?? marker.y)))) : Infinity;
  if (score(position) >= distance) return origin;
  let best = position;
  let bestScore = score(best);
  for (let attempt = 0; attempt < 48; attempt += 1) {
    const candidate = spawnInRadarRegion(region, `${seed}:display:${attempt}`, mapName);
    if (!candidate.positioned || !isRadarPointInRegion([candidate.x, candidate.y], region, mapName)) continue;
    const candidateScore = score(candidate);
    if (candidateScore > bestScore) {
      best = candidate;
      bestScore = candidateScore;
    }
    if (bestScore >= distance) break;
  }
  // In an overcrowded tiny callout overlap is honest; moving into another room is not.
  return { ...origin, displayX: best.x, displayY: best.y, displayOverlaps: bestScore < distance };
}

export function radarEventSeed(event, mapName, options = {}) {
  const round = event.roundNumber ?? event.round ?? event.roundId ?? options.roundNumber ?? null;
  const eventId = event.id ?? event.eventId ?? event.deathId;
  // Legacy events without IDs use event content, never the selection's array index.
  const identity = eventId ?? [event.elapsed ?? event.clock ?? null, event.killerId ?? null,
    event.victimId ?? null, event.label ?? null, event.zone ?? null, event.site ?? null];
  return JSON.stringify([normalizeRadarMapName(mapName), round, identity]);
}

export function buildRadarMarkers(events = [], mapName, options = {}) {
  const kills = (Array.isArray(events) ? events : []).filter((event) => event?.kind === "kill");
  const markers = [];
  kills.forEach((event, index) => {
    const seed = radarEventSeed(event, mapName, options);
    const region = resolveRadarPosition(mapName, event.zone, event.site);
    const position = spawnInRadarRegion(region, seed, mapName);
    const display = separateRadarMarker(position, markers, seed, mapName);
    markers.push({
      id: `radar:${seed}`,
      eventId: event.id ?? event.eventId ?? event.deathId ?? null,
      roundNumber: event.roundNumber ?? event.round ?? event.roundId ?? options.roundNumber ?? null,
      x: position.x, y: position.y,
      displayX: display.displayX, displayY: display.displayY, displayOverlaps: display.displayOverlaps,
      level: region.level ?? "upper", zone: event.zone, zoneLabel: region.zoneLabel,
      site: event.site, victimTeamKey: event.victimTeamKey, victimSide: event.victimSide,
      clock: event.clock, label: event.label, openingKill: event.openingKill,
      recent: index === kills.length - 1,
      positioned: position.positioned, approximate: true, synthetic: true,
      fallback: region.fallback, resolution: region.resolution, coordinateSource: region.coordinateSource,
      matchedZone: region.matchedZone,
    });
  });
  return markers;
}
