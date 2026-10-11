import { createPortal } from "react-dom";
import { PinCard } from "./PinCard";
import { LocateButton } from "@/components/LocateButton";
import { useLocation } from "@/lib/location";
import { useEffect, useRef, useState } from "react";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import type { Map as MLMap, Marker, GeoJSONSource } from "maplibre-gl";
import { boundary, resources, tracts, CATEGORY_LABEL, countyAccess, countyAcs, ACCESS_MAX, type Category } from "@/lib/data";
import { ring, distanceM, counties, countyAt } from "@/lib/geo";
import { usePlanner } from "@/lib/planner-store";
import { HEX, CATEGORY_HEX } from "@/lib/palette";

// "Need" overlays: each county's Census numbers scaled 0..1 against the highest NC county; -1 = Unavailable.
const rate = (a?: number | null, b?: number | null) => (a != null && b ? a / b : null);
const needVals = counties.features.map((f) => {
  const c = countyAcs[(f.properties as { GEOID: string }).GEOID];
  return { pop: c?.population ?? null, pov: rate(c?.belowPoverty, c?.povertyUniverse), car: rate(c?.noVehicle, c?.vehicleUniverse) };
});
const mx = (k: "pop" | "pov" | "car") => Math.max(...needVals.map((v) => v[k] ?? 0)) || 1;
const MX = { pop: mx("pop"), pov: mx("pov"), car: mx("car") };
export type Overlay = "access" | "pop" | "pov" | "car";
const OVERLAY_LABEL: Record<Overlay, string> = { access: "Food help", pop: "People", pov: "Poverty", car: "No car" };
const OVERLAY_NOTE: Record<Overlay, string> = {
  access: "food help places per resident",
  pop: "people (Census ACS)",
  pov: "share below the poverty line (Census ACS)",
  car: "households without a car (Census ACS)",
};

const countyFC = {
  type: "FeatureCollection" as const,
  features: counties.features.map((f, i) => {
    const g = (f.properties as { GEOID: string }).GEOID;
    const a = countyAccess[g];
    const name = `${(f.properties as { NAME: string }).NAME} County`;
    return {
      ...f,
      properties: {
        share: a?.per10k == null ? 0 : Math.sqrt(a.per10k / ACCESS_MAX),
        pop: needVals[i].pop == null ? -1 : Math.sqrt(needVals[i].pop! / MX.pop),
        pov: needVals[i].pov == null ? -1 : needVals[i].pov! / MX.pov,
        car: needVals[i].car == null ? -1 : needVals[i].car! / MX.car,
        label: a?.per10k == null ? `${name}: Unavailable` : `${name}: ${a.count} food help places listed (${a.per10k.toFixed(1)} per 10,000 people)`,
      },
    };
  }),
};

const resourceFC = {
  type: "FeatureCollection" as const,
  features: resources.map((r) => ({
    type: "Feature" as const,
    id: r.id,
    properties: { id: r.id, name: r.name, category: r.category, color: CATEGORY_HEX[r.category], inside: r.inChapelHill },
    geometry: { type: "Point" as const, coordinates: [r.lng, r.lat] },
  })),
};

function fillFor(o: Overlay) {
  if (o === "access") return ["interpolate", ["linear"], ["get", "share"], 0, HEX.paper, 0.35, "#d6ebbb", 0.7, HEX.leaf, 1, HEX.leafDeep];
  return ["case", ["<", ["get", o], 0], "#d8d8d2", ["interpolate", ["linear"], ["get", o], 0, HEX.paper, 0.4, "#f7d68a", 0.7, HEX.citrus, 1, HEX.tomato]];
}

// Service area outline: the selected county (falls back to the old ring outside NC).
function areaShape(geoid: string | null, s: { lng: number; lat: number; radiusM: number }) {
  const c = geoid ? counties.features.find((f) => f.properties.GEOID === geoid) : null;
  return c ?? ring(s.lng, s.lat, s.radiusM);
}

