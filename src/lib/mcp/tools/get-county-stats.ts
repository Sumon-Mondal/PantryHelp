import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { countyAccess, findCounty, norm, pct, resources } from "../shared";

export default defineTool({
  name: "get_county_stats",
  title: "Get NC county food access stats",
  description:
    "Return Census ACS 2019–2023 population, poverty, car ownership and SNAP figures plus the count of food help places for one North Carolina county.",
  inputSchema: { county: z.string().min(1).describe("County name like 'Durham' or 5-digit FIPS like '37063'.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ county }) => {
    const found = findCounty(county);
    if (!found) throw new ToolError(`No North Carolina county matches "${county}".`);
    const { fips, acs } = found;
    const access = countyAccess[fips];
    const n = norm(acs.name);
    const byType: Record<string, number> = {};
    for (const r of resources) if (norm(r.county ?? "") === n) byType[r.category] = (byType[r.category] ?? 0) + 1;
    const stats = {
      fips,
      name: acs.name,
      population: acs.population ?? null,
      households: acs.households ?? null,
      povertyRate: pct(acs.belowPoverty, acs.povertyUniverse),
      householdsWithoutCar: pct(acs.noVehicle, acs.vehicleUniverse),
      householdsOnSnap: pct(acs.snapHouseholds, acs.snapUniverse),
      foodHelpPlaces: access?.count ?? 0,
      placesPer10k: access?.per10k ?? null,
      placesByType: byType,
      source: "U.S. Census Bureau ACS 2019–2023 5-year estimates",
    };
    const text = `${stats.name}: population ${stats.population ?? "Unavailable"}, poverty ${stats.povertyRate}, no car ${stats.householdsWithoutCar}, on SNAP ${stats.householdsOnSnap}, ${stats.foodHelpPlaces} food help places (${stats.placesPer10k?.toFixed(2) ?? "Unavailable"} per 10k).`;
    return { content: [{ type: "text", text }], structuredContent: { county: stats } };
  },
});
