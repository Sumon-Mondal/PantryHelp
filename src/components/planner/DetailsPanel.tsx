import { miles, dist } from "@/lib/units";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { centroid } from "@turf/turf";
import { Clock, MapPin, Phone, Navigation, X, ExternalLink, Landmark, ChevronLeft, Users, GripHorizontal, Crosshair, Map as MapIcon, Box } from "lucide-react";
import { resources, countyAcs, countyAccess, ACCESS_MAX, CATEGORY_LABEL, type Category, type Resource } from "@/lib/data";
import { counties, distanceM } from "@/lib/geo";
import { usePlanner } from "@/lib/planner-store";
import { CATEGORY_HEX } from "@/lib/palette";
import { driveUrl } from "@/lib/meals";

// One movable panel for the selected county or food place. Lives in the normal React tree (not drei <Html>).
const POS_KEY = "ph-panel-pos-";
const W = 380;

const NC = (() => {
  const t = { bp: 0, pu: 0, nv: 0, vu: 0, sn: 0, su: 0 };
  for (const c of Object.values(countyAcs)) {
    t.bp += c.belowPoverty ?? 0;
    t.pu += c.povertyUniverse ?? 0;
    t.nv += c.noVehicle ?? 0;
    t.vu += c.vehicleUniverse ?? 0;
    t.sn += c.snapHouseholds ?? 0;
    t.su += c.snapUniverse ?? 0;
  }
  return { poverty: t.bp / t.pu, noCar: t.nv / t.vu, snap: t.sn / t.su };
})();
const norm = (s: string | null) => (s ?? "").replace(/ County$/, "");

export function DetailsPanel() {
  const { selectedId, select, selectedCounty, selectCounty, pickFrom } = usePlanner();
  const left = false;
  const side = left ? "left" : "right";
  const place = selectedId ? resources.find((r) => r.id === selectedId) ?? null : null;
  const visible = !!place || !!selectedCounty;
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(POS_KEY + side) ?? "null");
      setPos(s && typeof s.x === "number" ? s : null);
    } catch {}
  }, [side]);
  useEffect(() => {
    if (visible) {
      setMounted(true);
      const t = requestAnimationFrame(() => setOpen(true));
      return () => cancelAnimationFrame(t);
    }
    setOpen(false);
    const t = setTimeout(() => setMounted(false), 220);
    return () => clearTimeout(t);
  }, [visible]);
  const close = () => {
    select(null);
    selectCounty(null);
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const clamp = (x: number, y: number) => ({
    x: Math.min(Math.max(8, x), window.innerWidth - W - 8),
    y: Math.min(Math.max(8, y), window.innerHeight - 80),
  });
  const onDown = (e: React.PointerEvent) => {
    if (window.innerWidth < 768 || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (drag.current) setPos(clamp(e.clientX - drag.current.dx, e.clientY - drag.current.dy));
  };
  const onUp = () => {
    if (drag.current && pos) localStorage.setItem(POS_KEY + side, JSON.stringify(pos));
    drag.current = null;
  };

  if (!mounted) return null;
  const style = pos ? { left: pos.x, top: pos.y } : undefined;
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Details"
      data-open={open}
      style={style}
      className={
        "fixed z-50 flex max-h-[min(78vh,720px)] flex-col overflow-hidden rounded-3xl border bg-card/95 text-evergreen shadow-lift backdrop-blur-xl transition-[opacity,transform] duration-200 ease-out data-[open=false]:translate-y-3 data-[open=false]:scale-[0.97] data-[open=false]:opacity-0 motion-reduce:transition-none " +
        "inset-x-2 bottom-2 md:inset-x-auto md:bottom-auto md:w-[380px] " +
        (pos ? "" : left ? "md:left-6 md:top-24" : "md:right-6 md:top-24") + (left ? " border-leaf/40" : " border-sky/60")
      }
    >
      <div
        className={"flex h-10 shrink-0 cursor-grab touch-none select-none items-center justify-between border-b px-3 active:cursor-grabbing " + (left ? "bg-leaf/15" : "bg-sky/30")}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
      >
        <GripHorizontal className="h-4 w-4 text-evergreen-60" />
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-evergreen">
          {left ? <MapIcon className="h-3.5 w-3.5" /> : <Box className="h-3.5 w-3.5" />}
          Details · {place ? "Food help place" : "County"}
        </span>
        <button aria-label="Close" onPointerDown={(e) => e.stopPropagation()} onClick={close} className="rounded-full p-1 text-evergreen-60 transition-colors hover:bg-muted hover:text-evergreen">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div key={place?.id ?? selectedCounty} className="min-h-0 flex-1 animate-in fade-in slide-in-from-bottom-1 overflow-y-auto p-5 duration-200">
        {place ? <PlaceView r={place} back={selectedCounty ? () => select(null) : null} /> : selectedCounty && <CountyView geoid={selectedCounty} onPlace={(id) => select(id)} />}
      </div>
    </div>
  );
}

