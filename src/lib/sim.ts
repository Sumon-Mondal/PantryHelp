// Deterministic 28-day pantry simulation. Plain TypeScript, no browser APIs.
export type Demand = "low" | "medium" | "high";
export const DEMANDS: Demand[] = ["low", "medium", "high"];

export interface OperatingPlan {
  serviceDaysPerWeek: number;
  volunteerHoursPerServiceDay: number;
  minutesPerHousehold: number;
  weeklyIntakeLb: number;
  lbPerHousehold: number;
  storageLb: number;
  perishableShare: number; // 0..1
  perishableShelfLifeDays: number;
  shelfStableShelfLifeDays: number;
  deliveryPerServiceDay: number; // households
  fixedCostPerWeek: number; // USD
  variableCostPerVisit: number; // USD
  peoplePerHousehold: number;
  visitsPerHouseholdPer28: number;
  participationLow: number; // share of households, 0..1
  participationMedium: number;
  participationHigh: number;
}

export interface PlanField {
  key: keyof OperatingPlan;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  group: "Service" | "Food & storage" | "Delivery & cost" | "Demand assumptions";
  percent?: boolean;
}

export const DEFAULT_PLAN: OperatingPlan = {
  serviceDaysPerWeek: 2,
  volunteerHoursPerServiceDay: 24,
  minutesPerHousehold: 8,
  weeklyIntakeLb: 2500,
  lbPerHousehold: 25,
  storageLb: 4000,
  perishableShare: 0.35,
  perishableShelfLifeDays: 6,
  shelfStableShelfLifeDays: 180,
  deliveryPerServiceDay: 8,
  fixedCostPerWeek: 350,
  variableCostPerVisit: 2.5,
  peoplePerHousehold: 2.4,
  visitsPerHouseholdPer28: 2,
  participationLow: 0.02,
  participationMedium: 0.05,
  participationHigh: 0.09,
};

export const PLAN_FIELDS: PlanField[] = [
  { key: "serviceDaysPerWeek", label: "Service days", unit: "days / week", min: 1, max: 7, step: 1, group: "Service" },
  { key: "volunteerHoursPerServiceDay", label: "Volunteer hours", unit: "hours / service day", min: 2, max: 120, step: 1, group: "Service" },
  { key: "minutesPerHousehold", label: "Time per household", unit: "minutes", min: 2, max: 30, step: 1, group: "Service" },
  { key: "weeklyIntakeLb", label: "Weekly food intake", unit: "lb / week", min: 0, max: 20000, step: 100, group: "Food & storage" },
  { key: "lbPerHousehold", label: "Food per household", unit: "lb / visit", min: 5, max: 60, step: 1, group: "Food & storage" },
  { key: "storageLb", label: "Storage", unit: "lb", min: 500, max: 30000, step: 100, group: "Food & storage" },
  { key: "perishableShare", label: "Perishable share", unit: "%", min: 0, max: 1, step: 0.01, group: "Food & storage", percent: true },
  { key: "perishableShelfLifeDays", label: "Perishable shelf life", unit: "days", min: 1, max: 21, step: 1, group: "Food & storage" },
  { key: "shelfStableShelfLifeDays", label: "Shelf-stable life", unit: "days", min: 14, max: 365, step: 1, group: "Food & storage" },
  { key: "deliveryPerServiceDay", label: "Delivery capacity", unit: "households / service day", min: 0, max: 80, step: 1, group: "Delivery & cost" },
  { key: "fixedCostPerWeek", label: "Fixed cost", unit: "$ / week", min: 0, max: 5000, step: 25, group: "Delivery & cost" },
  { key: "variableCostPerVisit", label: "Variable cost", unit: "$ / visit", min: 0, max: 20, step: 0.25, group: "Delivery & cost" },
  { key: "peoplePerHousehold", label: "People per household", unit: "people", min: 1, max: 5, step: 0.1, group: "Demand assumptions" },
  { key: "visitsPerHouseholdPer28", label: "Visits per household", unit: "per 28 days", min: 1, max: 8, step: 1, group: "Demand assumptions" },
  { key: "participationLow", label: "Participation, low", unit: "% of households", min: 0, max: 0.3, step: 0.005, group: "Demand assumptions", percent: true },
  { key: "participationMedium", label: "Participation, medium", unit: "% of households", min: 0, max: 0.3, step: 0.005, group: "Demand assumptions", percent: true },
  { key: "participationHigh", label: "Participation, high", unit: "% of households", min: 0, max: 0.4, step: 0.005, group: "Demand assumptions", percent: true },
];

export type Constraint = "requests" | "volunteers" | "food" | "closed";

export interface DayResult {
  day: number;
  service: boolean;
  requests: number;
  served: number;
  unmet: number;
  discardedLb: number;
  overflowLb: number;
  inventoryLb: number;
  cost: number;
  binding: Constraint;
}

export interface RunResult {
  demand: Demand;
  householdsInArea: number;
  requestingHouseholds: number;
  requests: number;
  served: number;
  unmet: number;
  discardedLb: number;
  overflowLb: number;
  endInventoryLb: number;
  cost: number;
  costPerVisit: number | null;
  bottleneck: Constraint;
  days: DayResult[];
}

const SERVICE_ORDER = [2, 4, 6, 1, 3, 5, 0]; // weekdays: Tue, Thu, Sat, Mon, Wed, Fri, Sun
const INTAKE_WEEKDAY = 1; // Monday; day 1 is a Monday

interface Batch {
  lb: number;
  expires: number; // last usable day
}

export function participationFor(plan: OperatingPlan, d: Demand) {
  return d === "low" ? plan.participationLow : d === "medium" ? plan.participationMedium : plan.participationHigh;
}

