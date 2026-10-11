import { area, booleanPointInPolygon, circle, difference, distance, featureCollection, intersect, point } from "@turf/turf";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { boundary, countyAcs, ncState, resources, tracts, type Resource } from "./data";
import countiesRaw from "@/data/counties.json";

export const counties = countiesRaw as unknown as {
  features: Feature<Polygon | MultiPolygon, { GEOID: string; NAME: string }>[];
};

export type Coverage = "chapel-hill" | "nc" | "outside";

export function coverageAt(lng: number, lat: number): Coverage {
  const p = point([lng, lat]);
  if (booleanPointInPolygon(p, boundary)) return "chapel-hill";
  if (ncState.features.some((f) => booleanPointInPolygon(p, f))) return "nc";
  return "outside";
}

export function countyAt(lng: number, lat: number) {
  const p = point([lng, lat]);
  return counties.features.find((f) => booleanPointInPolygon(p, f)) ?? null;
}

export function ring(lng: number, lat: number, radiusM: number) {
  return circle([lng, lat], radiusM / 1000, { steps: 96, units: "kilometers" });
}

export function distanceM(a: [number, number], b: [number, number]) {
  return distance(a, b, { units: "kilometers" }) * 1000;
}

export interface Evidence {
  coverage: Coverage;
  countyName: string | null;
  method: "tracts" | "county-average" | "county" | "none";
  countyGeoid?: string | null;
  people: number | null;
  households: number | null;
  noVehicleShare: number | null;
  povertyRate: number | null;
  snapShare: number | null;
  ringCrossesTown: boolean;
  servicesInRing: (Resource & { distanceM: number })[];
  tractsInRing: { geoid: string; name: string; share: number; people: number }[];
}

function safeIntersect(a: Feature<Polygon | MultiPolygon>, b: Feature<Polygon | MultiPolygon>) {
  try {
    return intersect(featureCollection([a, b]));
  } catch {
    return null;
  }
}

export function evidenceAt(lng: number, lat: number, radiusM: number): Evidence {
  const coverage = coverageAt(lng, lat);
  const r = ring(lng, lat, radiusM);
  const ringArea = area(r);
  const county = coverage === "outside" ? null : countyAt(lng, lat);
  const servicesInRing = resources
    .map((s) => ({ ...s, distanceM: distanceM([lng, lat], [s.lng, s.lat]) }))
    .filter((s) => s.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM);

  const base: Evidence = {
    coverage,
    countyName: county?.properties.NAME ?? null,
    method: "none",
    people: null,
    households: null,
    noVehicleShare: null,
    povertyRate: null,
    snapShare: null,
    ringCrossesTown: false,
    servicesInRing,
    tractsInRing: [],
  };
  if (coverage === "outside") return base;

  if (coverage === "chapel-hill") {
    let people = 0,
      hh = 0,
      noVeh = 0,
      vehU = 0,
      pov = 0,
      povU = 0;
    const list: Evidence["tractsInRing"] = [];
    for (const t of tracts.features) {
      const inter = safeIntersect(t, r);
      if (!inter) continue;
      const share = area(inter) / area(t);
      if (share < 1e-4) continue;
      const tp = t.properties;
      people += tp.population * share;
      hh += tp.households * share;
      noVeh += tp.noVehicleHouseholds * share;
      vehU += tp.vehicleUniverse * share;
      pov += tp.povertyCount * share;
      povU += tp.povertyUniverse * share;
      list.push({ geoid: tp.geoid, name: tp.name, share, people: tp.population * share });
    }
    const inside = safeIntersect(boundary, r);
    const insideArea = inside ? area(inside) : 0;
    const acs = county ? countyAcs[county.properties.GEOID] : undefined;
    return {
      ...base,
      method: "tracts",
      people,
      households: hh,
      noVehicleShare: vehU > 0 ? noVeh / vehU : null,
      povertyRate: povU > 0 ? pov / povU : null,
      snapShare: acs?.snapHouseholds != null && acs.snapUniverse ? acs.snapHouseholds / acs.snapUniverse : null,
      ringCrossesTown: insideArea < ringArea * 0.99,
      tractsInRing: list.sort((a, b) => b.people - a.people),
    };
  }

  // Rest of North Carolina: county-average density (coarse estimate).
  const acs = county ? countyAcs[county.properties.GEOID] : undefined;
  if (!county || !acs || acs.population == null) return base;
  const inter = safeIntersect(county, r);
  const share = inter ? area(inter) / area(county) : 0;
  return {
    ...base,
    method: "county-average",
    people: acs.population * share,
    households: acs.households != null ? acs.households * share : null,
    noVehicleShare: acs.noVehicle != null && acs.vehicleUniverse ? acs.noVehicle / acs.vehicleUniverse : null,
    povertyRate: acs.belowPoverty != null && acs.povertyUniverse ? acs.belowPoverty / acs.povertyUniverse : null,
    snapShare: acs.snapHouseholds != null && acs.snapUniverse ? acs.snapHouseholds / acs.snapUniverse : null,
  };
}

// Local tangent-plane projection, meters from an origin (east = +x, north = -z in three.js).
export function makeProjector(originLng: number, originLat: number) {
  const R = 6371008.8;
  const k = Math.cos((originLat * Math.PI) / 180);
  return (lng: number, lat: number): [number, number] => [
    ((lng - originLng) * Math.PI * R * k) / 180,
    ((lat - originLat) * Math.PI * R) / 180,
  ];
}

export { difference };

// Whole-county service area: every number is the county's own Census ACS total (sourced, not scaled).
export function evidenceForCounty(geoid: string, lng: number, lat: number): Evidence {
  const f = counties.features.find((c) => c.properties.GEOID === geoid) ?? null;
  const acs = countyAcs[geoid];
  const name = f?.properties.NAME ?? acs?.name?.replace(/ County$/, "") ?? null;
  const servicesInRing = resources
    .filter((s) => (s.county ?? "").replace(/ County$/, "") === name)
    .map((s) => ({ ...s, distanceM: distanceM([lng, lat], [s.lng, s.lat]) }))
    .sort((a, b) => a.distanceM - b.distanceM);
  return {
    coverage: "nc",
    countyName: name,
    countyGeoid: geoid,
    method: "county",
    people: acs?.population ?? null,
    households: acs?.households ?? null,
    noVehicleShare: acs?.noVehicle != null && acs.vehicleUniverse ? acs.noVehicle / acs.vehicleUniverse : null,
    povertyRate: acs?.belowPoverty != null && acs.povertyUniverse ? acs.belowPoverty / acs.povertyUniverse : null,
    snapShare: acs?.snapHouseholds != null && acs.snapUniverse ? acs.snapHouseholds / acs.snapUniverse : null,
    ringCrossesTown: false,
    servicesInRing,
    tractsInRing: [],
  };
}
