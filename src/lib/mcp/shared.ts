import { CATEGORY_LABEL, countyAcs, countyAccess, resources, type Resource } from "@/lib/data";
import { driveUrl } from "@/lib/meals";

export const norm = (s: string) => s.toLowerCase().replace(/\s+county$/i, "").trim();

export function findCounty(name: string) {
  const n = norm(name);
  const entry = Object.entries(countyAcs).find(([fips, c]) => fips === name || norm(c.name) === n);
  return entry ? { fips: entry[0], acs: entry[1] } : null;
}

export const toPlaceJson = (r: Resource) => ({
  id: r.id,
  name: r.name,
  type: CATEGORY_LABEL[r.category],
  address: r.address,
  county: r.county ?? "Unavailable",
  phone: r.phone ?? "Unavailable",
  hours: r.publishedHours ?? "Unavailable",
  lat: r.lat,
  lng: r.lng,
  directions: driveUrl(r.lat, r.lng),
  source: r.sourceTitle,
});

export const pct = (a?: number, b?: number) =>
  a == null || !b ? "Unavailable" : `${((a / b) * 100).toFixed(1)}%`;

export { resources, countyAccess };
