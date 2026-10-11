import { describe, expect, it } from "vitest";
import { DEFAULT_PLAN, simulate, sensitivity, snapshotId, MODEL_VERSION } from "./sim";

describe("simulate", () => {
  it("is deterministic", () => {
    expect(simulate(DEFAULT_PLAN, 10846, "medium")).toEqual(simulate(DEFAULT_PLAN, 10846, "medium"));
  });
  it("conserves visits", () => {
    const r = simulate(DEFAULT_PLAN, 10846, "high");
    expect(r.served + r.unmet).toBe(r.requests);
  });
  it("expires perishables before intake (day-8 case)", () => {
    const plan = { ...DEFAULT_PLAN, perishableShare: 1, perishableShelfLifeDays: 7, serviceDaysPerWeek: 1, participationMedium: 0 };
    const r = simulate(plan, 1000, "medium");
    expect(r.days[7].discardedLb).toBeCloseTo(plan.weeklyIntakeLb, 3);
  });
  it("food runs out with zero intake", () => {
    const r = simulate({ ...DEFAULT_PLAN, weeklyIntakeLb: 0 }, 10846, "medium");
    expect(r.served).toBe(0);
    expect(r.bottleneck).toBe("food");
  });
  it("sensitivity can be flat", () => {
    const l = sensitivity(DEFAULT_PLAN, 0, "low");
    expect(l.every((x) => x.deltaServed === 0)).toBe(true);
  });
  it("snapshot id stable regardless of key order", () => {
    const a = snapshotId({ location: { lng: 1, lat: 2, radiusM: 3 }, plan: DEFAULT_PLAN, datasetVersion: "x", modelVersion: MODEL_VERSION });
    const b = snapshotId({ modelVersion: MODEL_VERSION, datasetVersion: "x", plan: { ...DEFAULT_PLAN }, location: { radiusM: 3, lat: 2, lng: 1 } });
    expect(a).toBe(b);
  });
});
