import { miles, dist } from "@/lib/units";
import { Link } from "@tanstack/react-router";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Search } from "lucide-react";
import { CATEGORY_LABEL, resources, ungeocoded, type Category } from "@/lib/data";
import { distanceM } from "@/lib/geo";
import { usePlanner } from "@/lib/planner-store";
import { Chip, fmt, pct } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Sort = "distance" | "name" | "town";

export function ResourceList() {
  const { site, selectedId, select, evidence } = usePlanner();
  const [scope, setScope] = useState<"ring" | "all">("all");
  const [sort, setSort] = useState<Sort>("distance");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "any">("any");
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    let r = resources.map((x) => ({ ...x, d: distanceM([site.lng, site.lat], [x.lng, x.lat]) }));
    if (scope === "ring") r = r.filter((x) => x.d <= site.radiusM);
    if (cat !== "any") r = r.filter((x) => x.category === cat);
    if (t) r = r.filter((x) => `${x.name} ${x.address} ${x.county ?? ""}`.toLowerCase().includes(t));
    r.sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : sort === "town" ? Number(b.inChapelHill) - Number(a.inChapelHill) || a.d - b.d : a.d - b.d));
    return r;
  }, [site, scope, sort, q, cat]);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = Math.max(0, Math.min(rows.length - 1, cursor + (e.key === "ArrowDown" ? 1 : -1)));
      setCursor(n);
      (listRef.current?.children[n] as HTMLElement | undefined)?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" && rows[cursor]) select(rows[cursor].id);
  };

  const cats = Object.keys(CATEGORY_LABEL) as Category[];

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b p-4">
        <label className="flex h-11 items-center gap-2 rounded-full border bg-card px-4">
          <Search className="size-4 text-evergreen-60" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, address or county" className="w-full bg-transparent text-sm outline-none placeholder:text-evergreen-60" />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button variant="chip" size="sm" data-active={scope === "all"} onClick={() => setScope("all")}>All stored sites</Button>
          <Button variant="chip" size="sm" data-active={scope === "ring"} onClick={() => setScope("ring")}>Inside the ring</Button>
          <span className="mx-1 w-px bg-border" />
          {(["distance", "name", "town"] as Sort[]).map((s) => (
            <Button key={s} variant="chip" size="sm" data-active={sort === s} onClick={() => setSort(s)}>
              {s === "distance" ? "Nearest" : s === "name" ? "A–Z" : "In Chapel Hill first"}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button variant="chip" size="sm" data-active={cat === "any"} onClick={() => setCat("any")}>Every kind</Button>
          {cats.map((c) => (
            <Button key={c} variant="chip" size="sm" data-active={cat === c} onClick={() => setCat(c)}>{CATEGORY_LABEL[c]}</Button>
          ))}
        </div>
        <p className="text-xs text-evergreen-60">{rows.length} of {resources.length} geocoded places · use arrow keys and Enter</p>
      </div>
      <ul ref={listRef} tabIndex={0} onKeyDown={onKey} className="flex-1 overflow-y-auto outline-none" aria-label="Food resources">
        {rows.map((r, i) => (
          <li key={r.id}>
            <button
              onClick={() => {
                setCursor(i);
                select(r.id);
              }}
              className={cn(
                "flex min-h-14 w-full flex-col gap-1 border-b px-4 py-3 text-left transition-colors duration-[160ms] hover:bg-paper-deep",
                r.id === selectedId && "bg-citrus-tint",
                i === cursor && "ring-2 ring-inset ring-aqua",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-medium text-evergreen">{r.name}</span>
                <span className="shrink-0 font-mono text-xs text-evergreen-80">{dist(r.d)}</span>
              </div>
              <span className="text-xs text-evergreen-60">{r.address}</span>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-evergreen-80">
                <span className="rounded-full bg-paper-deep px-2 py-0.5">{CATEGORY_LABEL[r.category]}</span>
                <span className="rounded-full bg-paper-deep px-2 py-0.5">{r.inChapelHill ? "Inside Chapel Hill" : r.county ? `${r.county} County` : "Outside Chapel Hill"}</span>
                <Chip kind="sourced" />
                {r.publishedHours ? <span className="text-evergreen-60">Hours: {r.publishedHours} (unverified)</span> : <span className="text-evergreen-60">Hours unavailable</span>}
                <span className="text-evergreen-60">· Capacity unavailable</span>
                {r.category === "snap-office" && (
                  <Link to="/snap" onClick={(e) => e.stopPropagation()} className="font-medium text-leaf-deep underline">
                    How to apply
                  </Link>
                )}
              </div>
            </button>
          </li>
        ))}
        {evidence.tractsInRing.length > 0 && (
          <li className="bg-paper-deep/60 px-4 py-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-evergreen-60">Census tracts meeting the ring</h4>
            <ul className="mt-2 space-y-1">
              {evidence.tractsInRing.map((t) => (
                <li key={t.geoid} className="flex justify-between text-sm">
                  <span>{t.name} <span className="font-mono text-xs text-evergreen-60">{t.geoid}</span></span>
                  <span className="tabular-nums text-evergreen-80">{fmt(t.people)} people · {pct(t.share, 0)} of tract</span>
                </li>
              ))}
            </ul>
          </li>
        )}
        <li className="px-4 py-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-evergreen-60">No coordinate published</h4>
          <ul className="mt-1 text-sm text-evergreen-60">
            {ungeocoded.map((n) => (
              <li key={n} className="py-1">{n}</li>
            ))}
          </ul>
        </li>
      </ul>
    </div>
  );
}
