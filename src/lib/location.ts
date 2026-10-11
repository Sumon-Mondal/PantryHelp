import { useSyncExternalStore } from "react";

// Live device location, only after the user presses a "Show my location" button (browser asks permission).
export type LocState =
  | { status: "idle" }
  | { status: "asking" }
  | { status: "on"; lng: number; lat: number; accuracyM: number }
  | { status: "denied" | "unavailable"; message: string };

const IDLE: LocState = { status: "idle" };
let state: LocState = IDLE;
let watchId: number | null = null;
const subs = new Set<() => void>();
const set = (s: LocState) => {
  state = s;
  subs.forEach((f) => f());
};

export function startLocation() {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    set({ status: "unavailable", message: "This browser can't share location." });
    return;
  }
  if (watchId != null) return;
  set({ status: "asking" });
  watchId = navigator.geolocation.watchPosition(
    (p) => set({ status: "on", lng: p.coords.longitude, lat: p.coords.latitude, accuracyM: p.coords.accuracy }),
    (e) => {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      watchId = null;
      set(
        e.code === e.PERMISSION_DENIED
          ? { status: "denied", message: "Location permission was blocked. Allow it in your browser settings to see where you are." }
          : { status: "unavailable", message: "Your location couldn't be found right now." },
      );
    },
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
  );
}

export function stopLocation() {
  if (watchId != null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  set({ status: "idle" });
}

export function useLocation() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => state,
    () => IDLE,
  );
}
