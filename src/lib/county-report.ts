import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { countyAcs, countyAccess } from "./data";

export interface CountyRow {
  geoid: string;
  name: string;
  population: number | null;
  povertyRate: number | null;
  noCarRate: number | null;
  places: number;
  per10k: number | null;
}

export const countyRows: CountyRow[] = Object.entries(countyAcs)
  .map(([geoid, c]) => ({
    geoid,
    name: c.name.replace(/ County$/, ""),
    population: c.population ?? null,
    povertyRate: c.belowPoverty != null && c.povertyUniverse ? c.belowPoverty / c.povertyUniverse : null,
    noCarRate: c.noVehicle != null && c.vehicleUniverse ? c.noVehicle / c.vehicleUniverse : null,
    places: countyAccess[geoid]?.count ?? 0,
    per10k: countyAccess[geoid]?.per10k ?? null,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const pct = (v: number | null) => (v == null ? "Unavailable" : `${(v * 100).toFixed(1)}%`);
const num = (v: number | null) => (v == null ? "Unavailable" : v.toLocaleString("en-US"));

export async function buildCountyReport(rows: CountyRow[]) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.07, 0.23, 0.2);
  const soft = rgb(0.4, 0.47, 0.44);
  const cols = [50, 170, 260, 340, 420, 490];
  const heads = ["County", "People", "Poverty", "No car", "Food places", "Per 10k"];
  let page = doc.addPage([612, 792]);
  let y = 742;
  const header = (first: boolean) => {
    if (first) {
      page.drawText("PantryHelp - North Carolina county report", { x: 50, y, size: 16, font: bold, color: ink });
      y -= 18;
      page.drawText(`Census ACS 2019-2023 5-year estimates; food places from the PantryHelp source list. Generated ${new Date().toLocaleDateString("en-US")}.`, { x: 50, y, size: 8, font, color: soft });
      y -= 22;
    }
    heads.forEach((h, i) => page.drawText(h, { x: cols[i], y, size: 9, font: bold, color: ink }));
    y -= 6;
    page.drawLine({ start: { x: 50, y }, end: { x: 562, y }, thickness: 0.6, color: ink });
    y -= 13;
  };
  header(true);
  rows.forEach((r, i) => {
    if (y < 50) {
      page = doc.addPage([612, 792]);
      y = 742;
      header(false);
    }
    if (i % 2 === 0) page.drawRectangle({ x: 46, y: y - 3, width: 520, height: 13, color: rgb(0.95, 0.97, 0.93) });
    const cells = [r.name, num(r.population), pct(r.povertyRate), pct(r.noCarRate), String(r.places), r.per10k == null ? "Unavailable" : r.per10k.toFixed(1)];
    cells.forEach((c, j) => page.drawText(c, { x: cols[j], y, size: 9, font, color: ink }));
    y -= 13;
  });
  y -= 10;
  if (y < 60) {
    page = doc.addPage([612, 792]);
    y = 742;
  }
  page.drawText("Food places counts only include places in our sources; real totals may be higher. Missing figures show Unavailable.", { x: 50, y, size: 8, font, color: soft });
  return doc.save();
}
