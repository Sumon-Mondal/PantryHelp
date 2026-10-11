import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { evidenceAt } from "./geo";
import { DEMANDS, sensitivity, simulate, snapshotId, type OperatingPlan, type ScenarioSnapshot } from "./sim";

const Input = z.object({
  snapshot: z.object({
    location: z.object({ lng: z.number().min(-180).max(180), lat: z.number().min(-90).max(90), radiusM: z.number().min(50).max(50000) }),
    plan: z.record(z.string(), z.number()),
    datasetVersion: z.string().max(100),
    modelVersion: z.string().max(50),
  }),
  question: z.string().max(500).optional(),
});

export function computeFacts(s: ScenarioSnapshot) {
  const e = evidenceAt(s.location.lng, s.location.lat, s.location.radiusM);
  const people = e.people;
  const runs = people == null ? null : DEMANDS.map((d) => simulate(s.plan, people, d));
  const levers = people == null ? null : sensitivity(s.plan, people, "medium");
  return {
    coverage: e.coverage,
    county: e.countyName,
    method: e.method,
    peopleInRing_estimated: people == null ? null : Math.round(people),
    listedServicesInRing_sourced: e.servicesInRing.length,
    nearestServices: e.servicesInRing.slice(0, 5).map((x) => ({ name: x.name, miles: +(x.distanceM / 1609.344).toFixed(2), category: x.category })),
    noVehicleShare_estimated: e.noVehicleShare,
    povertyRate_estimated: e.povertyRate,
    ringCrossesTown: e.ringCrossesTown,
    results_simulated: runs?.map((r) => ({
      demand: r.demand,
      requests: r.requests,
      served: r.served,
      unmet: r.unmet,
      discardedLb: Math.round(r.discardedLb),
      overflowLb: Math.round(r.overflowLb),
      cost: Math.round(r.cost),
      bottleneck: r.bottleneck,
    })),
    levers_simulated: levers,
    plan_assumed: s.plan,
  };
}

export const explainScenario = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    const snap = { ...data.snapshot, plan: data.snapshot.plan as unknown as OperatingPlan } as ScenarioSnapshot;
    const id = snapshotId(snap);
    const facts = computeFacts(snap);
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { snapshotId: id, status: "fallback" as const, text: localExplain(facts) };
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
        body: JSON.stringify({
          model: "openai/gpt-6-astra",
          stream: true,
          store: false,
          reasoning: { effort: "low" },
          instructions:
            "You explain a food pantry planning scenario in North Carolina to a community planner. Use ONLY numbers present in the FACTS JSON; never invent figures. Say which numbers are estimated, assumed or simulated. Visits are not unique households; people in a straight-line radius are not measured demand. Be concise: 4-7 short sentences or bullets, plain language, no headings.",
          input: [
            { role: "user", content: `FACTS:\n${JSON.stringify(facts)}\n\nQuestion: ${data.question || "Explain this result: why does the main bottleneck occur, and what change helps most?"}` },
          ],
        }),
      });
      if (!res.ok || !res.body) {
        console.error("AI gateway", res.status, await res.text());
        return { snapshotId: id, status: "fallback" as const, text: localExplain(facts), note: res.status === 429 ? "The AI is busy right now." : res.status === 402 ? "AI credits are used up." : undefined };
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let text = "";
      let complete = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i: number;
        while ((i = buf.indexOf("\n")) >= 0) {
          const ln = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (!ln.startsWith("data:")) continue;
          const payload = ln.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const ev = JSON.parse(payload) as { type?: string; delta?: string };
            if (ev.type === "response.output_text.delta" && ev.delta) text += ev.delta;
            if (ev.type === "response.completed") complete = true;
          } catch {
            /* partial frame */
          }
        }
      }
      text = text.trim();
      if (!text) return { snapshotId: id, status: "fallback" as const, text: localExplain(facts) };
      return { snapshotId: id, status: complete ? ("complete" as const) : ("incomplete" as const), text };
    } catch (err) {
      console.error(err);
      return { snapshotId: id, status: "fallback" as const, text: localExplain(facts) };
    }
  });

function localExplain(f: ReturnType<typeof computeFacts>) {
  if (!f.results_simulated) return "Data unavailable for this area, so there is no result to explain.";
  const m = f.results_simulated.find((r) => r.demand === "medium")!;
  const b = m.bottleneck === "volunteers" ? "volunteer time" : m.bottleneck === "food" ? "food on hand" : "nothing — all requests were served";
  const top = f.levers_simulated?.[0];
  return [
    `At medium demand the plan serves ${m.served} of ${m.requests} requested visits over 28 days (simulated).`,
    `The main limit is ${b}.`,
    m.discardedLb > 0 ? `${m.discardedLb} lb of food expires before it is used.` : "No food expires.",
    top && top.deltaServed > 0 ? `${top.label} would serve about ${Math.round(top.deltaServed)} more visits.` : "No single +10% change serves more visits.",
  ].join(" ");
}
