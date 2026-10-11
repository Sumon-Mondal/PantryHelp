# Five follow-ups: more food banks, 3D panel check, neighborhoods, drive links, planner meals

## 1. Pantries from the other 5 regional food banks
Food banks: Second Harvest Metrolina (Charlotte), MANNA FoodBank (Asheville), Food Bank of the Albemarle, Second Harvest of Southeast NC (Fayetteville), Inter-Faith Food Shuttle (Raleigh).
- Try each food bank's public site again: partner agency lists, store-locator data the page itself loads, and published PDF lists.
- Place each address on the map with the free U.S. Census address finder, then add them to the street map, 3D map, List, search and county panels.
- Any food bank whose list needs a login or forbids copying is left out and named in the reply. Nothing gets made up.

## 2. Check the 3D map panel
- In the browser, click a pantry building on the 3D map and confirm the blue "3D map" panel opens on the right. Drag it, reopen it, and confirm it keeps its own spot, separate from the street map panel. Fix anything that's wrong.

## 3. Chapel Hill neighborhoods (Census block groups)
- I can't sign up for the Census key myself: it's emailed to a person. You request it at api.census.gov/data/key_signup.html (free, about a minute) and paste it here; I'll store it as a private setting.
- Once it's in: download Chapel Hill block groups (boundaries + population, poverty, households without a car), draw them on both maps, count the pin's 1,200 m circle from them, and add a "Neighborhoods" section to the Orange County panel and a neighborhood panel when you click one.
- Until the key arrives, this step stays open and everything else ships.

## 4. Drive to each pantry from the 3D map
- Clicking a 3D building opens its panel (as now) with a clear "Drive here" button that opens Google Maps directions to its exact spot. The hover label on each building also gets a small "Drive" link.
- These are ordinary Google Maps links, so no Google account or setup is needed.

## 5. Meals calculator on the planner
- A new "Feed a family" card on the planner page: adults, children, meals per day, days → meals needed.
- Below it: food places in the county under your pin (or your location if shared), sorted by distance, each with hours, phone and "Drive here".
- Whether a pantry "covers" a family stays "Unavailable". No source publishes how much food each one gives out, so it will say so instead of guessing. The full Meals page stays as it is.

## Technical details
- New food bank rows merge into src/data/nc-local.json with their sourceId + nc-sources.json entries; geocoding is Census onelineaddress, and unplaced rows are counted and reported.
- Census key: secrets--add_secret `CENSUS_API_KEY`; a one-time fetch script writes src/data/chapel-hill-blockgroups.json (ACS 5-year B01003, B17001, B25044 + TIGER geometry); geo.ts coverage uses block groups when present.
- Drive link: `https://www.google.com/maps/dir/?api=1&destination=lat,lng`, shared helper used by the panel, 3D label and calculator.
- Meals logic: extract from routes/meals.tsx into src/lib/meals.ts and reuse it in a new planner/MealsCard.tsx.
