# Upcoming work: smooth home page, snack table, and the full update list

## 1. Home page: smooth transitions and colors (first)
- Scroll moves the camera along one eased path, with no jumps between scenes.
- The sky color blends gradually from scene to scene: warm morning paper at the tables, clear sky blue over campus, soft aqua-green over North Carolina.
- Text cards fade and slide in gently. Town and state fade in, and the tables fade out.
- Side scene dots (Produce, Juice and snacks, Campus, Chapel Hill, North Carolina) jump to any scene smoothly.
- Reduced-motion users get the same color story without movement.

## 2. Second table: snacks with the juice bottles
- Keep the juice bottles. Add realistic snacks on the same tray and table:
  - granola bars in wrappers
  - crackers and a cereal box
  - a peanut butter jar
  - canned soup
  - a paper bag of apples
  - a small bowl of trail mix
- Labels use simple, brand-free artwork. Snacks drop in with the same soft bounce as the fruit.
- The scene copy reads "Juice and shelf-stable snacks"; this is an illustration, not data.

## 3. Hero quick-start and stats ticker
- A county picker in the opening screen jumps straight to that county in the planner.
- A stats strip uses only sourced numbers: places on the map, 100 counties, NC population, and SNAP offices. The food-insecurity figure appears only if an official source is cited.

## 4. Maps
- Planner 3D gets the home page's lighting, county shapes, backdrop and sky.
- A "Need" color mode shades counties by poverty compared with food places per resident.
- Chapel Hill Transit bus stops (official GTFS feed) show near pantries.
- Neighborhood tracts are added once the Census key works (blocked on you).

## 5. Data and pantry details
- Another slow pass for opening hours on the remaining ~500 places.
- One more try at Second Harvest of Southeast NC.
- Service filters (hot meals, baby items, pet food, bilingual) appear only where a source lists them. They are hidden otherwise.

## 6. Sharing
- A QR code and a copy-link button for saved plans.
- A one-page printable pocket sheet for a pantry: name, address, hours, phone and directions.
- Volunteer and donation info shows only when sourced. Text-message sending is skipped, because it needs a paid SMS service.

## Technical details
- StoryScene: one CatmullRom camera curve sampled by a damped progress value (`Math.exp(-k*dt)`). The background is a gradient sky shader whose colors lerp through palette keyframes, with fog color synced to it.
- New `landing/Snacks.tsx`: procedural boxes, cylinders and lathe jars with canvas-texture labels, merged where possible to stay under 100 draw calls.
- Scene dots: a DOM overlay that scrolls to `#act-XX` with smooth behavior.
- Ticker numbers come from data.ts. The QR code uses the `qrcode` package.
- Each step is verified with screenshots at every scroll stop.
