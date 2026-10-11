import { centroid } from "@turf/turf";
import { counties } from "@/lib/geo";
import { AlertTriangle, MapPinOff } from "lucide-react";
import { stateSummary } from "@/lib/data";
import { usePlanner } from "@/lib/planner-store";
import { Stat, fmt, pct } from "@/components/brand";

const COUNTY_OPTS = counties.features.map((f) => ({ g: f.properties.GEOID, n: f.properties.NAME })).sort((a, b) => a.n.localeCompare(b.n));

export function Inspector() {
  const { site, setSite, evidence, areaCounty, selectCounty } = usePlanner();
  const e = evidence;
  const whole = e.method === "county";
  const county = e.method === "county-average";
  const where = whole ? "the county" : "the ring";
  return (
    <section className="space-y-4" aria-label="Pin and ring">
      <div className="rounded-2xl border bg-card p-5 shadow-soft">
        <h3 className="font-display text-lg font-bold">1 · Where it goes</h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-xs text-evergreen-60">
            Longitude
            <input
              type="number"
              step="0.0001"
              value={site.lng.toFixed(6)}
              onChange={(ev) => Number.isFinite(+ev.target.value) && setSite({ lng: +ev.target.value })}
              className="mt-1 h-11 w-full rounded-lg border bg-paper px-3 font-mono text-sm text-evergreen"
            />
          </label>
          <label className="text-xs text-evergreen-60">
            Latitude
            <input
              type="number"
              step="0.0001"
              value={site.lat.toFixed(6)}
              onChange={(ev) => Number.isFinite(+ev.target.value) && setSite({ lat: +ev.target.value })}
              className="mt-1 h-11 w-full rounded-lg border bg-paper px-3 font-mono text-sm text-evergreen"
            />
          </label>
        </div>
        <label className="mt-4 block text-sm font-medium">
          Service area: county
          <select
            value={areaCounty ?? ""}
            onChange={(ev) => {
              const g = ev.target.value;
              selectCounty(g || null);
              const c = counties.features.find((f) => f.properties.GEOID === g);
              if (c) {
                const [lng, lat] = centroid(c).geometry.coordinates;
                setSite({ lng, lat });
              }
            }}
            className="mt-1 h-11 w-full rounded-lg border bg-paper px-3 text-sm text-evergreen"
            aria-label="Service area county"
          >
            {COUNTY_OPTS.map((c) => (
              <option key={c.g} value={c.g}>{c.n} County</option>
            ))}
          </select>
          <span className="mt-2 block text-xs font-normal text-evergreen-60">The whole county is the area this pantry serves. Pick a county here or click one on the map.</span>
        </label>
        <p className="mt-3 text-xs text-evergreen-80">
          {e.coverage === "chapel-hill" ? "Chapel Hill · tract-level detail" : e.coverage === "nc" ? `${e.countyName ?? "North Carolina"} County · county-level detail` : "Outside North Carolina"}
        </p>
      </div>

      {e.coverage === "outside" ? (
        <div className="flex items-start gap-3 rounded-2xl border border-dashed border-evergreen-40 p-5">
          <MapPinOff className="mt-0.5 size-5 text-evergreen-60" />
          <div>
            <p className="font-medium">Data unavailable for this area</p>
            <p className="text-sm text-evergreen-60">PantryHelp covers North Carolina. Move the pin back inside the state.</p>
          </div>
        </div>
      ) : (
        <>
          {e.ringCrossesTown && (
            <div className="flex items-start gap-2 rounded-xl bg-citrus-tint p-3 text-sm text-citrus-deep">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              Part of the straight-line ring is outside Chapel Hill. Counts exclude that part.
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Stat
              label={`People in ${where}`}
              value={fmt(e.people)}
              kind={whole ? "sourced" : "estimated"}
              note={whole ? `Census ACS 2019–2023 total for ${e.countyName} County.` : county ? `County-average density for ${e.countyName}. Coarse outside Chapel Hill.` : "Area-weighted ACS 2019–2023 tract population."}
            />
            <Stat label={`Listed services in ${where}`} value={fmt(e.servicesInRing.length)} kind="sourced" note={whole ? `Food help places on file in ${e.countyName} County.` : "Stored, geocoded places inside the ring."} />
            <Stat label="Households without a vehicle" value={pct(e.noVehicleShare)} kind="estimated" note="ACS B08201." />
            <Stat label="Income below poverty" value={pct(e.povertyRate)} kind="estimated" note="ACS B17001, count ÷ poverty universe." />
            <Stat label={`Households on SNAP (${e.countyName ?? "county"} County)`} value={pct(e.snapShare)} kind="sourced" note="ACS B22003, county-wide." />
          </div>
        </>
      )}

      <div className="rounded-2xl border bg-paper-deep/60 p-5">
        <h3 className="font-display text-base font-bold">North Carolina as a whole</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <Row k="People" v={fmt(stateSummary.people)!} />
          <Row k="Households without a vehicle" v={`${fmt(stateSummary.householdsWithoutVehicle)} of ${fmt(stateSummary.households)} (${pct(stateSummary.householdsWithoutVehicle / stateSummary.households)})`} />
          <Row k="Income below poverty" v={`${fmt(stateSummary.belowPoverty)} of ${fmt(stateSummary.povertyUniverse)} (${pct(stateSummary.belowPoverty / stateSummary.povertyUniverse)})`} />
        </dl>
        <p className="mt-2 text-xs text-evergreen-60">Sourced, ACS 2019–2023. A complete statewide pantry count is unavailable.</p>
      </div>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-evergreen-80">{k}</dt>
      <dd className="text-right font-medium tabular-nums">{v}</dd>
    </div>
  );
}
