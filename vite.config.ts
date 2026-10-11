// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

// The dev-only devtools plugin adds data-tsd-source="..." to every JSX element.
// React Three Fiber treats dashed props as nested paths ("data.tsd-source") and crashes.
// Strip the attribute from any module that renders R3F scenes.
const stripTsdSourceFromR3F = {
  name: "strip-tsd-source-r3f",
  enforce: "pre" as const,
  transform(code: string, id: string) {
    if (id.includes("node_modules") || !/\.[jt]sx$/.test(id.split("?")[0])) return null;
    if (!code.includes("data-tsd-source")) return null;
    if (!/@react-three\/(fiber|drei)/.test(code)) return null;
    return { code: code.replace(/\s+data-tsd-source=(?:"[^"]*"|\{[^}]*\})/g, ""), map: null };
  },
};

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [stripTsdSourceFromR3F, mcpPlugin()],
  },
});
