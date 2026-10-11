import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, MapPin, Landmark, FileText } from "lucide-react";
import { resources, countyAcs, CATEGORY_LABEL } from "@/lib/data";
import { CATEGORY_HEX } from "@/lib/palette";

type Hit =
  | { kind: "place"; id: string; title: string; sub: string; color: string }
  | { kind: "county"; id: string; title: string; sub: string }
  | { kind: "page"; to: "/plan" | "/meals" | "/snap" | "/sources" | "/"; title: string; sub: string };

const PAGES: Extract<Hit, { kind: "page" }>[] = [
  { kind: "page", to: "/plan", title: "Pantry planner", sub: "Map, 3D view and 28-day plan" },
  { kind: "page", to: "/meals", title: "Meals calculator", sub: "How many meals a family needs" },
  { kind: "page", to: "/snap", title: "Food stamps (SNAP)", sub: "How to apply, documents, deadlines" },
  { kind: "page", to: "/sources", title: "Sources", sub: "Where every number comes from" },
  { kind: "page", to: "/", title: "Home", sub: "The PantryHelp story" },
];
const COUNTIES = Object.entries(countyAcs).map(([id, c]) => ({ id, name: c.name, pop: c.population }));

export function SearchBar() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !/input|textarea/i.test((e.target as HTMLElement).tagName))) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    const out = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    window.addEventListener("keydown", k);
    window.addEventListener("mousedown", out);
    return () => {
      window.removeEventListener("keydown", k);
      window.removeEventListener("mousedown", out);
    };
  }, []);

  const hits = useMemo<Hit[]>(() => {
    const t = q.trim().toLowerCase();
    if (!t) return PAGES.slice(0, 4);
    const words = t.split(/\s+/);
    const m = (s: string) => words.every((w) => s.includes(w));
    const counties: Hit[] = COUNTIES.filter((c) => m(c.name.toLowerCase()))
      .slice(0, 3)
      .map((c) => ({ kind: "county", id: c.id, title: c.name, sub: c.pop == null ? "County" : `County · ${c.pop.toLocaleString()} people` }));
    const places: Hit[] = [];
    for (const r of resources) {
      if (places.length >= 7) break;
      if (m(`${r.name} ${r.address} ${r.county ?? ""} ${CATEGORY_LABEL[r.category]}`.toLowerCase()))
        places.push({ kind: "place", id: r.id, title: r.name, sub: `${CATEGORY_LABEL[r.category]} · ${r.address}`, color: CATEGORY_HEX[r.category] });
    }
    const pages = PAGES.filter((p) => m(`${p.title} ${p.sub}`.toLowerCase()));
    return [...counties, ...places, ...pages];
  }, [q]);

  const go = (h: Hit) => {
    setOpen(false);
    setQ("");
    input.current?.blur();
    if (h.kind === "page") nav({ to: h.to });
    else if (h.kind === "place") nav({ to: "/plan", search: { place: h.id } });
    else nav({ to: "/plan", search: { county: h.id } });
  };

  return (
    <div ref={box} className="relative mx-auto hidden w-full max-w-md min-w-0 md:block">
      <label className="flex h-11 items-center gap-2 rounded-full border bg-card/80 px-4 shadow-soft transition-shadow focus-within:shadow-lift focus-within:ring-2 focus-within:ring-aqua/40">
        <Search className="h-4 w-4 shrink-0 text-evergreen-60" />
        <input
          ref={input}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setI(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") (e.preventDefault(), setI((x) => Math.min(x + 1, hits.length - 1)));
            else if (e.key === "ArrowUp") (e.preventDefault(), setI((x) => Math.max(x - 1, 0)));
            else if (e.key === "Enter" && hits[i]) go(hits[i]);
            else if (e.key === "Escape") (setOpen(false), input.current?.blur());
          }}
          placeholder="Search pantries, counties, addresses…"
          aria-label="Search"
          className="min-w-0 flex-1 bg-transparent text-sm text-evergreen outline-none placeholder:text-evergreen-60"
        />
        <kbd className="hidden shrink-0 rounded-md border px-1.5 text-[10px] text-evergreen-60 lg:block">⌘K</kbd>
      </label>
      {open && (
        <div className="absolute inset-x-0 top-13 z-50 max-h-[70vh] overflow-y-auto rounded-2xl border bg-card/95 p-1.5 shadow-lift backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-150">
          {hits.length === 0 && <p className="px-3 py-4 text-sm text-evergreen-60">Nothing found for “{q}”.</p>}
          {hits.map((h, n) => (
            <button
              key={`${h.kind}-${"id" in h ? h.id : h.to}`}
              onMouseEnter={() => setI(n)}
              onClick={() => go(h)}
              className={"flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left " + (n === i ? "bg-muted" : "")}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-paper-deep text-evergreen [&>svg]:h-4 [&>svg]:w-4">
                {h.kind === "place" ? <MapPin style={{ color: h.color }} /> : h.kind === "county" ? <Landmark /> : <FileText />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-evergreen">{h.title}</span>
                <span className="block truncate text-xs text-evergreen-60">{h.sub}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
