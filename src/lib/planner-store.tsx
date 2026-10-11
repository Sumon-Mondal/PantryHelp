import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_SITE, DATASET_VERSION } from "./data";
import { evidenceAt, evidenceForCounty, countyAt, type Evidence } from "./geo";
import { DEFAULT_PLAN, DEMANDS, MODEL_VERSION, sensitivity, simulate, snapshotId, type Lever, type OperatingPlan, type RunResult, type ScenarioSnapshot } from "./sim";

export interface Site {
  lng: number;
  lat: number;
  radiusM: number;
}

export type PickFrom = "flat" | "3d" | "other";

interface PlannerState {
  site: Site;
  setSite: (s: Partial<Site>) => void;
  plan: OperatingPlan;
  setPlan: (p: Partial<OperatingPlan>) => void;
  resetPlan: () => void;
  replaceAll: (s: Site, p: OperatingPlan) => void;
  selectedId: string | null;
  select: (id: string | null, from?: PickFrom) => void;
  selectedCounty: string | null;
  selectCounty: (geoid: string | null, from?: PickFrom) => void;
  pickFrom: PickFrom;
  flyTick: number;
  evidence: Evidence;
  areaCounty: string | null;
  results: RunResult[] | null;
  levers: Lever[] | null;
  snapshot: ScenarioSnapshot;
  snapId: string;
}

const Ctx = createContext<PlannerState | null>(null);

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [site, setSiteRaw] = useState<Site>({ lng: DEFAULT_SITE.lng, lat: DEFAULT_SITE.lat, radiusM: DEFAULT_SITE.radiusM });
  const [plan, setPlanRaw] = useState<OperatingPlan>(DEFAULT_PLAN);
  const [selectedId, setSelected] = useState<string | null>(null);
  const [flyTick, setFlyTick] = useState(0);
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null);
  const [pickFrom, setPickFrom] = useState<PickFrom>("other");

  // Service area = the selected county, else the county under the pin.
  const areaCounty = useMemo(() => selectedCounty ?? (countyAt(site.lng, site.lat)?.properties.GEOID ?? null), [selectedCounty, site.lng, site.lat]);
  const evidence = useMemo(() => (areaCounty ? evidenceForCounty(areaCounty, site.lng, site.lat) : evidenceAt(site.lng, site.lat, site.radiusM)), [areaCounty, site]);
  const { results, levers } = useMemo(() => {
    if (evidence.people == null) return { results: null, levers: null };
    return {
      results: DEMANDS.map((d) => simulate(plan, evidence.people!, d)),
      levers: sensitivity(plan, evidence.people, "medium"),
    };
  }, [plan, evidence.people]);

  const snapshot = useMemo<ScenarioSnapshot>(
    () => ({
      location: { lng: +site.lng.toFixed(6), lat: +site.lat.toFixed(6), radiusM: Math.round(site.radiusM) },
      ...(areaCounty ? { county: areaCounty } : {}),
      plan,
      datasetVersion: DATASET_VERSION,
      modelVersion: MODEL_VERSION,
    }),
    [site, plan, areaCounty],
  );
  const snapId = useMemo(() => snapshotId(snapshot), [snapshot]);

  const value: PlannerState = {
    site,
    setSite: (s) => setSiteRaw((p) => ({ ...p, ...s })),
    plan,
    setPlan: (p) => setPlanRaw((o) => ({ ...o, ...p })),
    resetPlan: () => setPlanRaw(DEFAULT_PLAN),
    replaceAll: (s, p) => {
      setSiteRaw(s);
      setPlanRaw({ ...DEFAULT_PLAN, ...p });
    },
    selectedId,
    select: (id, from) => {
      if (from) setPickFrom(from);
      setSelected(id);
      setFlyTick((t) => t + 1);
    },
    selectedCounty,
    pickFrom,
    selectCounty: (g, from) => {
      if (from) setPickFrom(from);
      setSelectedCounty(g);
      setSelected(null);
    },
    flyTick,
    evidence,
    areaCounty,
    results,
    levers,
    snapshot,
    snapId,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlanner() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlanner outside provider");
  return v;
}
