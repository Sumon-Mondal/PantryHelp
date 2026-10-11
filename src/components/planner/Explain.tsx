import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Loader2 } from "lucide-react";
import { explainScenario } from "@/lib/explain.functions";
import { usePlanner } from "@/lib/planner-store";
import { Button } from "@/components/ui/button";

export function Explain() {
  const { snapshot, snapId, results } = usePlanner();
  const run = useServerFn(explainScenario);
  const [answer, setAnswer] = useState<{ id: string; text: string; status: string; note?: string } | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);

  const ask = async (question?: string) => {
    const my = ++reqId.current;
    setLoading(true);
    try {
      const r = await run({ data: { snapshot: snapshot as never, question } });
      if (my !== reqId.current) return; // drop late answers
      setAnswer({ id: r.snapshotId, text: r.text, status: r.status, note: "note" in r ? r.note : undefined });
    } finally {
      if (my === reqId.current) setLoading(false);
    }
  };
  const outdated = answer && answer.id !== snapId;

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-soft" aria-label="Explain this result">
      <h3 className="font-display text-lg font-bold">Ask about this plan</h3>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(q || undefined);
        }}
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Why is staffing the bottleneck?" className="h-11 flex-1 rounded-full border bg-paper px-4 text-sm" maxLength={500} />
        <Button type="submit" variant="pill" disabled={loading || !results}>
          {loading ? <Loader2 className="animate-spin" /> : <Sparkles />} Explain this result
        </Button>
      </form>
      {answer && (
        <div className={`mt-4 rounded-xl p-4 text-sm leading-relaxed transition-opacity duration-[240ms] ${outdated ? "bg-paper-deep opacity-60" : "bg-leaf-tint"}`}>
          {outdated && <p className="mb-2 text-xs font-bold text-citrus-deep">Outdated — the plan changed since this answer.</p>}
          {answer.status === "incomplete" && <p className="mb-2 text-xs font-bold text-citrus-deep">Answer may be incomplete.</p>}
          {answer.status === "fallback" && <p className="mb-2 text-xs font-bold text-evergreen-60">Local explanation (AI unavailable{answer.note ? `: ${answer.note}` : ""})</p>}
          <div className="whitespace-pre-wrap">{answer.text}</div>
          <p className="mt-2 font-mono text-[11px] text-evergreen-60">snapshot {answer.id}</p>
        </div>
      )}
    </section>
  );
}
