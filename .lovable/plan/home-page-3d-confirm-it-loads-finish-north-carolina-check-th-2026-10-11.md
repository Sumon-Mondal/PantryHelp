# Home page 3D: confirm it loads, finish North Carolina, check the 3D pantry panel

## 1. Confirm the home page 3D loads
- Reload the home page in the test browser, scroll through all five scenes and screenshot each.
- Check the error log is clean (the earlier crash fix). Fix anything still broken before moving on.

## 2. Remove the "white boxes behind the table"
- The town buildings and county shapes sit below the table and currently show through during the first scenes.
- Hide the town and state layers until the camera starts rising off the table, and fade them in instead of popping.
- Give town buildings proper colors (warm brick, stone, roof tones by building type) instead of pale white, so they never read as blank boxes.

## 3. Finish the whole-North-Carolina 3D model
- Real terrain feel: a base slab under the state with a beveled edge and a soft shadow, so NC reads as a finished physical model.
- Counties: rise by population, shaded green by food help per resident (existing data), with thin light outlines between counties and slight gaps so each one is distinct.
- Labels for major cities (Charlotte, Raleigh, Greensboro, Durham, Wilmington, Asheville, Chapel Hill) as small floating tags.
- Food places as small glowing pins colored by type, plus the ocean and neighboring states as a muted surround so the state doesn't float in empty space.
- Gentle slow orbit at the final scene; color legend in the page text.
- Same improvements carried to the 3D map's "North Carolina" view.

## 4. Check the 3D pantry click
- Open the planner, switch to the 3D map, click a pantry pin/building (pinning the camera so the click lands), and confirm the blue "3D map" panel opens on the right.
- Drag it, reload, confirm it stays in its own spot separate from the street map panel. Fix if it doesn't.

## Technical details
- StoryScene: gate StateLayer visibility on progress (> ~0.35) with an opacity ramp; Tracts/CityTiles currently mount from the start.
- City.tsx: per-type vertex colors in the merged building geometry.
- New three/StateModel.tsx: base slab (extruded NC outline from county union), county edge lines (merged LineSegments), city labels via drei Text (not Html, to avoid a separate React root), muted surround plane.
- Verify with the skill's verify.py screenshots at each scroll stop; Playwright for the 3D click using a fixed camera and projected pin coordinates.
