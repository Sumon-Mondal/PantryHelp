import { createFileRoute, Link, ClientOnly, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowDown } from "lucide-react";
import { LocateButton } from "@/components/LocateButton";
import { useLocation } from "@/lib/location";
import { distanceM } from "@/lib/geo";
import { SiteHeader } from "@/components/SiteHeader";
import { Chip } from "@/components/brand";
import { resources, stateSummary, DEFAULT_SITE, countyAcs } from "@/lib/data";

const StoryScene = lazy(() => import("@/components/landing/StoryScene"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PantryHelp — More food. Closer to home." },
      { name: "description", content: "Plan where a food pantry can help in North Carolina, and what food, storage, volunteers and budget it needs." },
      { property: "og:title", content: "PantryHelp — More food. Closer to home." },
      { property: "og:description", content: "Plan where a pantry can help, and what it needs to serve." },
    ],
  }),
  component: Landing,
});

const ACTS = [
  {
    k: "01",
    title: "Food arrives.",
    body: "Each week a pantry receives food up to the space it has. Weekly intake, shelf life and storage are plan controls you set — the default 2,500 lb is an assumption.",
    chip: "assumed" as const,
  },
  {
    k: "02",
    title: "Volunteers prepare it.",
    body: "Juice and shelf-stable snacks get packed (an illustration, not data). Every household takes minutes to serve. Volunteer hours ÷ minutes per household sets how many visits a service day can handle.",
    chip: "assumed" as const,
  },
  {
    k: "03",
    title: "The community is real.",
    body: "This is the real area around Fetzer Hall: buildings and streets from OpenStreetMap, neighborhoods tinted by Census population, and a three-quarter-mile straight-line ring. The tables above are an illustration.",
    chip: "sourced" as const,
  },
  {
    k: "04",
    title: "All of Chapel Hill.",
    body: "Pull back and the whole town and Carrboro appear: about 30,000 OpenStreetMap buildings, every street and park, with the town line in orange.",
    chip: "sourced" as const,
  },
  {
    k: "05",
    title: "All of North Carolina.",
    body: "Every county rises by its Census population and turns greener where there are more food help places per resident. Each dot is a pantry, church ministry, meal site, SNAP or WIC office, or food bank.",
    chip: "sourced" as const,
  },
];

function StoryLocate() {
  const loc = useLocation();
  let note: string | null = null;
  if (loc.status === "on") {
    const km = distanceM([DEFAULT_SITE.lng, DEFAULT_SITE.lat], [loc.lng, loc.lat]) / 1609.344;
    note = km <= 1.4 ? "You're the blue dot on the map." : `You're about ${km.toFixed(km < 20 ? 1 : 0)} miles from Fetzer Hall, outside this 3D view. Open the planner to see your area.`;
  }
  return (
    <div className="mt-4 space-y-2">
      <LocateButton />
      {note && <p className="text-sm text-evergreen-60">{note}</p>}
    </div>
  );
}

