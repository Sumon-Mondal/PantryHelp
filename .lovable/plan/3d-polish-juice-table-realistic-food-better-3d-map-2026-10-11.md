# 3D polish: juice table, realistic food, better 3D map

## 1. Landing story: second table becomes a juice table
- Replace the cardboard boxes on the volunteer table with a row of realistic juice bottles. The lineup is orange, apple, cranberry, grape and green juice, in mixed shapes (tall glass bottles, rounded PET bottles, a small carton or two).
- Bottles look real:
  - Clear glass or plastic that bends light, with the colored juice inside at a fill line and a slight meniscus
  - Paper labels with simple original brand-free artwork and the fruit name
  - Screw caps with ridges, plus soft reflections and contact shadows on the table
- A wooden tray and a few loose fruits (oranges, apples) tie it back to the basket.
- Act 2 copy stays about volunteers preparing food. The bottles show "what gets packed," labeled as a conceptual illustration.

## 2. Make the fruit basket look real
- Use CC0 low-poly food models (Kenney / Quaternius / Poly Pizza) for apples, oranges, pears, bananas, lemons and a glass jar, if downloads succeed. Otherwise use improved hand-built shapes: stems, leaves, dimpled orange skin, and a two-tone apple blush.
- Crate gets proper corner posts, a closed bottom and a wood-grain texture, so it reads as a real crate instead of floating frames.
- Fruit drops in with a small settle bounce as you scroll (food arrives).

## 3. Landing 3D flow, done properly
- Smooth camera path: crate, then juice table, then rise into the sky, then look down on Chapel Hill.
- The tabletop fades out as the camera rises, so it no longer ghosts over the map.
- The town view adds a soft sky dome, gentle fog at the horizon, the Fetzer Hall storefront, the aqua glass ring, and small pantry buildings at their real positions.
- Framing that fits phones and desktops alike, and a still image for reduced motion.

## 4. Planner 3D map polish
- Ground: a subtle paper texture on North Carolina counties, county names on hover, and Orange County highlighted.
- Tracts: softer side color, population tops shaded from paper to leaf, thin outlines, and a hover card showing tract name and population. Numbers stay in the side panel.
- Buildings: nicer storefronts (awning, door, windows), a steeple only for named churches, a distinct look for food banks and SNAP offices, and a citrus highlight when selected. They size better at every zoom.
- Ring: a glowing aqua glass wall with a ground line and a label for the straight-line meters.
- Camera:
  - Smooth fly-to on selection from the list or the flat map
  - "Pin", "Chapel Hill" and "North Carolina" buttons
  - Dragging the storefront doesn't fight the camera
- Clear loading state, and a still poster if 3D isn't supported.

## 5. Flat map touch-ups
- Category legend (pantry, ministry, SNAP office, food bank, meal site), with clearer colors and a ring label.

## Technical details
- New `src/components/landing/JuiceTable.tsx` and `Produce.tsx`. Glass uses `meshPhysicalMaterial` (transmission, ior 1.45–1.5, thickness), an inner liquid mesh slightly smaller than the glass, and canvas-texture labels in sRGB. Bottle profiles come from `LatheGeometry`.
- CC0 GLBs go into `public/models/` only after `head -c 4` shows `glTF`; loaded with `useGLTF` inside Suspense, with procedural fallback.
- Story camera keyframes are tuned; table group opacity is driven by scroll progress; fog and a gradient sky shader replace the flat CSS sky in act 3.
- Map3D: an instanced or memoized building kit, a hover raycast for tracts, three-tier zoom-based sizing, and a sprite or Html label for the ring.
- Each step is verified with screenshots at every story stage and in the planner, staying within the performance budget (<100 draw calls where feasible, shadow map 2048).
