import { RotateCcw } from "lucide-react";
import { PLAN_FIELDS, DEFAULT_PLAN, type PlanField } from "@/lib/sim";
import { usePlanner } from "@/lib/planner-store";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/brand";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const GROUPS: PlanField["group"][] = ["Service", "Food & storage", "Delivery & cost", "Demand assumptions"];

export function PlanEditor() {
  const { plan, setPlan, resetPlan } = usePlanner();
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-soft" aria-label="Operating plan">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-bold">2 · How it runs</h3>
          <p className="text-xs text-evergreen-60">Every default is an assumption. Change it to match your pantry.</p>
        </div>
        <Button variant="outline" size="sm" className="rounded-full" onClick={resetPlan}>
          <RotateCcw /> Reset
        </Button>
      </div>
      <Accordion type="multiple" defaultValue={["Service", "Food & storage"]} className="mt-2">
        {GROUPS.map((g) => (
          <AccordionItem key={g} value={g}>
            <AccordionTrigger className="text-sm font-bold">{g}</AccordionTrigger>
            <AccordionContent className="space-y-5 pt-1">
              {PLAN_FIELDS.filter((f) => f.group === g).map((f) => {
                const v = plan[f.key];
                const changed = v !== DEFAULT_PLAN[f.key];
                const show = f.percent ? `${(v * 100).toFixed(1)}%` : v.toLocaleString("en-US");
                return (
                  <div key={f.key}>
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor={f.key} className="text-sm">
                        {f.label} <span className="text-xs text-evergreen-60">{f.unit}</span>
                      </label>
                      <div className="flex items-center gap-2">
                        {!changed && <Chip kind="assumed" />}
                        <input
                          id={f.key}
                          type="number"
                          step={f.percent ? 0.5 : f.step}
                          value={f.percent ? +(v * 100).toFixed(2) : v}
                          onChange={(e) => {
                            const n = +e.target.value;
                            if (!Number.isFinite(n)) return;
                            const val = f.percent ? n / 100 : n;
                            setPlan({ [f.key]: Math.max(f.min, Math.min(f.max, val)) });
                          }}
                          className="h-9 w-20 rounded-lg border bg-paper px-2 text-right font-mono text-sm"
                          aria-label={`${f.label} value`}
                        />
                      </div>
                    </div>
                    <Slider className="mt-2" min={f.min} max={f.max} step={f.step} value={[v]} onValueChange={([n]) => setPlan({ [f.key]: n })} aria-label={f.label} />
                    <span className="sr-only">{show}</span>
                  </div>
                );
              })}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