const SCENES = ["Produce", "Juice & snacks", "Campus", "Chapel Hill", "North Carolina"];
const COUNTY_OPTS = Object.entries(countyAcs).map(([id, c]) => ({ id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name));

function CountyJump() {
  const nav = useNavigate();
  return (
    <label className="mt-5 flex max-w-md items-center gap-2 rounded-full glass px-4 py-2 text-sm text-evergreen-80">
      <span className="shrink-0 font-medium">Jump to a county</span>
      <select
        defaultValue=""
        onChange={(e) => e.target.value && nav({ to: "/plan", search: { county: e.target.value } })}
        className="min-w-0 flex-1 bg-transparent text-evergreen outline-none"
        aria-label="Pick a county"
      >
        <option value="" disabled>Choose…</option>
        {COUNTY_OPTS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </label>
  );
}

function SceneDots() {
  const [active, setActive] = useState(-1);
  useEffect(() => {
    const els = SCENES.map((_, i) => document.getElementById(`act-0${i + 1}`)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setActive(els.indexOf(e.target as HTMLElement))),
      { rootMargin: "-45% 0px -45% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return (
    <nav aria-label="Story scenes" className={"fixed left-4 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-3 transition-opacity duration-500 md:flex " + (active < 0 ? "pointer-events-none opacity-0" : "opacity-100")}>
      {SCENES.map((n, i) => (
        <button
          key={n}
          onClick={() => document.getElementById(`act-0${i + 1}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
          className="group flex items-center gap-2"
          aria-label={`Go to ${n}`}
        >
          <span className={"block rounded-full transition-all duration-500 ease-calm " + (i === active ? "h-3 w-3 bg-evergreen" : "h-2 w-2 bg-evergreen-40 group-hover:bg-evergreen-60")} />
          <span className={"rounded-full glass px-2 py-0.5 text-xs text-evergreen transition-opacity duration-300 " + (i === active ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>{n}</span>
        </button>
      ))}
    </nav>
  );
}

function ActCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { threshold: 0.3 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={"pointer-events-auto ml-auto max-w-sm rounded-[28px] glass p-6 transition-all duration-700 ease-calm md:mr-8 " + (seen ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0")}>
      {children}
    </div>
  );
}

function Landing() {
  const progress = useRef(0);
  const fill = useRef(0);
  const [use3d, setUse3d] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let gl = false;
    try {
      gl = !!document.createElement("canvas").getContext("webgl2");
    } catch {
      gl = false;
    }
    setUse3d(gl && !reduce);
    const onScroll = () => {
      const story = document.getElementById("story");
      if (!story) return;
      const r = story.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
      progress.current = p;
      fill.current = Math.min(1, 0.35 + p * 3);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const snapCount = resources.filter((r) => r.category === "snap-office").length;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <SceneDots />
      <div id="story" className="relative" style={{ height: "560vh" }}>
        <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-hidden bg-sky-gradient">
          {use3d ? (
            <ClientOnly fallback={null}>
              <Suspense fallback={null}>
                <div className="absolute inset-0 animate-in fade-in duration-[900ms]">
                  <StoryScene progress={progress} fill={fill} />
                </div>
              </Suspense>
            </ClientOnly>
          ) : (
            <div className="absolute inset-0 flex items-end justify-center pb-24">
              <p className="rounded-full bg-card/70 px-4 py-2 text-xs text-evergreen-60">Still view — motion is reduced or 3D isn't available.</p>
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-paper to-transparent" />
        </div>

        {/* Hero copy overlays the first screen */}
        <section className="pointer-events-none absolute inset-x-0 top-0 flex h-[calc(100vh-4rem)] items-start px-4 pt-[9vh] md:px-10">
          <div className="pointer-events-auto max-w-2xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs font-medium text-evergreen-80">
              North Carolina · {resources.length} sourced food-help locations
            </p>
            <h1 className="font-display text-5xl font-extrabold leading-[0.95] text-evergreen md:text-7xl">
              More food.
              <br />
              <span className="text-evergreen-60">Closer to home.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-evergreen-80">Plan where a pantry can help, and what it needs to serve.</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-evergreen-80">
              {[`${resources.length.toLocaleString()} places on the map`, "100 counties", `${stateSummary.people.toLocaleString()} people (ACS)`, `${snapCount} SNAP offices`].map((t) => (
                <span key={t} className="rounded-full glass px-3 py-1 font-medium">{t}</span>
              ))}
            </div>
            <CountyJump />
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/plan" className="group inline-flex h-13 items-center gap-3 rounded-full bg-evergreen py-2 pl-6 pr-2 text-base font-medium text-paper shadow-lift transition-transform duration-[240ms] ease-calm hover:-translate-y-0.5">
                Explore a pantry plan
                <span className="flex size-9 items-center justify-center rounded-full bg-leaf text-evergreen transition-transform duration-[240ms] group-hover:translate-x-0.5">
                  <ArrowRight className="size-4" />
                </span>
              </Link>
              <a href="#act-01" className="inline-flex h-13 items-center gap-2 rounded-full glass px-6 text-base font-medium text-evergreen">
                See how it works <ArrowDown className="size-4" />
              </a>
            </div>
          </div>
        </section>

        {/* Acts */}
        <div className="pointer-events-none absolute inset-x-0 top-[100vh] flex flex-col">
          {ACTS.map((a) => (
            <section key={a.k} id={`act-${a.k}`} className="flex h-[90vh] items-center px-4 md:px-10">
              <ActCard>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-evergreen-60">{a.k} / {String(ACTS.length).padStart(2, "0")}</span>
                  <Chip kind={a.chip} />
                </div>
                <h2 className="mt-3 font-display text-3xl font-bold">{a.title}</h2>
                <p className="mt-2 text-evergreen-80">{a.body}</p>
                {a.k === "03" && <StoryLocate />}
              </ActCard>
            </section>
          ))}
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 py-24 md:px-6">
        <h2 className="font-display text-4xl font-bold md:text-5xl">
          Honest numbers, <span className="text-evergreen-60">all of North Carolina.</span>
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Fact n={stateSummary.people.toLocaleString()} l="North Carolinians (ACS 2019–2023)" kind="sourced" />
          <Fact n={String(snapCount)} l="County offices taking food stamp (SNAP / FNS) applications" kind="sourced" />
          <Fact n={String(resources.filter((r) => r.category === "food-bank").length)} l="Regional food banks" kind="sourced" />
        </div>
        <ul className="mt-10 grid gap-3 text-evergreen-80 md:grid-cols-2">
          <li className="rounded-2xl border bg-card p-5">Every number is labeled sourced, estimated, assumed, simulated — or Unavailable, never zero.</li>
          <li className="rounded-2xl border bg-card p-5">The ring is a straight-line distance, not travel time. Visits are not unique households.</li>
          <li className="rounded-2xl border bg-card p-5">Chapel Hill gets tract-level detail. Anywhere else in NC uses county figures.</li>
          <li className="rounded-2xl border bg-card p-5">Save a plan, share its link, ask for an explanation, and download a PDF report.</li>
        </ul>
        <div className="mt-12">
          <Link to="/plan" className="inline-flex h-13 items-center gap-2 rounded-full bg-evergreen px-7 text-base font-medium text-paper shadow-lift">
            Explore a pantry plan <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
      <footer className="border-t py-8 text-center text-xs text-evergreen-60">
        PantryHelp · Data from the U.S. Census Bureau, NC DHHS, N.C. Cooperative Extension and Feeding America food banks ·{" "}
        <Link to="/sources" className="underline">Sources</Link>
      </footer>
    </div>
  );
}

function Fact({ n, l, kind }: { n: string; l: string; kind: "sourced" }) {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-soft">
      <Chip kind={kind} />
      <div className="mt-3 font-display text-5xl font-extrabold tabular-nums">{n}</div>
      <p className="mt-1 text-sm text-evergreen-80">{l}</p>
    </div>
  );
}
