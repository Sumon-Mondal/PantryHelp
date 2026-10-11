# Full Chapel Hill in 3D

Today the detailed 3D (real buildings, streets, parks) only covers roughly a 2 km area around UNC campus. Extend it to the whole Town of Chapel Hill (plus Carrboro, which is joined to it), so you can fly anywhere in town and see it the same way.

## What you'll see
- Every building, street, park and wooded area across all of Chapel Hill and Carrboro, from OpenStreetMap.
- The Chapel Hill town line drawn on the ground, so it's clear where town ends.
- A "Chapel Hill" view button that frames the whole town; "UNC" keeps the close campus view.
- Detail stays sharp near the camera and simplifies far away so it stays smooth.
- Same on the home page's last scene, which can now pull back to show the whole town.

## Steps
1. Download OSM data for the Chapel Hill + Carrboro town limits (bounding box about 35.86–35.97 N, 79.12–78.98 W): buildings, roads, green areas, plus the official town boundary.
2. Split it into map tiles (about 1 km squares) stored as static files, so only nearby tiles load in full detail.
3. Update the 3D city to build each tile's buildings/roads/green as merged shapes (few draw calls per tile), show near tiles in full detail, distant tiles as simple shapes, and hide them when you zoom out to all of NC.
4. Raise the "far away" switch so the whole town stays in city view; add the town outline and the "Chapel Hill" camera view.
5. Check in the browser: campus, downtown Franklin St, Carrboro, and the whole-town view; confirm it stays responsive.

## Technical details
- Overpass extract → script that tiles into src/data/chapel-hill-tiles/*.json (heights from OSM tags, else typical by type, as now), loaded via dynamic import per tile.
- City.tsx: tile manager with LOD (full geometry < ~2.5 km from camera target, footprint-only boxes beyond); far threshold raised ~60 → ~120 units in Map3D.
- Expected size ~15–25k buildings; if too heavy, distant tiles drop buildings under a small footprint.
