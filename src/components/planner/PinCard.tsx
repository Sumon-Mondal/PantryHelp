import { usePlanner } from "@/lib/planner-store";
import { fmt } from "@/components/brand";

// Small outcome card that rides next to the dropped pin: medium-demand 28-day served vs unmet + bottleneck.
const BOTTLENECK: Record<string, string> = {
  food: "Food on hand",
  volunteers: "Volunteer time",
  requests: "None (demand met)",
  closed: "Closed days",
};

// Pass results explicitly when rendered inside a separate React root (drei <Html>), which loses context.
export function PinCard({ results: given }: { results?: ReturnType<typeof usePlanner>["results"] }) {
  return given !== undefined ? <PinCardView results={given} /> : <PinCardCtx />;
}
function PinCardCtx() {
  return <PinCardView results={usePlanner().results} />;
}
function PinCardView({ results }: { results: ReturnType<typeof usePlanner>["results"] }) {
  const r = results?.find((x) => x.demand === "medium");
  if (!r) {
    return (
      <div className="pointer-events-none w-48 rounded-2xl bg-card/95 p-3 text-xs text-evergreen-60 shadow-lift">
        Population data unavailable here.
      </div>
    );
  }
  const total = Math.max(1, r.served + r.unmet);
  const sp = (r.served / total) * 100;
  return (
    <div className="pointer-events-none w-52 rounded-2xl border border-border bg-card/95 p-3 shadow-lift backdrop-blur" aria-live="polite">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-evergreen-60">Medium demand · 28 days</div>
      <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-leaf transition-all" style={{ width: `${sp}%` }} />
        <div className="h-full bg-tomato/80 transition-all" style={{ width: `${100 - sp}%` }} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-evergreen">
        <div>
          <span className="mr-1 inline-block size-2 rounded-full bg-leaf" />
          Served <b>{fmt(r.served)}</b>
        </div>
        <div>
          <span className="mr-1 inline-block size-2 rounded-full bg-tomato/80" />
          Unmet <b>{fmt(r.unmet)}</b>
        </div>
      </div>
      <div className="mt-1.5 text-[11px] text-evergreen-60">
        Bottleneck: <span className="font-medium text-evergreen">{BOTTLENECK[r.bottleneck] ?? r.bottleneck}</span>
      </div>
      <div className="mt-1 text-[9px] uppercase tracking-wider text-evergreen-40">Simulated</div>
    </div>
  );
}
