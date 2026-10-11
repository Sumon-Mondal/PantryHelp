import { defineMcp } from "@lovable.dev/mcp-js";
import searchFoodPlaces from "./tools/search-food-places";
import getCountyStats from "./tools/get-county-stats";

export default defineMcp({
  name: "my-weapp-companion",
  title: "My Weapp Companion",
  version: "0.1.0",
  instructions:
    "Public PantryHelp data for North Carolina. Search food pantries, church ministries, meal sites, food banks, SNAP and WIC offices, and look up county food access stats from the Census. Missing figures are reported as 'Unavailable'. Distances are in miles.",
  tools: [searchFoodPlaces, getCountyStats],
});
