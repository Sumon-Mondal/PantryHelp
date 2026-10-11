// Browser-safe typed access to the stored, sourced datasets.
import manifestRaw from "@/data/manifest.json";
import boundaryRaw from "@/data/boundary.json";
import tractsRaw from "@/data/tracts.json";
import servicesRaw from "@/data/services.json";
import stateRaw from "@/data/state.json";
import stateSummaryRaw from "@/data/state-summary.json";
import ncLocalRaw from "@/data/nc-local.json";
import ncMetrolinaRaw from "@/data/nc-metrolina.json";
import hoursRaw from "@/data/hours.json";
import ncViveryRaw from "@/data/nc-vivery.json";
import ncResourcesRaw from "@/data/nc-resources.json";
import countyAcsRaw from "@/data/county-acs.json";
import ncSourcesRaw from "@/data/nc-sources.json";
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Point } from "geojson";

export type Category = "pantry" | "ministry" | "snap-office" | "food-bank" | "wic-office" | "meal-site";

export const CATEGORY_LABEL: Record<Category, string> = {
  pantry: "Food pantry",
  ministry: "Church / ministry",
  "snap-office": "SNAP (Food & Nutrition Services) office",
  "food-bank": "Regional food bank",
  "wic-office": "WIC office",
  "meal-site": "Meal site",
};

export interface Resource {
  id: string;
  name: string;
  address: string;
  category: Category;
  lng: number;
  lat: number;
  phone: string | null;
  publishedHours: string | null;
  program: string | null;
  county: string | null;
  inChapelHill: boolean;
  sourceTitle: string;
  sourceUrl: string;
  hoursSourceUrl?: string;
}

export interface TractProps {
  geoid: string;
  name: string;
  population: number;
  households: number;
  povertyUniverse: number;
  povertyCount: number;
  vehicleUniverse: number;
  noVehicleHouseholds: number;
}

export interface CountyAcs {
  name: string;
  population?: number;
  households?: number;
  povertyUniverse?: number;
  belowPoverty?: number;
  vehicleUniverse?: number;
  noVehicle?: number;
  snapHouseholds?: number;
  snapUniverse?: number;
}

export interface SourceEntry {
  id: string;
  title: string;
  publisher: string;
  url: string;
  retrievedAt?: string;
  vintage?: string;
  notes?: string;
  label?: string;
}

type AnyManifest = {
  datasetVersion: string;
  defaultSite: { lng: number; lat: number; address: string; catchmentRadiusMeters: number };
  ungeocodedRosterRows: string[];
  countyEstimate: Record<string, unknown>;
  sources: {
    id: string;
    title: string;
    publisher: string;
    landingUrl?: string;
    downloadUrl?: string;
    retrievedAt?: string;
    dataVintage?: string;
    processing?: string;
    label?: string;
  }[];
};

export const manifest = manifestRaw as unknown as AnyManifest;
export const boundary = boundaryRaw as unknown as Feature<MultiPolygon | Polygon>;
export const tracts = tractsRaw as unknown as FeatureCollection<Polygon | MultiPolygon, TractProps>;
export const ncState = stateRaw as unknown as FeatureCollection<Polygon | MultiPolygon>;
export const stateSummary = stateSummaryRaw as {
  people: number;
  households: number;
  householdsWithoutVehicle: number;
  povertyUniverse: number;
  belowPoverty: number;
  listedServicesNote: string;
};
export const countyAcs = countyAcsRaw as unknown as Record<string, CountyAcs>;

const MINISTRY = /church|ministr|chapel|mission|temple|mosque|synagogue|congregation|tabernacle|baptist|methodist|holy|AME\b/i;

const orange: Resource[] = (servicesRaw as unknown as FeatureCollection<Point, Record<string, unknown>>).features.map((f) => {
  const p = f.properties as Record<string, string | boolean | null>;
  const name = String(p.name);
  const program = (p.program as string) ?? null;
  return {
    id: `oc-${p.id}`,
    name,
    address: String(p.address),
    category: MINISTRY.test(name) ? "ministry" : /meal|kitchen/i.test(program ?? "") ? "meal-site" : "pantry",
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
    phone: (p.phone as string) || null,
    publishedHours: (p.publishedHours as string) || null,
    program,
    county: "Orange",
    inChapelHill: Boolean(p.insideCoverage),
    sourceTitle: "Orange County NC Food Resource List (N.C. Cooperative Extension)",
    sourceUrl: String(p.sourceUrl),
  };
});