export function simulate(plan: OperatingPlan, people: number, demand: Demand): RunResult {
  const svcDays = new Set(SERVICE_ORDER.slice(0, Math.max(1, Math.min(7, Math.round(plan.serviceDaysPerWeek)))));
  const households = people / plan.peoplePerHousehold;
  const requesting = households * participationFor(plan, demand);
  const totalRequests = requesting * plan.visitsPerHouseholdPer28;
  const serviceDayCount = [...Array(28)].filter((_, i) => svcDays.has((i + 1) % 7)).length;
  const perServiceDay = serviceDayCount ? totalRequests / serviceDayCount : 0;

  let batches: Batch[] = [];
  const days: DayResult[] = [];
  let carry = 0; // fractional requests carried to keep integer totals honest

  for (let day = 1; day <= 28; day++) {
    const weekday = day % 7;
    // 1. expire
    let discarded = 0;
    batches = batches.filter((b) => {
      if (b.expires < day) {
        discarded += b.lb;
        return false;
      }
      return true;
    });
    // 2. intake up to free storage
    let overflow = 0;
    if (weekday === INTAKE_WEEKDAY) {
      const stock = batches.reduce((s, b) => s + b.lb, 0);
      const free = Math.max(0, plan.storageLb - stock);
      const accepted = Math.min(plan.weeklyIntakeLb, free);
      overflow = plan.weeklyIntakeLb - accepted;
      const per = accepted * plan.perishableShare;
      const stable = accepted - per;
      if (per > 0) batches.push({ lb: per, expires: day + plan.perishableShelfLifeDays - 1 });
      if (stable > 0) batches.push({ lb: stable, expires: day + plan.shelfStableShelfLifeDays - 1 });
    }
    // 3. serve, first-expiring-first
    const service = svcDays.has(weekday);
    let requests = 0;
    let served = 0;
    let binding: Constraint = "closed";
    if (service) {
      const raw = perServiceDay + carry;
      requests = Math.floor(raw);
      carry = raw - requests;
      const staffCap = Math.floor((plan.volunteerHoursPerServiceDay * 60) / plan.minutesPerHousehold) + Math.round(plan.deliveryPerServiceDay);
      const stock = batches.reduce((s, b) => s + b.lb, 0);
      const foodCap = Math.floor(stock / plan.lbPerHousehold);
      served = Math.min(requests, staffCap, foodCap);
      binding = served === requests ? "requests" : staffCap <= foodCap ? "volunteers" : "food";
      let need = served * plan.lbPerHousehold;
      batches.sort((a, b) => a.expires - b.expires);
      for (const b of batches) {
        if (need <= 0) break;
        const take = Math.min(b.lb, need);
        b.lb -= take;
        need -= take;
      }
      batches = batches.filter((b) => b.lb > 1e-9);
    }
    const inventory = batches.reduce((s, b) => s + b.lb, 0);
    days.push({
      day,
      service,
      requests,
      served,
      unmet: requests - served,
      discardedLb: discarded,
      overflowLb: overflow,
      inventoryLb: inventory,
      cost: plan.fixedCostPerWeek / 7 + served * plan.variableCostPerVisit,
      binding,
    });
  }

  const sum = (k: keyof DayResult) => days.reduce((s, d) => s + (d[k] as number), 0);
  const counts: Record<string, number> = {};
  for (const d of days) if (d.service && d.binding !== "requests") counts[d.binding] = (counts[d.binding] ?? 0) + 1;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const served = sum("served");
  const cost = sum("cost");
  return {
    demand,
    householdsInArea: households,
    requestingHouseholds: requesting,
    requests: sum("requests"),
    served,
    unmet: sum("unmet"),
    discardedLb: sum("discardedLb"),
    overflowLb: sum("overflowLb"),
    endInventoryLb: days[27].inventoryLb,
    cost,
    costPerVisit: served > 0 ? cost / served : null,
    bottleneck: (top?.[0] as Constraint) ?? "requests",
    days,
  };
}

export interface Lever {
  key: keyof OperatingPlan;
  label: string;
  deltaServed: number;
  deltaDiscarded: number;
}

const LEVERS: { key: keyof OperatingPlan; label: string }[] = [
  { key: "volunteerHoursPerServiceDay", label: "Volunteer hours +10%" },
  { key: "weeklyIntakeLb", label: "Weekly intake +10%" },
  { key: "storageLb", label: "Storage +10%" },
  { key: "deliveryPerServiceDay", label: "Delivery capacity +10%" },
];

export function sensitivity(plan: OperatingPlan, people: number, demand: Demand): Lever[] {
  const base = simulate(plan, people, demand);
  return LEVERS.map(({ key, label }) => {
    const v = plan[key] as number;
    const next = { ...plan, [key]: key === "deliveryPerServiceDay" ? Math.max(v + 1, v * 1.1) : v * 1.1 };
    const r = simulate(next, people, demand);
    return { key, label, deltaServed: r.served - base.served, deltaDiscarded: r.discardedLb - base.discardedLb };
  }).sort((a, b) => b.deltaServed - a.deltaServed);
}

export const MODEL_VERSION = "pantryhelp-sim-1";

export function canonicalJson(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .sort()
    .filter((k) => o[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`)
    .join(",")}}`;
}

export function hashString(s: string): string {
  // FNV-1a 64-bit via two 32-bit lanes; deterministic everywhere.
  let h1 = 0x811c9dc5,
    h2 = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ c, 0x5bd1e995);
  }
  return ((h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0")).slice(0, 16);
}

export interface ScenarioSnapshot {
  location: { lng: number; lat: number; radiusM: number };
  county?: string;
  plan: OperatingPlan;
  datasetVersion: string;
  modelVersion: string;
}

export function snapshotId(s: ScenarioSnapshot) {
  return hashString(canonicalJson(s));
}
