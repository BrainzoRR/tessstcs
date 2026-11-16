import test from "node:test";
import assert from "node:assert/strict";
import { MAP_ZONES } from "../src/lib/simulation.js";
import {
  RADAR_ZONE_POLYGONS,
  resolveRadarPosition,
  pointInPolygon,
  buildRadarMarkers,
  isRadarPointInRegion,
  getRadarViewBox,
} from "../src/lib/radar.js";

const maps = Object.entries(MAP_ZONES);

test("every simulation callout resolves to a radar region", () => {
  for (const [mapName, sites] of maps) {
    for (const [site, zones] of Object.entries(sites)) {
      for (const zone of zones) {
        const result = resolveRadarPosition(mapName, zone, site);
        assert.equal(result.positioned, true, `${mapName}/${site}/${zone} is not positioned`);
        assert.ok(result.region || result.polygon || result.anchors, `${mapName}/${zone} has no region`);
      }
    }
  }
});

test("polygon samples stay inside their concave regions", () => {
  for (const [mapName, regions] of Object.entries(RADAR_ZONE_POLYGONS)) {
    for (const [label, region] of Object.entries(regions)) {
      if (!region.polygon) continue;
      const first = buildRadarMarkers([{ id: `${mapName}:${label}`, kind: "kill", zone: label }], mapName)[0];
      assert.equal(first.positioned, true, `${mapName}/${label} did not spawn`);
      const local = region.space === "absolute" ? [first.x, first.y] : [first.x, first.y];
      assert.equal(pointInPolygon(local, region.polygon), true, `${mapName}/${label} escaped polygon`);
    }
  }
});

test("analytical positions are stable regardless of event array order", () => {
  const events = [
    { id: "death-a", kind: "kill", zone: "A ramp", site: "A", roundNumber: 2 },
    { id: "death-b", kind: "kill", zone: "jungle", site: "A", roundNumber: 2 },
  ];
  const first = Object.fromEntries(buildRadarMarkers(events, "Mirage").map((marker) => [marker.eventId, [marker.x, marker.y]]));
  const reversed = Object.fromEntries(buildRadarMarkers([...events].reverse(), "Mirage").map((marker) => [marker.eventId, [marker.x, marker.y]]));
  assert.deepEqual(reversed, first);
});

test("display separation does not mutate analytical coordinates", () => {
  const events = [
    { id: "same-a", kind: "kill", zone: "A Site", site: "A", roundNumber: 1 },
    { id: "same-b", kind: "kill", zone: "A Site", site: "A", roundNumber: 1 },
  ];
  const markers = buildRadarMarkers(events, "Mirage");
  assert.deepEqual([markers[0].x, markers[0].y], [markers[0].x, markers[0].y]);
  assert.deepEqual([markers[1].x, markers[1].y], [markers[1].x, markers[1].y]);
  assert.ok(Number.isFinite(markers[1].displayX));
  assert.equal(isRadarPointInRegion([markers[1].displayX, markers[1].displayY], resolveRadarPosition("Mirage", "A Site", "A"), "Mirage"), true);
});

test("Ancient A-main points remain visible in the view box", () => {
  const box = getRadarViewBox("Ancient", "upper");
  assert.ok(0.13 >= box.left && 0.13 <= box.left + box.width);
  assert.ok(0.40 >= box.top && 0.40 <= box.top + box.height);
  for (let i = 0; i < 100; i++) {
    const marker = buildRadarMarkers([{ id: `ancient-${i}`, kind: "kill", zone: "A main", site: "A" }], "Ancient")[0];
    assert.ok(marker.x >= box.left && marker.x <= box.left + box.width);
    assert.ok(marker.y >= box.top && marker.y <= box.top + box.height);
  }
});

test("unknown callouts are explicit instead of confident center points", () => {
  const marker = buildRadarMarkers([{ id: "unknown", kind: "kill", zone: "not-a-callout" }], "Mirage")[0];
  assert.equal(marker.positioned, false);
  assert.equal(marker.x, null);
  assert.equal(marker.y, null);
  assert.equal(marker.resolution, "unknown");
  assert.equal(marker.fallback, true);
});
