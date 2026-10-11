import { useMemo, useState } from "react";
import { Minus, Plus, Navigation, Phone } from "lucide-react";
import { resources, CATEGORY_LABEL } from "@/lib/data";
import { countyAt, distanceM } from "@/lib/geo";
import { usePlanner } from "@/lib/planner-store";
import { useLocation } from "@/lib/location";
import { mealsNeeded, FOOD_HELP, driveUrl } from "@/lib/meals";
import { CATEGORY_HEX } from "@/lib/palette";

function Step({ label, v, set, min = 0, max = 20 }: { label: string; v: number; set: (n: number) => void; min?: number; max?: number }) {
  return (
    <div className="rounded-2xl bg-muted/60 p-2.5">
      <div className="text-xs text-evergreen-60">{label}</div>
      <div className="mt-1 flex items-center justify-between">
        <button aria-label={`Fewer ${label}`} className="grid size-8 place-items-center rounded-full border bg-card" onClick={() => set(Math.max(min, v - 1))}>
          <Minus className="size-3.5" />
        </button>
        <span className="font-display text-xl font-semibold">{v}</span>
        <button aria-label={`More ${label}`} className="grid size-8 place-items-center rounded-full border bg-card" onClick={() => set(Math.min(max, v + 1))}>
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

export function MealsCard() {
  const { site, select } = usePlanner();
  const loc = useLocation();
  const [a, setA] = useState(2);
  const [k, setK] = useState(2);
  const [p, setP] = useState(3);
  const [d, setD] = useState(30);
  const from = loc.status === "on" ? { lng: loc.lng, lat: loc.lat, label: "your location" } : { lng: site.lng, lat: site.lat, label: "your pin" };
  const county = (countyAt(from.lng, from.lat)?.properties as { NAME?: string } | undefined)?.NAME ?? null;
  const places = useMemo(
    () =>
      county
        ? resources
            .filter((r) => (r.county ?? "").replace(/ County$/, "") === county && FOOD_HELP.includes(r.category))
            .map((r) => ({ r, km: distanceM([from.lng, from.lat], [r.lng, r.lat]) / 1609.344 }))
            .sort((x, y) => x.km - y.km)
        : [],
    [county, from.lng, from.lat],
  );
  return (
    <section className="rounded-3xl border bg-card p-5 shadow-soft">
      <h2 className="font-display text-xl font-semibold">Feed a family</h2>
      <p className="text-xs text-evergreen-60">How many meals a household needs, and food help near {from.label}.</p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Step label="Adults" v={a} set={setA} />
        <Step label="Children" v={k} set={setK} />
        <Step label="Meals / day" v={p} set={setP} min={1} max={6} />
        <Step label="Days" v={d} set={setD} min={1} max={31} />
      </div>
      <div className="mt-3 rounded-2xl bg-evergreen p-4 text-paper">
        <p className="text-xs opacity-80">Meals needed</p>
        <p className="font-display text-4xl font-bold">{mealsNeeded(a, k, p, d).toLocaleString()}</p>
        <p className="text-xs opacity-80">{a + k} people × {p} meals × {d} days — plain arithmetic, not an official estimate.</p>
      </div>
      <p className="mt-3 text-xs text-evergreen-80">
        <b>Can these places cover it?</b> Unavailable — no source publishes how much food each place gives out. Call ahead.
      </p>
      <div className="mt-3 flex items-baseline justify-between">
        <p className="text-sm font-semibold">{county ? `${county} County` : "Outside NC"}</p>
        <p className="text-xs text-evergreen-60">{places.length} places</p>
      </div>
      <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto pr-1">
        {places.slice(0, 40).map(({ r, km }) => (
          <li key={r.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-muted">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: CATEGORY_HEX[r.category] }} />
            <button onClick={() => select(r.id)} className="min-w-0 flex-1 text-left">
              <span className="block truncate text-sm">{r.name}</span>
              <span className="block truncate text-[11px] text-evergreen-60">
                {CATEGORY_LABEL[r.category]} · {km.toFixed(1)} mi · {r.publishedHours ?? "hours unavailable"}
              </span>
            </button>
            {r.phone && (
              <a aria-label={`Call ${r.name}`} href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} className="grid size-8 shrink-0 place-items-center rounded-full border bg-card">
                <Phone className="size-3.5" />
              </a>
            )}
            <a aria-label={`Drive to ${r.name}`} href={driveUrl(r.lat, r.lng)} target="_blank" rel="noreferrer" className="grid size-8 shrink-0 place-items-center rounded-full bg-evergreen text-paper">
              <Navigation className="size-3.5" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
