# One map with a 2D / 3D toggle

## What you'll see
- The planner shows one big map, full width, in place of the two side-by-side maps.
- A small "2D | 3D" switch sits in the map's top-right corner, like Apple Maps or Google Earth. 2D is the street map and is shown first. 3D shows the Chapel Hill buildings and the North Carolina counties.
- When you switch, the map stays on the same spot: your pin, the selected pantry or county, and the details panel all stay.
- There's one details panel on the right, the same for both views. The separate green "Street map" panel on the left goes away.
- The "Maps / List" buttons stay. List swaps the map for the list.
- On phones, the extra "Flat map / 3D" buttons are removed because the corner switch does the same job.
- If a device can't show 3D, or reduced motion is on, the 3D side of the switch is greyed out with a short note. The street map keeps working.
- The app remembers your last choice (2D or 3D).

## Steps
1. Replace the two-map grid on the planner with one map area (about 70% of the screen height) and add the corner switch.
2. Load the 3D view only the first time someone switches to it, so the page stays fast.
3. Keep the pin, selection and county shared between the views. The view you switch to flies to the current selection.
4. Make the details panel always open on the right with one saved spot, and drop the left/right split.
5. Check in the browser: switch back and forth, click a county and a pantry in each view, and use the List.

## Technical details
- In plan.tsx, `view: "2d" | "3d"` is stored in localStorage and read in useEffect. Both views stay mounted after their first load and are hidden with CSS, so switching doesn't reload the maps. MapLibre calls `map.resize()` when it becomes visible again.
- The toggle is a segmented control with aria-pressed, absolutely positioned in the top-right of the map container.
- DetailsPanel ignores `pickFrom` for its position and tint, and uses a single localStorage key, `ph-panel-pos`. `pickFrom` stays in the store but no longer drives the layout.
- The WebGL / reduced-motion check moves into the toggle so 3D can be disabled there.
