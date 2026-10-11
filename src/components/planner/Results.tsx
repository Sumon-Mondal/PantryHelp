import { useState } from "react";
import { Area, AreaChart, Bar, ComposedChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePlanner } from "@/lib/planner-store";
import { Chip, fmt, usd } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { HEX } from "@/lib/palette";
import type { Constraint, Demand } from "@/lib/sim";

export const BOTTLENECK_TEXT: Record<Constraint, string> = {
  volunteers: "Volunteer time",
  food: "Food on hand",
  requests: "None — every request is served",
  closed: "—",
};

export function Results() {
  const { results, levers, evidence } = usePlanner();
  const [demand, setDemand] = useState<Demand>("medium");
  if (!results) {
    return (
      <section className="rounded-2xl border border-dashed border-evergreen-40 p-6">
        <h3 className="font-display text-lg font-bold">3 · The first 4 weeks</h3>
        <p className="mt-2 text-sm text-evergreen-60">
          {evidence.coverage === "outside" ? "Data unavailable for this area." : "Population for this ring is unavailable, so no result is simulated."}
        </p>
      </section>
    );
  }
  const r = results.find((x) => x.demand === demand)!;
  const best = levers?.[0];
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-soft" aria-label="28-day results">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-lg font-bold">3 · The first 4 weeks</h3>
          <p className="text-xs text-evergreen-60">Visits are not unique households. People in a radius are not measured demand.</p>
        </div>
        <div className="flex gap-1.5" role="tablist">
          {(["low", "medium", "high"] as Demand[]).map((d) => (
            <Button key={d} variant="chip" size="sm" role="tab" aria-selected={d === demand} data-active={d === demand} onClick={() => setDemand(d)}>
              {d[0].toUpperCase() + d.slice(1)} demand
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Metric label="Visits served" value={fmt(r.served)} tone="text-leaf-deep" />
        <Metric label="Unmet requests" value={fmt(r.unmet)} tone="text-citrus-deep" />
        <Metric label="Food discarded" value={`${fmt(r.discardedLb)} lb`} tone="text-tomato" />
        <Metric label="Turned away (no storage)" value={`${fmt(r.overflowLb)} lb`} tone="text-evergreen-80" />
        <Metric label="Inventory on day 28" value={`${fmt(r.endInventoryLb)} lb`} tone="text-sky-deep" />
        <Metric label="Cost, 28 days" value={usd(r.cost)!} sub={r.costPerVisit ? `${usd(r.costPerVisit)} / visit` : undefined} tone="text-evergreen" />
      </div>

      <div className="mt-5 h-48">
        <ResponsiveContainer>
          <ComposedChart data={r.days} margin={{ left: -18, right: 4, top: 4 }}>
            <CartesianGrid stroke={HEX.paperDeep} vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: HEX.evergreen60 }} />
            <YAxis yAxisId="v" tick={{ fontSize: 11, fill: HEX.evergreen60 }} />
            <YAxis yAxisId="lb" orientation="right" hide />
            <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 24px rgba(18,59,50,.14)" }} />
            <Area yAxisId="lb" dataKey="inventoryLb" name="Inventory (lb)" fill={HEX.sky} stroke={HEX.skyDeep} fillOpacity={0.35} />
            <Bar yAxisId="v" dataKey="served" name="Served" stackId="a" fill={HEX.leaf} radius={[0, 0, 0, 0]} />
            <Bar yAxisId="v" dataKey="unmet" name="Unmet" stackId="a" fill={HEX.citrus} radius={[4, 4, 0, 0]} />
            <Line yAxisId="lb" dataKey="discardedLb" name="Discarded (lb)" stroke={HEX.tomato} dot={false} strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-paper-deep p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-evergreen-60">Main bottleneck</span>
            <Chip kind="simulated" />
          </div>
          <p className="mt-1 font-display text-xl font-bold">{BOTTLENECK_TEXT[r.bottleneck]}</p>
        </div>
        <div className="rounded-xl bg-paper-deep p-4">
          <span className="text-xs font-bold uppercase tracking-wider text-evergreen-60">What helps most (medium demand)</span>
          {best && best.deltaServed > 0 ? (
            <p className="mt-1 text-sm"><b>{best.label}</b> serves {fmt(best.deltaServed)} more visits.</p>
          ) : (
            <p className="mt-1 text-sm">No single +10% change serves more visits.</p>
          )}
          <ul className="mt-2 space-y-0.5 text-xs text-evergreen-80">
            {levers?.slice(1).map((l) => (
              <li key={l.key}>{l.label}: {l.deltaServed >= 0 ? "+" : ""}{fmt(l.deltaServed)} visits</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-evergreen-60">
        <Chip kind="simulated" /> Deterministic: food expires first each day, then intake arrives, then first-expiring food is served.
      </div>
    </section>
  );
}

function Metric({ label, value, sub, tone }: { label: string; value: string | null; sub?: string; tone: string }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="text-xs text-evergreen-60">{label}</div>
      <div className={`mt-1 font-display text-2xl font-bold tabular-nums ${tone}`}>{value ?? "Unavailable"}</div>
      {sub && <div className="text-xs text-evergreen-60">{sub}</div>}
    </div>
  );
}

export { AreaChart };
