# Five follow-ups: planner NC 3D, neighborhoods, location check, opening hours, Metrolina

## 1. Full North Carolina in the planner's 3D view
- When you zoom out in 3D, the planner shows the same North Carolina scene as the home page: counties rising by population, the same green shades, a soft blue background and a dot for every food place.
- Each building and food place you click in 3D gets a "Drive here" Google Maps link. Plain buildings with no food help get a Google Maps "Open in Maps" link to their spot.

## 2. Chapel Hill neighborhoods (needs your Census key)
- I can't get the key myself, because the Census Bureau emails it to you. Request it free at api.census.gov/data/key_signup.html. Once you have it, I'll open a secure box so you can paste it in.
- With the key, I'll download the Census numbers for the neighborhood areas (block groups) in Chapel Hill and Carrboro: people, poverty rate and households without a car.
- The Orange County panel gets a "Chapel Hill neighborhoods" section. The 2D map can shade neighborhoods, and clicking one shows its numbers. Anything missing shows "Unavailable".

## 3. "Show my location" check
- In my test browser I'll pretend to be at UNC, click "Show my location" and confirm that pantries, churches and food banks are listed nearest first with Drive and Call buttons.
- Your real browser's location prompt can't be tested from my side. I'll fix anything that doesn't work.

## 4. Opening hours from pantries' websites
- None of the about 1,180 food places I have today comes with a website, so first I need to find each one's site.
- I'll use web search and page reading (Firecrawl), which needs a one-time connection that you approve. For each place I'll find its official site or Facebook page and read the hours from it.
- I'll only keep hours that are clearly written on the place's own page, with that page's link shown as the source. Everything else stays "hours unavailable — call before visiting". I won't guess.
- I'll start with Orange County and nearby counties, then go statewide as far as usage limits allow, and tell you how many got hours.

## 5. Second Harvest Metrolina
- I'll process their city-by-city lists, place each address on the map with the free U.S. Census address lookup, and add the places to both maps, the List, search and the county panels with Metrolina named as the source.
- Places that can't be placed on the map get counted and reported.

## Order
I'll do 5, 1, 3, then 4. Item 2 waits for your key.

## Technical details
- `Map3D`: the far-view state layer reuses StoryScene's state pieces (county extrusion, ramp, Surround, ResourcePins). Shared parts move into `src/components/three/State.tsx` so both scenes import one module. The building hover label gets `mapsUrl(lat, lng)` (google.com/maps/search/?api=1&query=), and resource hits keep `driveUrl`.
- Census: secret `CENSUS_API_KEY`. A one-off script fetches ACS 5-year B01003, B17001 and B25044 for the Orange County block groups, plus TIGER block group shapes, into `src/data/block-groups.json`, read through `data.ts`. No runtime calls.
- Hours: a one-off offline script, with results saved to `src/data/hours.json` (`{id, hours, sourceUrl, checkedAt}`) and merged in `data.ts`. The Firecrawl connector is used for the build-time scraping only, and the app doesn't call it at runtime. Accept hours only from pages whose name or address matches the place.
- Metrolina: records go into `nc-local.json` with the existing shape and a SOURCE_TITLE entry, and the source is listed in `nc-sources.json`.
- Location check: Playwright with `geolocation` permission granted and set to Fetzer Hall coordinates.
