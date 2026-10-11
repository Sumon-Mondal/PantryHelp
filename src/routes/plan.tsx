import { MealsCard } from "@/components/planner/MealsCard";
import { DetailsPanel } from "@/components/planner/DetailsPanel";
import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { z } from "zod";
import { Box, List, Map as MapIcon } from "lucide-react";
import { PlannerProvider, usePlanner } from "@/lib/planner-store";
import { SiteHeader } from "@/components/SiteHeader";
import { Inspector } from "@/components/planner/Inspector";
import { PlanEditor } from "@/components/planner/PlanEditor";
import { Results } from "@/components/planner/Results";
import { Explain } from "@/components/planner/Explain";
import { SaveBar } from "@/components/planner/SaveBar";
import { ResourceList } from "@/components/planner/ResourceList";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const FlatMap = lazy(() => import("@/components/planner/FlatMap"));
const Map3D = lazy(() => import("@/components/planner/Map3D"));

export const Route = createFileRoute("/plan")({
  validateSearch: z.object({ id: z.string().uuid().optional(), place: z.string().optional(), county: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Pantry planner — PantryHelp" },
      { name: "description", content: "Drop a pin in North Carolina, set a straight-line ring and test a 28-day food pantry plan." },
      { property: "og:title", content: "Pantry planner — PantryHelp" },
      { property: "og:description", content: "Map, 3D view and 28-day simulation for a proposed food pantry in North Carolina." },
    ],
  }),
  component: PlanPage,
});

function PlanPage() {
  return (
    <PlannerProvider>
      <Workspace />
    </PlannerProvider>
  );
}

const Fallback = ({ label }: { label: string }) => (
  <div className="flex h-full items-center justify-center bg-paper-deep text-sm text-evergreen-60">{label}</div>
);

function Workspace() {
  const { id, place, county } = Route.useSearch();
  const { replaceAll, select, selectCounty, selectedId } = usePlanner();
  useEffect(() => {
    if (county) selectCounty(county);
    if (place) {
      select(place);
      // re-select once the maps have loaded so they fly to it
      const t = setTimeout(() => select(place), 2500);
      return () => clearTimeout(t);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place, county]);
  const [mode, setMode] = useState<"maps" | "list">("maps");
  const [view, setViewRaw] = useState<"2d" | "3d">("2d");
  const [loaded3d, setLoaded3d] = useState(false);
  const [can3d, setCan3d] = useState(true);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let gl = false;
    try {
      gl = !!document.createElement("canvas").getContext("webgl2");
    } catch {
      gl = false;
    }
    const ok = gl && !reduce;
    setCan3d(ok);
    if (ok && localStorage.getItem("ph-map-view") === "3d") {
      setViewRaw("3d");
      setLoaded3d(true);
    }
  }, []);
  const setView = (v: "2d" | "3d") => {
    setViewRaw(v);
    if (v === "3d") setLoaded3d(true);
    localStorage.setItem("ph-map-view", v);
    if (selectedId) setTimeout(() => select(selectedId), 50);
  };

  useEffect(() => {
    if (!id) return;
    supabase
      .from("plans")
      .select("snapshot")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        const s = data?.snapshot as { location: { lng: number; lat: number; radiusM: number }; plan: never } | undefined;
        if (s?.location) replaceAll(s.location, s.plan);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-[1600px] space-y-4 px-4 py-4 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold md:text-3xl">Plan a pantry</h1>
            <p className="text-sm text-evergreen-60">Pick a county (or click one on the map) and drag the citrus pin to place the pantry. Switch 2D / 3D in the map corner.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="chip" data-active={mode === "maps"} onClick={() => setMode("maps")}>
              <MapIcon /> Map
            </Button>
            <Button variant="chip" data-active={mode === "list"} onClick={() => setMode("list")}>
              <List /> List
            </Button>
          </div>
        </div>

        <div className="relative h-[70vh] min-h-[480px] overflow-hidden rounded-2xl border bg-card shadow-soft">
          {mode === "list" && <ResourceList />}
          <div className={cn("absolute inset-0", (mode !== "maps" || view !== "2d") && "invisible")}>
            <ClientOnly fallback={<Fallback label="Loading map…" />}>
              <Suspense fallback={<Fallback label="Loading map…" />}>
                <FlatMap />
              </Suspense>
            </ClientOnly>
          </div>
          {loaded3d && (
            <div className={cn("absolute inset-0", (mode !== "maps" || view !== "3d") && "invisible")}>
              <ClientOnly fallback={<Fallback label="Loading 3D view…" />}>
                <Suspense fallback={<Fallback label="Loading 3D view…" />}>
                  <Map3D />
                </Suspense>
              </ClientOnly>
            </div>
          )}
          {mode === "maps" && (
            <div role="group" aria-label="Map view" className="absolute right-3 top-3 z-10 flex rounded-full glass p-1 shadow-soft">
              {(["2d", "3d"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={view === v}
                  disabled={v === "3d" && !can3d}
                  title={v === "3d" && !can3d ? "3D isn't available here (reduced motion or no 3D support)" : undefined}
                  onClick={() => setView(v)}
                  className={cn(
                    "flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors disabled:opacity-40",
                    view === v ? "bg-evergreen text-primary-foreground" : "text-evergreen hover:bg-muted",
                  )}
                >
                  {v === "2d" ? <MapIcon className="h-4 w-4" /> : <Box className="h-4 w-4" />}
                  {v.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>

        <DetailsPanel />
        <div className="flex justify-end">
          <SaveBar />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(300px,380px)_minmax(320px,420px)_1fr]">
          <Inspector />
          <PlanEditor />
          <div className="space-y-4">
            <Results />
            <Explain />
            <MealsCard />
          </div>
        </div>
      </div>
    </div>
  );
}
