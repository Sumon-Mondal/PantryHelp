import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { PLAN_FIELDS, type RunResult, type OperatingPlan } from "./sim";
import type { Evidence } from "./geo";
import { sources } from "./data";

const ascii = (s: string) => s.replace(/[–—]/g, "-").replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[^\x20-\x7E]/g, "");

export async function buildReport(opts: { name: string; snapId: string; site: { lng: number; lat: number; radiusM: number }; plan: OperatingPlan; evidence: Evidence; results: RunResult[] | null }) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const green = rgb(0.07, 0.23, 0.2);
  let page = doc.addPage([612, 792]);
  let y = 750;
  const line = (t: string, o: { size?: number; b?: boolean; gap?: number } = {}) => {
    const size = o.size ?? 10;
    const words = ascii(t).split(" ");
    let cur = "";
    const f = o.b ? bold : font;
    const flush = () => {
      if (y < 50) {
        page = doc.addPage([612, 792]);
        y = 750;
      }
      page.drawText(cur, { x: 50, y, size, font: f, color: green });
      y -= size + 4;
      cur = "";
    };
    for (const w of words) {
      if (f.widthOfTextAtSize(cur + " " + w, size) > 510) flush();
      cur = cur ? cur + " " + w : w;
    }
    if (cur) flush();
    y -= o.gap ?? 0;
  };
  line("PantryHelp action report", { size: 20, b: true, gap: 4 });
  line(opts.name, { size: 13, b: true });
  line(`Snapshot ${opts.snapId} - generated ${new Date().toISOString().slice(0, 10)}`, { gap: 10 });

  line("Location", { size: 13, b: true });
  line(`Pin ${opts.site.lat.toFixed(6)}, ${opts.site.lng.toFixed(6)} - straight-line radius ${(opts.site.radiusM / 1609.344).toFixed(2)} mi (not travel time).`);
  const e = opts.evidence;
  line(`Coverage: ${e.coverage === "chapel-hill" ? "Chapel Hill (tract detail)" : e.coverage === "nc" ? `${e.countyName} County, NC (county average)` : "Outside NC - data unavailable"}`);
  line(`People in service area: ${e.people == null ? "Unavailable" : Math.round(e.people).toLocaleString()}`);
  line(`Listed services in service area: ${e.servicesInRing.length}`);
  line(`Households without a vehicle (estimated): ${e.noVehicleShare == null ? "Unavailable" : (e.noVehicleShare * 100).toFixed(1) + "%"}`, { gap: 10 });

  line("Operating plan (assumed unless you changed it)", { size: 13, b: true });
  for (const f of PLAN_FIELDS) {
    const v = opts.plan[f.key];
    line(`${f.label}: ${f.percent ? (v * 100).toFixed(1) + "%" : v} ${f.percent ? "" : f.unit}`);
  }
  y -= 10;
  line("28-day results (simulated)", { size: 13, b: true });
  if (!opts.results) line("Unavailable for this area.");
  else
    for (const r of opts.results)
      line(`${r.demand}: ${r.served} visits served, ${r.unmet} unmet, ${Math.round(r.discardedLb)} lb discarded, ${Math.round(r.overflowLb)} lb turned away, cost $${Math.round(r.cost)}, bottleneck ${r.bottleneck}.`);
  y -= 10;
  line("Limitations", { size: 13, b: true });
  for (const l of [
    "The radius is a straight-line distance, not travel time.",
    "Visits are not unique households. People in a radius are not measured demand.",
    "Pantry capacity, weekly pounds and volunteer counts of listed sites are unavailable.",
    "Outside Chapel Hill, population uses a county-average density and is coarse.",
    "Published hours are unverified.",
  ])
    line(`- ${l}`);
  y -= 10;
  line("Sources", { size: 13, b: true });
  for (const s of sources) line(`- ${s.title} - ${s.publisher}. ${s.url}`, { size: 8 });
  return doc.save();
}
