import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Minus, Plus, Phone, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Chip } from "@/components/brand";
import { resources, countyAcs, CATEGORY_LABEL, type Category } from "@/lib/data";
import { useLocation } from "@/lib/location";
import { LocateButton } from "@/components/LocateButton";
import { countyAt, distanceM } from "@/lib/geo";

export const Route = createFileRoute("/meals")({
  head: () => ({
    meta: [
      { title: "Family meals calculator — PantryHelp" },
      { name: "description", content: "Work out how many meals your family needs in a month and see the food pantries, ministries and meal sites listed in your NC county." },
      { property: "og:title", content: "How many meals does my family need each month?" },
      { property: "og:description", content: "A simple meals calculator plus the food help places listed in your North Carolina county." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Meals,
});

const COUNTIES = Object.values(countyAcs)
  .map((c) => c.name.replace(/ County$/, ""))
  .sort();
const HELP: Category[] = ["pantry", "ministry", "meal-site", "food-bank", "snap-office", "wic-office"];

function Stepper({ label, value, set, min = 0, max = 20 }: { label: string; value: number; set: (n: number) => void; min?: number; max?: number }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="text-sm text-evergreen-60">{label}</div>
      <div className="mt-2 flex items-center gap-3">
        <button type="button" aria-label={`Fewer ${label}`} className="grid size-11 place-items-center rounded-full border" onClick={() => set(Math.max(min, value - 1))}><Minus className="size-4" /></button>
        <span className="w-10 text-center font-display text-3xl font-bold">{value}</span>
        <button type="button" aria-label={`More ${label}`} className="grid size-11 place-items-center rounded-full border" onClick={() => set(Math.min(max, value + 1))}><Plus className="size-4" /></button>
      </div>
    </div>
  );
}

function Meals() {
  const [adults, setAdults] = useState(2);
  const [kids, setKids] = useState(2);
  const [perDay, setPerDay] = useState(3);
  const [days, setDays] = useState(30);
  const [county, setCounty] = useState("Orange");
  const loc = useLocation();

  const people = adults + kids;
  const meals = people * perDay * days;

  // When location is shared, preselect the county you're in (once).
  const [usedLoc, setUsedLoc] = useState(false);
  if (loc.status === "on" && !usedLoc) {
    const f = countyAt(loc.lng, loc.lat);
    if (f) setCounty((f.properties as unknown as { NAME: string }).NAME);
    setUsedLoc(true);
  }

  const places = useMemo(() => {
    const list = resources.filter((r) => (r.county ?? "").replace(/ County$/, "") === county && HELP.includes(r.category));
    const d = (r: (typeof list)[number]) => (loc.status === "on" ? distanceM([loc.lng, loc.lat], [r.lng, r.lat]) : null);
    return list.map((r) => ({ r, d: d(r) })).sort((a, b) => (a.d ?? 0) - (b.d ?? 0) || HELP.indexOf(a.r.category) - HELP.indexOf(b.r.category));
  }, [county, loc]);
  const food = places.filter((p) => ["pantry", "ministry", "meal-site"].includes(p.r.category));

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-12 md:px-6">
        <h1 className="font-display text-4xl font-bold md:text-5xl">How many meals does your family need?</h1>
        <p className="mt-3 max-w-2xl text-evergreen-80">Count the people at home and the meals each day. Then see the food help places listed for your county.</p>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stepper label="Adults" value={adults} set={setAdults} />
          <Stepper label="Children" value={kids} set={setKids} />
          <Stepper label="Meals per day" value={perDay} set={setPerDay} min={1} max={6} />
          <Stepper label="Days" value={days} set={setDays} min={1} max={31} />
        </section>

        <section className="mt-6 rounded-[28px] bg-evergreen p-6 text-primary-foreground shadow-lift md:p-8">
          <div className="text-sm opacity-80">Meals needed this month</div>
          <div className="mt-1 font-display text-6xl font-bold">{meals.toLocaleString()}</div>
          <div className="mt-2 text-sm opacity-80">
            {people} {people === 1 ? "person" : "people"} × {perDay} meals × {days} days. This is plain arithmetic that you set; it isn't an official estimate.
          </div>
        </section>

        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold">{loc.status === "on" ? `Nearest food help to you · ${county} County` : `Food help in ${county} County`}</h2>
              <p className="mt-1 text-sm text-evergreen-60">
                {food.length} pantries, church ministries and meal sites listed, plus food banks, SNAP and WIC offices.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <LocateButton showList={false} />
              <select value={county} onChange={(e) => setCounty(e.target.value)} className="h-11 rounded-full border bg-card px-4 text-sm" aria-label="County">
                {COUNTIES.map((c) => (
                  <option key={c} value={c}>{c} County</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-citrus/50 bg-citrus/10 p-4 text-sm text-evergreen">
            <b>Can they cover {meals.toLocaleString()} meals?</b> No source we use publishes how much food each pantry gives out, so that is <Chip kind="unavailable" />.
            Most pantries supplement groceries rather than cover a whole month. Call ahead to ask about hours, limits and what to bring. For steady monthly help,{" "}
            <Link to="/snap" className="font-medium text-leaf-deep underline">apply for food stamps (SNAP)</Link>.
          </div>

          {places.length === 0 ? (
            <p className="mt-6 rounded-2xl border bg-card p-5 text-evergreen-60">No places are listed for this county in our sources yet. That means data is missing, not that help is. Call your county DSS office or 2-1-1.</p>
          ) : (
            <ul className="mt-4 grid gap-2 md:grid-cols-2">
              {places.map(({ r, d }) => (
                <li key={r.id} className="rounded-2xl border bg-card p-4 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-evergreen">{r.name}</div>
                    <span className="shrink-0 rounded-full bg-paper-deep px-2 py-0.5 text-[11px]">{CATEGORY_LABEL[r.category]}</span>
                  </div>
                  <div className="mt-1 flex items-start gap-1 text-evergreen-60"><MapPin className="mt-0.5 size-3 shrink-0" />{r.address}{d != null && ` · ${(d / 1609.34).toFixed(1)} mi straight-line`}</div>
                  <div className="mt-1 text-evergreen-60">{r.publishedHours ? `Hours (published, unverified): ${r.publishedHours}` : "Hours unavailable"}</div>
                  {r.phone && <a href={`tel:${r.phone}`} className="mt-1 inline-flex items-center gap-1 text-leaf-deep underline"><Phone className="size-3" />{r.phone}</a>}
                  {r.category === "snap-office" && <Link to="/snap" className="ml-3 text-leaf-deep underline">How to apply</Link>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
