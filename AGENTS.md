<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Sourced datasets live as static JSON in src/data and are read only through src/lib/data.ts — so every number keeps one provenance path.
- Simulation (src/lib/sim.ts) and geo math (src/lib/geo.ts) are pure TS shared by browser and server functions — so browser and server give identical results for one snapshot id.
- Browser-only map libraries (maplibre, three) load via React.lazy behind ClientOnly — SSR must never import them.
- tsconfig relaxes noUncheckedIndexedAccess / exactOptionalPropertyTypes / noPropertyAccessFromIndexSignature — GeoJSON-heavy code was unreadable under them.
- Live device location lives in src/lib/location.ts (external store, started only by a user click) — so permission is never requested on page load and every map shares one watch.
- Real-city 3D (src/components/three/City.tsx) reads static OSM extracts from src/data and builds merged geometries — one draw call per layer keeps thousands of buildings fast.
- Content inside drei <Html> renders in a separate React root, so pass planner data as props there, never via context.

- The app's MCP server is defined in src/lib/mcp/ (one tool per file, registered in index.ts) and exposes only public static data — so no caller identity or database access is involved.
