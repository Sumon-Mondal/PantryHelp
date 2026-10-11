# Opening hours pass, minimal home page, launch prep

## 1. Fill in more opening hours
- List places that still have no hours (about 400 last round), skipping ones already checked with nothing found.
- Look each up slowly with the web reader: search name + address + city, read the best matching page, keep hours only if name and address match.
- Save as it goes; pause and resume if the reader turns requests away.
- New hours show everywhere hours already appear, each linking to its source page.
- Never guess. No match stays "Unavailable — call before visiting". Food bank published hours are never overwritten.

## 2. Minimal home page
Remove from the opening screen:
- The scene dots on the left side ("Produce", "Juice & snacks", "Campus", "Chapel Hill", "North Carolina").
- The "Plan where a pantry can help..." line.
- The "Jump to a county" picker.
- The row of number chips and the small top badge.

Keep: the "More food. Closer to home." headline, the "Explore a pantry plan" button, "See how it works", and the 3D scrolling story.

## 3. Ready to launch
- Check every page (home, planner, meals, food stamps, report, sources) loads with no errors on desktop and phone width.
- Give every page its own title and description for search and link previews.
- Fix any build warnings, broken links, or leftover test text.
- Run a security scan and fix anything serious.
- Then you press Publish (I'll show the button).

## Technical details
- Hours: Firecrawl (linked), 2 workers, ~2.5 s spacing, back off on 429; merge into `src/data/hours.json`; store "checked, none found" ids for later passes.
- Home: delete `SceneDots`, `CountyJump`, stat chips and badge from `src/routes/index.tsx`; drop unused imports.
- Launch: Playwright pass at 1280 and 390 widths, head() audit per route, `security--run_security_scan`, typecheck + vitest.
