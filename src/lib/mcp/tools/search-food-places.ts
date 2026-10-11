import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { norm, resources, toPlaceJson } from "../shared";

const M_PER_MI = 1609.344;
function meters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(bLat - aLat) / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(r(bLng - aLng) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

export default defineTool({
  name: "search_food_places",
  title: "Search food help places",
  description:
    "Find North Carolina food pantries, church ministries, meal sites, food banks, SNAP and WIC offices by text, county, type, or distance from a point.",
  inputSchema: {
    query: z.string().optional().describe("Words to match in name or address, e.g. 'baptist durham' or '27516'."),
    county: z.string().optional().describe("NC county name, e.g. 'Orange'."),
    category: z.enum(["pantry", "ministry", "snap-office", "food-bank", "wic-office", "meal-site"]).optional(),
    lat: z.number().optional().describe("Latitude to sort by distance from."),
    lng: z.number().optional().describe("Longitude to sort by distance from."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ query, county, category, lat, lng, limit }) => {
    const words = (query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
    let list = resources.filter((r) => {
      if (category && r.category !== category) return false;
      if (county && norm(r.county ?? "") !== norm(county)) return false;
      const hay = `${r.name} ${r.address} ${r.county ?? ""}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
    const hasPoint = lat != null && lng != null;
    const withDist = list.map((r) => ({ r, m: hasPoint ? meters(lat, lng, r.lat, r.lng) : null }));
    if (hasPoint) withDist.sort((a, b) => (a.m ?? 0) - (b.m ?? 0));
    const out = withDist.slice(0, limit ?? 10).map(({ r, m }) => ({
      ...toPlaceJson(r),
      miles: m == null ? null : Math.round((m / M_PER_MI) * 10) / 10,
    }));
    list = [];
    const text = out.length
      ? out.map((p) => `${p.name} (${p.type}) — ${p.address}${p.miles != null ? `, ${p.miles} mi` : ""}; hours: ${p.hours}; phone: ${p.phone}`).join("\n")
      : "No matching food help places found.";
    return { content: [{ type: "text", text }], structuredContent: { total: withDist.length, places: out } };
  },
});
