# One movable details panel for counties and food places

## What you'll see
- A single floating panel that sits in a fixed spot (right side of the screen), off the maps, so it never covers what you're looking at. Grab its top bar to drag it anywhere; it remembers where you left it. Close with × or Esc.
- It opens and swaps smoothly (soft fade + slide), macOS style.
- **Click a county** (3D map when zoomed out to NC, or the flat street map): the panel shows that county:
  - Big headline number: people, with households under it.
  - Colored bars for poverty rate, households without a car, households on food stamps, each compared to the NC average.
  - Food help: count of places by type (pantries, churches, meal sites, SNAP office, WIC, food bank) with colored dots, and places per 10,000 people with a small green scale.
  - A short scrollable list of that county's places; clicking one opens it in the same panel.
  - "Fly here" button and the source line (Census ACS 2019–2023).
- **Click a food pantry / place** (either map or the List): the same panel switches to the place: type, name, address + distance, hours, phone, program, Directions / Call / How to apply buttons, and the source. A "Back to county" link appears if you came from a county.
- Missing numbers keep showing "Unavailable", never 0.

## Steps
1. Add "selected county" to the shared planner state, next to the selected place.
2. Build the panel (replaces the current bottom-right card and the floating county card in the 3D view), with county and place views.
3. Make counties clickable on the flat map too; 3D county clicks feed the panel instead of the in-scene card.
4. Dragging: pointer drag on the top bar, kept inside the window, position saved in the browser; on phones it becomes a bottom sheet instead.
5. Check in the browser: click a county, click a place, drag the panel, close/reopen.

## Technical details
- planner-store: `selectedCounty: string | null` (GEOID) + `selectCounty`; selecting a place keeps the county for "Back".
- New `src/components/planner/DetailsPanel.tsx` rendered once in plan.tsx (normal React tree, so no drei Html root issue); remove `CountyCard` Html and `PlaceCard`.
- NC averages computed in data.ts from county-acs totals; per-category counts from `resources` by county.
- FlatMap: click handler on `county-fill` layer (ignored when a resource marker is hit).
- Position stored in localStorage, read in useEffect (no hydration mismatch); `md:` breakpoint switches to bottom sheet below.