export default function FlatMap() {
  const { site, setSite, selectedId, select, flyTick, areaCounty } = usePlanner();
  const areaRef = useRef(areaCounty);
  areaRef.current = areaCounty;
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [overlay, setOverlay] = useState<Overlay>("access");
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer("county-fill")) return;
    map.setPaintProperty("county-fill", "fill-color", fillFor(overlay) as never);
    map.setPaintProperty("county-fill", "fill-opacity", overlay === "access" ? 0.55 : 0.7);
  }, [overlay]);
  const markerRef = useRef<Marker | null>(null);
  const cardMarkerRef = useRef<Marker | null>(null);
  const [cardEl, setCardEl] = useState<HTMLDivElement | null>(null);
  const siteRef = useRef(site);
  siteRef.current = site;
  const { selectCounty } = usePlanner();
  const countyRef = useRef(selectCounty);
  countyRef.current = selectCounty;
  const selectRef = useRef(select);
  selectRef.current = select;

  useEffect(() => {
    let cancelled = false;
    let map: MLMap | null = null;
    (async () => {
      const ml = await import("maplibre-gl");
      ml.setWorkerUrl(workerUrl);
      if (cancelled || !el.current) return;
      map = new ml.Map({
        container: el.current,
        style: "https://tiles.openfreemap.org/styles/positron",
        center: [site.lng, site.lat],
        zoom: 13.6,
        attributionControl: { compact: true },
      });
      mapRef.current = map;
      map.addControl(new ml.NavigationControl({ visualizePitch: false }), "bottom-right");

      const pinEl = document.createElement("div");
      pinEl.innerHTML = `<svg width="34" height="44" viewBox="0 0 34 44"><path d="M17 43s15-14.5 15-26A15 15 0 0 0 2 17c0 11.5 15 26 15 26z" fill="${HEX.citrus}" stroke="${HEX.evergreen}" stroke-width="2"/><circle cx="17" cy="17" r="6" fill="${HEX.evergreen}"/></svg>`;
      pinEl.style.cursor = "grab";
      pinEl.setAttribute("aria-label", "Proposed pantry pin, drag to move");
      const marker = new ml.Marker({ element: pinEl, draggable: true, anchor: "bottom" }).setLngLat([site.lng, site.lat]).addTo(map);
      marker.on("drag", () => {
        const p = marker.getLngLat();
        setSite({ lng: p.lng, lat: p.lat });
      });
      markerRef.current = marker;
      const cardEl = document.createElement("div");
      cardEl.style.pointerEvents = "none";
      cardMarkerRef.current = new ml.Marker({ element: cardEl, anchor: "bottom-left", offset: [22, -30] }).setLngLat([site.lng, site.lat]).addTo(map);
      setCardEl(cardEl);

      map.on("load", () => {
        if (!map) return;
        const maxPop = Math.max(...tracts.features.map((t) => t.properties.population));
        map.addSource("counties", { type: "geojson", data: countyFC as never });
        map.addLayer({
          id: "county-fill",
          type: "fill",
          source: "counties",
          paint: {
            "fill-color": fillFor("access") as never,
            "fill-opacity": 0.55,
          },
        });
        map.addLayer({ id: "county-line", type: "line", source: "counties", paint: { "line-color": HEX.leafDeep, "line-width": 0.6, "line-opacity": 0.45 } });
        map.on("mousemove", "county-fill", (e) => {
          const f = e.features?.[0]?.properties as { label?: string } | undefined;
          map!.getCanvas().title = f?.label ?? "";
        });
        map.addSource("tracts", { type: "geojson", data: tracts as never });
        map.addLayer({
          id: "tracts-fill",
          type: "fill",
          source: "tracts",
          paint: {
            "fill-color": ["interpolate", ["linear"], ["get", "population"], 0, HEX.paper, maxPop, HEX.leaf],
            "fill-opacity": 0.38,
          },
        });
        map.addLayer({ id: "tracts-line", type: "line", source: "tracts", paint: { "line-color": HEX.leafDeep, "line-width": 0.8, "line-opacity": 0.5 } });
        map.addSource("town", { type: "geojson", data: boundary as never });
        map.addLayer({ id: "town-line", type: "line", source: "town", paint: { "line-color": HEX.evergreen, "line-width": 2.2, "line-dasharray": [3, 1.5] } });
        map.addSource("ring", { type: "geojson", data: areaShape(areaRef.current, siteRef.current) as never });
        map.addLayer({ id: "ring-fill", type: "fill", source: "ring", paint: { "fill-color": HEX.aqua, "fill-opacity": 0.12 } });
        map.addLayer({ id: "ring-line", type: "line", source: "ring", paint: { "line-color": HEX.aqua, "line-width": 2.5 } });
        map.addSource("res", { type: "geojson", data: resourceFC as never });
        map.addLayer({
          id: "res-pt",
          type: "circle",
          source: "res",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 3, 12, 6, 15, 9],
            "circle-color": ["case", ["boolean", ["feature-state", "sel"], false], HEX.citrus, ["get", "color"]],
            "circle-stroke-color": HEX.white,
            "circle-stroke-width": 2,
          },
        });
        map.addLayer({
          id: "res-label",
          type: "symbol",
          source: "res",
          minzoom: 14,
          layout: { "text-field": ["get", "name"], "text-size": 12, "text-offset": [0, 1.2], "text-anchor": "top", "text-max-width": 10 },
          paint: { "text-color": HEX.evergreen, "text-halo-color": HEX.white, "text-halo-width": 1.5 },
        });
        map.on("click", (e) => {
          if (map!.queryRenderedFeatures(e.point, { layers: ["res-pt"] }).length) return;
          const f = countyAt(e.lngLat.lng, e.lngLat.lat);
          if (f) countyRef.current((f.properties as { GEOID: string }).GEOID, "flat");
        });
        map.on("click", "res-pt", (e) => {
          const id = e.features?.[0]?.properties?.id as string | undefined;
          if (id) selectRef.current(id, "flat");
        });
        map.on("mouseenter", "res-pt", () => (map!.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", "res-pt", () => (map!.getCanvas().style.cursor = ""));
        map.fitBounds(ringBounds(), { padding: 40, duration: 0 });
        const ro = new ResizeObserver(() => map?.resize());
        if (el.current) ro.observe(el.current);
        map.once("remove", () => ro.disconnect());
      });
    })();
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function ringBounds(): [[number, number], [number, number]] {
    const s = siteRef.current;
    const c = ring(s.lng, s.lat, s.radiusM).geometry.coordinates[0];
    const xs = c.map((p) => p[0]),
      ys = c.map((p) => p[1]);
    return [
      [Math.min(...xs), Math.min(...ys)],
      [Math.max(...xs), Math.max(...ys)],
    ];
  }

  // live "you are here" dot (only after the user allows location)
  const loc = useLocation();
  const meRef = useRef<Marker | null>(null);
  const flew = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (loc.status !== "on") {
      meRef.current?.remove();
      meRef.current = null;
      return;
    }
    if (!meRef.current) {
      import("maplibre-gl").then((ml) => {
        const d = document.createElement("div");
        d.className = "ph-me";
        d.setAttribute("aria-label", "Your location");
        meRef.current = new ml.Marker({ element: d }).setLngLat([loc.lng, loc.lat]).addTo(map);
      });
    } else meRef.current.setLngLat([loc.lng, loc.lat]);
    if (!flew.current) {
      flew.current = true;
      map.flyTo({ center: [loc.lng, loc.lat], zoom: 15 });
    }
  }, [loc]);

  // keep ring + marker in sync
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markerRef.current?.setLngLat([site.lng, site.lat]);
    cardMarkerRef.current?.setLngLat([site.lng, site.lat]);
    (map.getSource("ring") as GeoJSONSource | undefined)?.setData(areaShape(areaCounty, site) as never);
  }, [site, areaCounty]);

  // fit the chosen county
  const firstArea = useRef(true);
  useEffect(() => {
    const map = mapRef.current;
    if (firstArea.current) { firstArea.current = false; return; }
    const c = areaCounty ? counties.features.find((f) => f.properties.GEOID === areaCounty) : null;
    if (!map || !c) return;
    const pts = (c.geometry.type === "Polygon" ? [c.geometry.coordinates] : c.geometry.coordinates).flatMap((p) => p[0]);
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    map.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], { padding: 40, duration: 0 });
  }, [areaCounty]);

  // selection highlight + fly
  const prevSel = useRef<string | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getSource("res")) return;
    if (prevSel.current) map.setFeatureState({ source: "res", id: prevSel.current }, { sel: false });
    prevSel.current = selectedId;
    if (!selectedId) return;
    map.setFeatureState({ source: "res", id: selectedId }, { sel: true });
    const r = resources.find((x) => x.id === selectedId);
    if (!r) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.flyTo({ center: [r.lng, r.lat], zoom: Math.max(map.getZoom(), 14.5), duration: reduce ? 0 : 900 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, flyTick]);

  return (
    <div className="relative h-full w-full">
      <div ref={el} className="h-full w-full" role="application" aria-label="Flat map of the area around the pin" />
      {cardEl && createPortal(<PinCard />, cardEl)}
      <button
        type="button"
        className="absolute bottom-24 left-3 h-11 rounded-full glass px-4 text-sm font-medium text-evergreen shadow-soft"
        onClick={() => mapRef.current?.fitBounds([[-84.33, 33.84], [-75.46, 36.59]], { padding: 30 })}
      >
        All of NC
      </button>
      <LocateButton listPos="up" className="absolute bottom-10 left-3" onLocated={(lng, lat) => mapRef.current?.flyTo({ center: [lng, lat], zoom: 15 })} />
      <div className="pointer-events-none absolute left-3 top-3 flex max-w-[60%] flex-wrap gap-x-3 gap-y-1 rounded-2xl bg-card/90 px-3 py-2 text-[11px] text-evergreen shadow-soft">
        {(Object.keys(CATEGORY_HEX) as (keyof typeof CATEGORY_HEX)[]).map((c) => (
          <span key={c} className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full border border-card" style={{ background: CATEGORY_HEX[c] }} />
            {CATEGORY_LABEL[c as Category]}
          </span>
        ))}
        <span className="flex w-full items-center gap-1.5 pt-1">
          County shade: {OVERLAY_NOTE[overlay]}
          <span className="h-2 w-16 rounded-full" style={{ background: overlay === "access" ? `linear-gradient(90deg, ${HEX.paper}, ${HEX.leaf}, ${HEX.leafDeep})` : `linear-gradient(90deg, ${HEX.paper}, ${HEX.citrus}, ${HEX.tomato})` }} />
          {overlay !== "access" && <span className="text-evergreen-60">grey = Unavailable</span>}
        </span>
      </div>
      <div className="absolute bottom-40 left-3 flex flex-col gap-1 rounded-2xl glass p-1.5 shadow-soft" role="radiogroup" aria-label="County colors">
        <span className="px-2 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-evergreen-60">Color counties by</span>
        {(Object.keys(OVERLAY_LABEL) as Overlay[]).map((o) => (
          <button key={o} type="button" role="radio" aria-checked={overlay === o} onClick={() => setOverlay(o)} className={`rounded-full px-3 py-1.5 text-left text-xs font-medium ${overlay === o ? "bg-evergreen text-paper" : "text-evergreen hover:bg-card"}`}>
            {OVERLAY_LABEL[o]}
          </button>
        ))}
      </div>
    </div>
  );
}
