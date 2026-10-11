# PantryHelp: web app plan (Chapel Hill)

A web app that helps a community planner decide where a food pantry could open in Chapel Hill, NC, and what food, storage, volunteers, delivery and budget it needs. It follows the rebuild brief and the "Daylight Glass" design doc. The iOS app is left out. The old Baltimore code is used for reference only.

## What you'll get

1. **Landing page**: the headline "More food. Closer to home." over a sunlit 3D scene. You scroll from a crate of food, to volunteers, and then up onto the real Chapel Hill tracts and the ring. The "Explore a pantry plan" button works before the 3D finishes loading. There is a still image for reduced motion and for devices without 3D.
2. **Planner workspace**, opening at Fetzer Hall with a 1,200 m straight-line ring:
   - Left: a flat street map showing the town edge, census tracts, all 33 listed food resources, a pin you can drag, and the ring.
   - Right: a 3D Chapel Hill map. It is built from the same data at true positions, with tracts raised by population, small buildings for each site, and the proposed storefront you can drag.
   - A List mode that you can filter, sort and search, with arrow-key navigation. Picking a place in one view selects it in all three.
   - Inspector cards: people in the ring, listed services, and households without a vehicle. Statewide North Carolina figures sit in their own group. A warning appears when the ring crosses the town edge.
   - Operating plan editor with every control from the brief, plus units, defaults (labeled as assumptions) and a reset.
   - 28-day results for low, medium and high demand: visits served, unmet requests, discarded food, inventory, cost, the main bottleneck, and which resource change helps most. Results update live while you drag a slider.
3. **"Explain this result"**: an AI explanation of the exact current scenario, using only computed numbers. It is marked outdated once you change any input.
4. **Save and share** plans with a link, and **export a PDF report** with the inputs, results, sources and limitations.
5. **Sources page** listing the publisher, the data year and a link for every dataset.
6. Every number carries a label: Sourced, Estimated, Assumed, Simulated or Unavailable. Outside Orange County the app shows "Data unavailable for this area" instead of charts full of zeros.

## Build order (working core first)

1. Design system: colors, fonts, provenance labels, and the PantryHelp logo
2. Data: fetch the listed Chapel Hill and Census sources once and store them in the app, with a list recording where each came from
3. Simulation engine and its tests
4. Planner: flat map, list, inspector, plan editor, results
5. 3D Chapel Hill map
6. Landing scroll story
7. Saved plans, share links, and the PDF
8. AI explanation

## Technical details

- Stack: the project's TanStack Start and React 19 instead of Next.js, Tailwind v4, MapLibre GL with a free light basemap (no key needed) and OpenStreetMap attribution, React Three Fiber and drei for 3D, and Turf for the ring and area-weighting math.
- Data: a one-time script downloads the boundaries, tracts, ACS figures and resource list into static GeoJSON and JSON plus a manifest. Nothing is invented. If a figure couldn't be fetched, it shows as Unavailable.
- Simulation: plain TypeScript that runs in a Web Worker for live updates. Each day, expired food is removed first, then intake is received, then households are served first-expiring-first. The scenario snapshot is hashed so the browser and server give identical results.
- Backend: Lovable Cloud stores saved plans. Server functions re-check results and build the PDF with pdf-lib.
- AI: the Lovable AI Gateway (Gemini) replaces a direct Gemini key. Numbers come from tool results, and the app falls back to a labeled local explanation if the AI is unavailable.
- 3D: the client-only route has a fallback. It uses a local light setup (no CDN preset), keeps within the mobile performance budget, and respects reduced motion.
