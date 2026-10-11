import { useEffect, useMemo, useState } from "react";
import { LocateFixed, LocateOff, Loader2, X, Navigation, Phone } from "lucide-react";
import { startLocation, stopLocation, useLocation } from "@/lib/location";
import { resources, CATEGORY_LABEL } from "@/lib/data";
import { CATEGORY_HEX } from "@/lib/palette";
import { distanceM } from "@/lib/geo";
import { driveUrl } from "@/lib/meals";

const NEAR_MI = 25; // search radius for "near me"
const NEAR_MAX = 25;

// Once location is shared, lists every food help place (pantries, churches, meal sites, SNAP/WIC offices, food banks) nearest first.
function NearMe({ lng, lat, onClose }: { lng: number; lat: number; onClose: () => void }) {
  const near = useMemo(
    () =>
      resources
        .map((r) => ({ r, d: distanceM([lng, lat], [r.lng, r.lat]) / 1609.344 }))
        .filter((x) => x.d <= NEAR_MI)
        .sort((a, b) => a.d - b.d),
    [lng, lat],
  );
  return (
    <div className="z-30 w-80 max-w-[90vw] rounded-2xl bg-card p-3 text-evergreen shadow-lift">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">
          {near.length ? `${near.length} food help place${near.length === 1 ? "" : "s"} within ${NEAR_MI} miles` : `No food help places on file within ${NEAR_MI} miles`}
        </p>
        <button type="button" onClick={onClose} aria-label="Close nearby list" className="rounded-full p-1 hover:bg-muted">
          <X className="size-4" />
        </button>
      </div>
      <ul className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
        {near.slice(0, NEAR_MAX).map(({ r, d }) => (
          <li key={r.id} className="rounded-xl bg-background/60 p-2">
            <div className="flex items-start gap-2">
              <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: CATEGORY_HEX[r.category] }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.name}</p>
                <p className="text-[11px] text-evergreen-60">
                  {CATEGORY_LABEL[r.category]} · {d.toFixed(1)} mi · {r.publishedHours ?? "hours unavailable"}
                </p>
                <div className="mt-1 flex gap-2">
                  <a href={driveUrl(r.lat, r.lng)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-evergreen px-2 py-0.5 text-[11px] font-semibold text-paper">
                    <Navigation className="size-3" /> Drive
                  </a>
                  {r.phone && (
                    <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1 rounded-full bg-sky px-2 py-0.5 text-[11px] font-semibold text-evergreen">
                      <Phone className="size-3" /> Call
                    </a>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {near.length > NEAR_MAX && <p className="mt-2 text-[11px] text-evergreen-60">Showing the nearest {NEAR_MAX}.</p>}
    </div>
  );
}

export function LocateButton({ onLocated, className = "", listPos = "inline", showList = true }: { onLocated?: (lng: number, lat: number) => void; className?: string; listPos?: "inline" | "up" | "down"; showList?: boolean }) {
  const loc = useLocation();
  const on = loc.status === "on";
  const [open, setOpen] = useState(false);
  const [wanted, setWanted] = useState(false);
  useEffect(() => {
    if (on && wanted) {
      setOpen(true);
      setWanted(false);
    }
  }, [on, wanted]);
  return (
    <div className={`relative flex flex-col items-start gap-1 ${className}`}>
      <button
        type="button"
        onClick={() => {
          if (on) {
            onLocated?.(loc.lng, loc.lat);
            setOpen(true);
            return;
          }
          setWanted(true);
          startLocation();
        }}
        onDoubleClick={() => on && stopLocation()}
        className={`inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium shadow-soft ${on ? "bg-sky text-evergreen" : "glass text-evergreen"}`}
        aria-label={on ? "Go to my location" : "Show my location"}
        title={on ? "Go to my location (double-click to stop sharing)" : "Show my location"}
      >
        {loc.status === "asking" ? <Loader2 className="size-4 animate-spin" /> : loc.status === "denied" ? <LocateOff className="size-4" /> : <LocateFixed className="size-4" />}
        {on ? "My location" : loc.status === "asking" ? "Finding you…" : "Show my location"}
      </button>
      {(loc.status === "denied" || loc.status === "unavailable") && (
        <p className="max-w-60 rounded-xl bg-card/95 px-3 py-1.5 text-[11px] text-evergreen-60 shadow-soft">{loc.message}</p>
      )}
      {showList && on && open && <div className={listPos === "up" ? "absolute bottom-full left-0 mb-2" : listPos === "down" ? "absolute left-0 top-full mt-2" : ""}><NearMe lng={loc.lng} lat={loc.lat} onClose={() => setOpen(false)} /></div>}
    </div>
  );
}