function CountyView({ geoid, onPlace }: { geoid: string; onPlace: (id: string) => void }) {
  const { setSite } = usePlanner();
  const a = countyAcs[geoid];
  const acc = countyAccess[geoid];
  const name = norm(a?.name ?? "");
  const list = useMemo(() => resources.filter((r) => norm(r.county) === name).sort((x, y) => x.name.localeCompare(y.name)), [name]);
  const byCat = useMemo(() => {
    const m: Partial<Record<Category, number>> = {};
    for (const r of list) m[r.category] = (m[r.category] ?? 0) + 1;
    return m;
  }, [list]);
  const ratio = (n?: number | null, d?: number | null) => (n == null || !d ? null : n / d);
  const moveHere = () => {
    const f = counties.features.find((f) => (f.properties as { GEOID: string }).GEOID === geoid);
    if (!f) return;
    const [lng, lat] = centroid(f as never).geometry.coordinates;
    setSite({ lng, lat });
  };
  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-2xl font-semibold leading-tight">{a?.name ?? "Unavailable"}</h3>
        <p className="text-xs text-evergreen-60">North Carolina</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Big icon={<Users />} label="People" value={a?.population} />
        <Big label="Households" value={a?.households} />
      </div>
      <div className="space-y-3">
        <Bar label="Below poverty line" v={ratio(a?.belowPoverty, a?.povertyUniverse)} nc={NC.poverty} color="var(--color-citrus)" />
        <Bar label="Households without a car" v={ratio(a?.noVehicle, a?.vehicleUniverse)} nc={NC.noCar} color="var(--color-sky)" />
        <Bar label="Households on food stamps" v={ratio(a?.snapHouseholds, a?.snapUniverse)} nc={NC.snap} color="var(--color-aqua)" />
      </div>
      <div className="rounded-2xl bg-muted/60 p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold">Food help on the map</p>
          <p className="font-display text-2xl font-semibold">{acc ? acc.count.toLocaleString() : "Unavailable"}</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) =>
            byCat[c] ? (
              <span key={c} className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-xs">
                <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_HEX[c] }} />
                {CATEGORY_LABEL[c].replace(" (Food & Nutrition Services)", "")} <b>{byCat[c]}</b>
              </span>
            ) : null,
          )}
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs text-evergreen-60">
            <span>Places per 10,000 people</span>
            <b className="text-evergreen">{acc?.per10k == null ? "Unavailable" : acc.per10k.toFixed(1)}</b>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gradient-to-r from-[#eef3e2] via-[#9fcb6b] to-[#3f6e14]">
            {acc?.per10k != null && <div className="relative h-full" style={{ width: `${Math.min(100, Math.sqrt(acc.per10k / ACCESS_MAX) * 100)}%` }}><span className="absolute -right-1 -top-0.5 h-3 w-3 rounded-full border-2 border-card bg-evergreen" /></div>}
          </div>
          <p className="mt-1.5 text-[11px] text-evergreen-60">Counts only places our sources list — a low number can mean missing data.</p>
        </div>
      </div>
      {list.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold">Places in this county</p>
          <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
            {list.map((r) => (
              <li key={r.id}>
                <button onClick={() => onPlace(r.id)} className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: CATEGORY_HEX[r.category] }} />
                  <span className="min-w-0 flex-1 truncate">{r.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button onClick={moveHere} className="inline-flex h-10 items-center gap-2 rounded-full bg-evergreen px-4 text-sm font-medium text-paper">
        <Crosshair className="h-4 w-4" /> Move my pin here
      </button>
      <p className="text-[11px] text-evergreen-60">People, poverty, cars, food stamps: U.S. Census ACS 2019–2023 5-year · places: NC DHHS, Feeding America food banks, Orange County list.</p>
    </div>
  );
}

function Big({ icon, label, value }: { icon?: React.ReactNode; label: string; value?: number | null }) {
  return (
    <div className="rounded-2xl bg-muted/60 p-3">
      <p className="flex items-center gap-1 text-xs text-evergreen-60 [&>svg]:h-3.5 [&>svg]:w-3.5">
        {icon}
        {label}
      </p>
      <p className="font-display text-2xl font-semibold">{value == null ? "Unavailable" : value.toLocaleString()}</p>
    </div>
  );
}

function Bar({ label, v, nc, color }: { label: string; v: number | null; nc: number; color: string }) {
  const max = Math.max(0.35, (v ?? 0) * 1.15, nc * 1.3);
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <b>{v == null ? "Unavailable" : `${(v * 100).toFixed(1)}%`}</b>
      </div>
      <div className="relative mt-1 h-2.5 rounded-full bg-muted">
        {v != null && <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(v / max) * 100}%`, background: color }} />}
        <span className="absolute -top-1 h-4.5 w-0.5 rounded bg-evergreen" style={{ left: `${(nc / max) * 100}%` }} title="NC average" />
      </div>
      <p className="mt-0.5 text-[11px] text-evergreen-60">NC average {(nc * 100).toFixed(1)}%{v != null ? ` · ${v > nc ? "above" : "below"} average` : ""}</p>
    </div>
  );
}

function PlaceView({ r, back }: { r: Resource; back: (() => void) | null }) {
  const { site } = usePlanner();
  const km = distanceM([site.lng, site.lat], [r.lng, r.lat]) / 1000;
  const tel = r.phone ? `tel:${r.phone.replace(/[^\d+]/g, "")}` : null;
  const dir = driveUrl(r.lat, r.lng);
  return (
    <div>
      {back && (
        <button onClick={back} className="mb-3 flex items-center gap-1 text-xs font-medium text-evergreen-60 hover:text-evergreen">
          <ChevronLeft className="h-3.5 w-3.5" /> Back to {r.county ? `${norm(r.county)} County` : "county"}
        </button>
      )}
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: `${CATEGORY_HEX[r.category]}22`, color: CATEGORY_HEX[r.category] }}>
        <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_HEX[r.category] }} />
        {CATEGORY_LABEL[r.category]}
      </span>
      <h3 className="mt-2 font-display text-xl font-semibold leading-tight">{r.name}</h3>
      <dl className="mt-4 space-y-3 text-sm">
        <Row icon={<MapPin />}>
          {r.address || "Unavailable"}
          <span className="block text-xs text-evergreen-60">
            {dist(km * 1000)} straight-line from your pin{r.county ? ` · ${norm(r.county)} County` : ""}
          </span>
        </Row>
        <Row icon={<Clock />}>
          {r.publishedHours ? (
            <>
              <span className="whitespace-pre-line">{r.publishedHours}</span>
              <span className="block text-xs text-evergreen-60">As published by the source — call to confirm</span>
            </>
          ) : (
            "Hours unavailable — call before visiting"
          )}
        </Row>
        <Row icon={<Phone />}>
          {tel ? (
            <a className="font-medium underline-offset-2 hover:underline" href={tel}>
              {r.phone}
            </a>
          ) : (
            "Phone unavailable"
          )}
        </Row>
        {r.program && <Row icon={<Landmark />}>{r.program}</Row>}
      </dl>
      <div className="mt-5 flex flex-wrap gap-2">
        <a href={dir} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full bg-evergreen px-4 text-sm font-medium text-paper">
          <Navigation className="h-4 w-4" /> Drive here
        </a>
        {tel && (
          <a href={tel} className="inline-flex h-10 items-center gap-2 rounded-full border bg-card px-4 text-sm font-medium">
            <Phone className="h-4 w-4" /> Call
          </a>
        )}
        {r.category === "snap-office" && (
          <Link to="/snap" className="inline-flex h-10 items-center rounded-full border bg-card px-4 text-sm font-medium">
            How to apply
          </Link>
        )}
      </div>
      <a href={r.sourceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs text-evergreen-60 hover:underline">
        Source: {r.sourceTitle} <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 shrink-0 text-evergreen-60 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