const SOURCE_TITLE: Record<string, string> = {
  "fbcenc-foodfinder": "Food Bank of Central & Eastern NC Food Finder",
  "shfb-nwnc": "Second Harvest Food Bank of Northwest NC agency locator",
  "ncdhhs-wic-directory": "NC DHHS WIC Local Agency Directory",
  ifs: "Inter-Faith Food Shuttle Find Food maps",
  "manna-findfood": "MANNA FoodBank Find Food locator",
  "fba-findfood": "Food Bank of the Albemarle Food Locator",
  "shm-findfood": "Second Harvest Food Bank of Metrolina Find Food Near Me",
};

const statewide: Resource[] = [
  ...((ncResourcesRaw as unknown as FeatureCollection<Point, Record<string, unknown>>).features ?? []),
  ...((ncLocalRaw as unknown as FeatureCollection<Point, Record<string, unknown>>).features ?? []),
  ...((ncMetrolinaRaw as unknown as FeatureCollection<Point, Record<string, unknown>>).features ?? []),
  ...((ncViveryRaw as unknown as FeatureCollection<Point, Record<string, unknown>>).features ?? []),
]
  .filter((f) => f.geometry && Array.isArray(f.geometry.coordinates))
  .map((f, i) => {
    const p = f.properties as Record<string, string | null>;
    const cat = (p.category as Category) ?? "pantry";
    return {
      id: `nc-${p.id ?? i}`,
      name: String(p.name),
      address: [p.address, p.city].filter(Boolean).join(", "),
      category: cat,
      lng: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
      phone: p.phone ?? null,
      publishedHours: p.publishedHours ?? null,
      program: null,
      county: p.county ?? null,
      inChapelHill: false,
      sourceTitle: p.sourceTitle ?? SOURCE_TITLE[p.sourceId ?? ""] ?? p.sourceId ?? "Statewide source",
      sourceUrl: p.sourceUrl ?? "",
    };
  });

// Hours read from each place's own web page (Firecrawl, build-time). Only fills places that had none.
const scrapedHours = hoursRaw as Record<string, { hours: string; sourceUrl: string; checkedAt: string }>;
export const resources: Resource[] = [...orange, ...statewide].map((r) =>
  !r.publishedHours && scrapedHours[r.id] ? { ...r, publishedHours: scrapedHours[r.id].hours, hoursSourceUrl: scrapedHours[r.id].sourceUrl } : r,
);

export const ungeocoded = manifest.ungeocodedRosterRows;

export const sources: SourceEntry[] = [
  ...manifest.sources.map((s) => ({
    id: s.id,
    title: s.title,
    publisher: s.publisher,
    url: s.landingUrl ?? s.downloadUrl ?? "",
    retrievedAt: s.retrievedAt,
    vintage: s.dataVintage,
    notes: s.processing,
    label: s.label,
  })),
  ...(ncSourcesRaw as unknown as SourceEntry[]),
];

export const DEFAULT_SITE = {
  lng: manifest.defaultSite.lng,
  lat: manifest.defaultSite.lat,
  radiusM: manifest.defaultSite.catchmentRadiusMeters,
  label: "Fetzer Hall, 210 South Rd",
};

export const DATASET_VERSION = manifest.datasetVersion;

// Food help places (pantries, ministries, meal sites, SNAP/WIC offices, food banks) per 10,000 residents, by county GEOID.
// Counts only what our sources list; a low count can mean missing data, not missing help.
export const countyAccess: Record<string, { count: number; per10k: number | null }> = (() => {
  const byName: Record<string, number> = {};
  for (const r of resources) if (r.county) byName[r.county.replace(/ County$/, "")] = (byName[r.county.replace(/ County$/, "")] ?? 0) + 1;
  const out: Record<string, { count: number; per10k: number | null }> = {};
  for (const [geoid, c] of Object.entries(countyAcs)) {
    const name = c.name.replace(/ County$/, "");
    const count = byName[name] ?? 0;
    out[geoid] = { count, per10k: c.population ? (count / c.population) * 10000 : null };
  }
  return out;
})();
export const ACCESS_MAX = Math.max(...Object.values(countyAccess).map((a) => a.per10k ?? 0));
