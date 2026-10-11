import { miles, dist } from "@/lib/units";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, Html } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { booleanPointInPolygon, point } from "@turf/turf";
import type { Polygon, MultiPolygon, Position } from "geojson";
import type { OrbitControls as OrbitImpl } from "three-stdlib";
import { DEFAULT_SITE, CATEGORY_LABEL, type Category, resources, tracts, boundary, countyAcs, countyAccess, ACCESS_MAX, type Resource } from "@/lib/data";
import { PinCard } from "./PinCard";
import { CityTiles, CITIES, type CityId, YouAreHere, OSM_ATTRIBUTION } from "@/components/three/City";
import { useLocation } from "@/lib/location";
import { LocateButton } from "@/components/LocateButton";
import { counties, countyAt, makeProjector } from "@/lib/geo";
import { usePlanner } from "@/lib/planner-store";
import { HEX, CATEGORY_HEX } from "@/lib/palette";
import { driveUrl } from "@/lib/meals";

// 1 world unit = 1 km. Origin = Fetzer Hall. East = +x, North = -z. No rescaling or rotation.
const proj = makeProjector(DEFAULT_SITE.lng, DEFAULT_SITE.lat);
const toW = (lng: number, lat: number): [number, number] => {
  const [e, n] = proj(lng, lat);
  return [e / 1000, n / 1000];
};
const R = 6371008.8;
const k = Math.cos((DEFAULT_SITE.lat * Math.PI) / 180);
const fromW = (x: number, z: number) => ({
  lng: DEFAULT_SITE.lng + ((x * 1000) / (Math.PI * R * k)) * 180,
  lat: DEFAULT_SITE.lat + ((-z * 1000) / (Math.PI * R)) * 180,
});

const MAX_POP = Math.max(...tracts.features.map((t) => t.properties.population));
const tractHeight = (pop: number) => 0.04 + (pop / MAX_POP) * 0.32; // km; height only from sourced population

function polysOf(g: Polygon | MultiPolygon): Position[][][] {
  return g.type === "Polygon" ? [g.coordinates] : g.coordinates;
}
function shapeFrom(rings: Position[][]) {
  const toV = (p: Position) => {
    const [x, n] = toW(p[0], p[1]);
    return new THREE.Vector2(x, n);
  };
  const shape = new THREE.Shape(rings[0].map(toV));
  for (const h of rings.slice(1)) shape.holes.push(new THREE.Path(h.map(toV)));
  return shape;
}

const CITY_MODE = true;
function heightAt(lng: number, lat: number) {
  if (CITY_MODE) return 0.001;
  const p = point([lng, lat]);
  const t = tracts.features.find((f) => booleanPointInPolygon(p, f));
  return t ? tractHeight(t.properties.population) : 0.012;
}

const RAMP = ["#dcebc0", "#b9db8a", "#8fc25a", "#5f9a30", "#356012"].map((c) => new THREE.Color(c));
function rampColor(t: number) {
  const x = THREE.MathUtils.clamp(t, 0, 1) * (RAMP.length - 1);
  const i = Math.min(Math.floor(x), RAMP.length - 2);
  return RAMP[i].clone().lerp(RAMP[i + 1], x - i);
}
const COUNTY_MAX = Math.max(...Object.values(countyAcs).map((c) => c.population ?? 0));
// km; county prism height from sourced ACS population (sqrt so small counties stay visible)
const countyHeight = (pop: number | null | undefined) => (pop == null ? 0.3 : 0.3 + Math.sqrt(pop / COUNTY_MAX) * 9);

export function Counties({ extruded = false, onHover, onPick }: { extruded?: boolean; onHover?: (c: { name: string; pop: number | null; x: number; z: number } | null) => void; onPick?: (c: { geoid: string; x: number; z: number }) => void }) {
  const { fill, lines } = useMemo(() => {
    const geos: THREE.BufferGeometry[] = [];
    const pts: number[] = [];
    const lo = new THREE.Color(HEX.paperDeep);
    const hi = new THREE.Color(HEX.leaf);
    counties.features.forEach((f, i) => {
      const acs = countyAcs[(f.properties as { GEOID: string }).GEOID];
      const pop = acs?.population ?? null;
      const h = extruded ? countyHeight(pop) : 0;
      const isOrange = (f.properties as { NAME: string }).NAME === "Orange";
      const c = extruded
        ? isOrange
          ? new THREE.Color(HEX.citrus)
          : rampColor(Math.pow((countyAccess[(f.properties as { GEOID: string }).GEOID]?.per10k ?? 0) / ACCESS_MAX, 0.45))
        : rampColor(Math.pow((countyAccess[(f.properties as { GEOID: string }).GEOID]?.per10k ?? 0) / ACCESS_MAX, 0.45)).lerp(new THREE.Color(HEX.paper), 0.35);
      for (const poly of polysOf(f.geometry)) {
        const g = extruded ? new THREE.ExtrudeGeometry(shapeFrom(poly), { depth: h, bevelEnabled: false }) : new THREE.ShapeGeometry(shapeFrom(poly));
        const nrm = g.attributes.normal;
        const cols = new Float32Array(g.attributes.position.count * 3);
        const side = c.clone().multiplyScalar(0.82);
        for (let j = 0; j < g.attributes.position.count; j++) (extruded && Math.abs(nrm.getZ(j)) < 0.5 ? side : c).toArray(cols, j * 3);
        g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
        g.deleteAttribute("uv");
        geos.push(g);
        const ring = poly[0];
        for (let j = 0; j < ring.length - 1; j++) {
          const a = toW(ring[j][0], ring[j][1]);
          const b = toW(ring[j + 1][0], ring[j + 1][1]);
          pts.push(a[0], a[1], h + 0.01, b[0], b[1], h + 0.01);
        }
      }
    });
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return { fill: mergeGeometries(geos), lines: lg };
  }, [extruded]);
  return (
    <group rotation-x={-Math.PI / 2}>
      <mesh
        geometry={fill}
        receiveShadow
        position-z={-0.004}
        onPointerMove={
          onHover &&
          ((e) => {
            const p = fromW(e.point.x, e.point.z);
            const f = countyAt(p.lng, p.lat);
            if (!f) return onHover(null);
            const acs = countyAcs[(f.properties as { GEOID: string }).GEOID];
            onHover({ name: `${(f.properties as unknown as { NAME: string }).NAME} County`, pop: acs?.population ?? null, x: e.point.x, z: e.point.z });
          })
        }
        onPointerOut={onHover && (() => onHover(null))}
        onClick={
          onPick &&
          ((e) => {
            e.stopPropagation();
            const p = fromW(e.point.x, e.point.z);
            const f = countyAt(p.lng, p.lat);
            if (f) onPick({ geoid: (f.properties as { GEOID: string }).GEOID, x: e.point.x, z: e.point.z });
          })
        }
      >
        <meshStandardMaterial vertexColors roughness={0.9} />
      </mesh>
      <lineSegments geometry={lines}>
        <lineBasicMaterial color={HEX.evergreen40} transparent opacity={0.6} />
      </lineSegments>
    </group>
  );
}

export function Tracts({ flat = false }: { flat?: boolean }) {
  const items = useMemo(
    () =>
      tracts.features.flatMap((t) =>
        polysOf(t.geometry).map((poly, i) => {
          const h = flat ? 0.0004 : tractHeight(t.properties.population);
          const g = new THREE.ExtrudeGeometry(shapeFrom(poly), { depth: h, bevelEnabled: false });
          const top = new THREE.Color(HEX.paper).lerp(new THREE.Color(HEX.leaf), t.properties.population / MAX_POP);
          return { key: `${t.properties.geoid}-${i}`, g, top, side: top.clone().multiplyScalar(0.8), t: t.properties };
        }),
      ),
    [flat],
  );
  const [hover, setHover] = useState<{ name: string; pop: number; p: THREE.Vector3 } | null>(null);
  const edge = useMemo(() => {
    const pts: number[] = [];
    for (const poly of polysOf(boundary.geometry))
      for (let j = 0; j < poly[0].length - 1; j++) {
        const a = toW(poly[0][j][0], poly[0][j][1]);
        const b = toW(poly[0][j + 1][0], poly[0][j + 1][1]);
        pts.push(a[0], a[1], 0.006, b[0], b[1], 0.006);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <group rotation-x={-Math.PI / 2}>
      {items.map((it) => (
        <mesh
          key={it.key}
          geometry={it.g}
          castShadow
          receiveShadow
          onPointerMove={(e) => {
            e.stopPropagation();
            setHover({ name: it.t.name ?? `Tract ${it.t.geoid}`, pop: it.t.population, p: e.point.clone() });
          }}
          onPointerOut={() => setHover(null)}
        >
          <meshStandardMaterial attach="material-0" color={it.top} roughness={0.7} transparent={flat} opacity={flat ? 0.55 : 1} depthWrite={!flat} />
          <meshStandardMaterial attach="material-1" color={it.side} roughness={0.85} />
        </mesh>
      ))}
      <lineSegments geometry={edge}>
        <lineBasicMaterial color={HEX.evergreen} />
      </lineSegments>
      {hover && (
        <group rotation-x={Math.PI / 2}>
          <Html position={[hover.p.x, hover.p.y + 0.02, hover.p.z]} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
            <div className="whitespace-nowrap rounded-xl bg-card px-3 py-1.5 text-xs text-evergreen shadow-lift">
              <b>{hover.name}</b> · {hover.pop.toLocaleString()} people <span className="text-evergreen-60">(ACS)</span>
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}

function Building({ r, selected, onSelect, scale }: { r: Resource; selected: boolean; onSelect: () => void; scale: number }) {
  const [x, n] = toW(r.lng, r.lat);
  const y = useMemo(() => heightAt(r.lng, r.lat), [r]);
  const [hover, setHover] = useState(false);
  const church = r.category === "ministry" && /church|chapel|tabernacle|baptist|methodist|holy/i.test(r.name);
  const wall = selected ? HEX.citrus : r.category === "food-bank" ? HEX.sun : r.category === "snap-office" || r.category === "wic-office" ? HEX.skyHorizon : HEX.paper;
  const s = scale;
  return (
    <group
      position={[x, y, -n]}
      scale={s}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = "";
      }}
    >
      <mesh position-y={0.5} castShadow>
        <boxGeometry args={[1.2, 1, 0.9]} />
        <meshStandardMaterial color={wall} roughness={0.6} />
      </mesh>
      <mesh position-y={1.25} rotation-y={Math.PI / 4} castShadow>
        <coneGeometry args={[0.95, 0.5, 4]} />
        <meshStandardMaterial color={HEX.evergreen} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.32, 0.46]}>
        <boxGeometry args={[0.3, 0.55, 0.02]} />
        <meshStandardMaterial color={r.category === "snap-office" ? HEX.skyDeep : HEX.leafDeep} />
      </mesh>
      {/* Map-style pin in the category color so food places stand out from ordinary OSM buildings */}
      <mesh position-y={2.1}>
        <cylinderGeometry args={[0.05, 0.05, 1.3, 6]} />
        <meshStandardMaterial color={HEX.evergreen} />
      </mesh>
      <mesh position-y={2.9} castShadow>
        <sphereGeometry args={[selected || hover ? 0.55 : 0.42, 20, 14]} />
        <meshStandardMaterial color={CATEGORY_HEX[r.category]} emissive={CATEGORY_HEX[r.category]} emissiveIntensity={0.25} roughness={0.4} />
      </mesh>
      {church && (
        <group position={[0.35, 1.2, 0]}>
          <mesh position-y={0.35} castShadow>
            <boxGeometry args={[0.3, 0.9, 0.3]} />
            <meshStandardMaterial color={wall} />
          </mesh>
          <mesh position-y={1.0}>
            <coneGeometry args={[0.24, 0.6, 4]} />
            <meshStandardMaterial color={HEX.evergreen} />
          </mesh>
        </group>
      )}
      {(hover || selected) && (
        <Html position={[0, 3.8, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: selected ? "auto" : "none" }}>
          <div className="flex items-center gap-2 whitespace-nowrap rounded-full bg-card py-1 pl-3 pr-1 text-xs font-medium text-evergreen shadow-lift">
            {r.name}
            <a href={driveUrl(r.lat, r.lng)} target="_blank" rel="noreferrer" className="rounded-full bg-evergreen px-2 py-0.5 text-[10px] font-semibold text-paper">
              Drive
            </a>
          </div>
        </Html>
      )}
    </group>
  );
}

export function ResourcePins({ onSelect }: { onSelect?: (id: string) => void }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    resources.forEach((r, i) => {
      const [x, n] = toW(r.lng, r.lat);
      const acs = countyAcs[counties.features.find((f) => (f.properties as { NAME: string }).NAME === r.county)?.properties.GEOID as string];
      o.position.set(x, countyHeight(acs?.population) + 0.9, -n);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.set(CATEGORY_HEX[r.category]));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, []);
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, resources.length]}
      onClick={(e) => {
        e.stopPropagation();
        if (onSelect && e.instanceId != null) onSelect(resources[e.instanceId].id);
      }}
    >
      <octahedronGeometry args={[1.8]} />
      <meshStandardMaterial roughness={0.5} />
    </instancedMesh>
  );
}

// Muted ocean/neighbor surround so the state reads as a finished model instead of floating in empty space.
export function Surround() {
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-0.05} raycast={() => null}>
      <planeGeometry args={[3000, 3000]} />
      <meshStandardMaterial color={HEX.sky} roughness={0.9} />
    </mesh>
  );
}

function Storefront({ onDragStart, hideCard }: { onDragStart: () => void; hideCard?: boolean }) {
  const { site, results } = usePlanner();
  const [x, n] = toW(site.lng, site.lat);
  const y = heightAt(site.lng, site.lat);
  return (
    <group
      position={[x, y, -n]}
      scale={0.022}
      onPointerDown={(e) => {
        e.stopPropagation();
        onDragStart();
      }}
      onPointerOver={() => (document.body.style.cursor = "grab")}
      onPointerOut={() => (document.body.style.cursor = "")}
    >
      <mesh position-y={0.55} castShadow>
        <boxGeometry args={[1.6, 1.1, 1.1]} />
        <meshStandardMaterial color={HEX.paper} roughness={0.5} />
      </mesh>
      <mesh position-y={1.18} castShadow>
        <boxGeometry args={[1.8, 0.16, 1.3]} />
        <meshStandardMaterial color={HEX.evergreen} />
      </mesh>
      <mesh position={[0, 0.85, 0.62]} rotation-x={0.5}>
        <boxGeometry args={[1.5, 0.05, 0.4]} />
        <meshStandardMaterial color={HEX.leaf} />
      </mesh>
      <mesh position={[0, 0.38, 0.56]}>
        <boxGeometry args={[0.9, 0.6, 0.02]} />
        <meshPhysicalMaterial color={HEX.sky} roughness={0.05} metalness={0.1} transmission={0.4} />
      </mesh>
      {!hideCard && (
        <Html position={[1.2, 2.6, 0]} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <PinCard results={results} />
        </Html>
      )}
      <mesh position-y={2.2}>
        <octahedronGeometry args={[0.28]} />
        <meshStandardMaterial color={HEX.citrus} emissive={HEX.citrus} emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

function Ring() {
  const { site, areaCounty } = usePlanner();
  const lines = useMemo(() => {
    const c = areaCounty ? counties.features.find((f) => f.properties.GEOID === areaCounty) : null;
    if (!c) return null;
    const polys = c.geometry.type === "Polygon" ? [c.geometry.coordinates] : c.geometry.coordinates;
    return polys.map((p) => {
      const pts = p[0].map(([lng, lat]) => {
        const [x, n] = toW(lng, lat);
        return new THREE.Vector3(x, 0.04, -n);
      });
      return new THREE.BufferGeometry().setFromPoints(pts);
    });
  }, [areaCounty]);
  if (lines)
    return (
      <group>
        {lines.map((g, i) => (
          <lineLoop key={i} geometry={g}>
            <lineBasicMaterial color={HEX.aquaDeep} />
          </lineLoop>
        ))}
      </group>
    );
  const [x, n] = toW(site.lng, site.lat);
  const r = site.radiusM / 1000;
  return (
    <group position={[x, 0, -n]}>
      <mesh rotation-x={-Math.PI / 2} position-y={0.0025}>
        <ringGeometry args={[r - 0.006, r + 0.006, 160]} />
        <meshBasicMaterial color={HEX.aquaDeep} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Rig({ view, controls }: { view: { kind: "nc" | "site" | "town" | "unc" | "me" | "free" | "zin" | "zout" | CityId; tick: number; at?: [number, number] }; controls: React.RefObject<OrbitImpl | null> }) {
  const { camera } = useThree();
  const { site } = usePlanner();
  const goal = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (view.kind === "free") return;
    if ((view.kind === "zin" || view.kind === "zout") && controls.current) {
      const t = controls.current.target.clone();
      const off = camera.position.clone().sub(t).multiplyScalar(view.kind === "zin" ? 0.55 : 1.8);
      goal.current = { pos: t.clone().add(off), target: t };
      return;
    }
    if (view.kind === "nc") goal.current = { pos: new THREE.Vector3(-60, 1400, 760), target: new THREE.Vector3(-60, 0, 40) };
    else if (view.kind === "town") goal.current = { pos: new THREE.Vector3(-1.5, 7.5, 9), target: new THREE.Vector3(-1.5, 0, 0.5) };
    else if (view.kind === "unc") goal.current = { pos: new THREE.Vector3(1.0, 1.4, 2.2), target: new THREE.Vector3(0, 0, 0) };
    else if (view.kind === "fayetteville" || view.kind === "wilmington" || view.kind === "chapel-hill") {
      const c = CITIES.find((k) => k.id === view.kind)!;
      const [x, n] = toW(c.center[0], c.center[1]);
      goal.current = { pos: new THREE.Vector3(x - 1, 6.5, -n + 8), target: new THREE.Vector3(x, 0, -n) };
    } else if (view.kind === "me" && view.at) {
      const [x, n] = toW(view.at[0], view.at[1]);
      goal.current = { pos: new THREE.Vector3(x + 0.5, 0.6, -n + 0.9), target: new THREE.Vector3(x, 0, -n) };
    }
    else {
      const [x, n] = toW(site.lng, site.lat);
      goal.current = { pos: new THREE.Vector3(x + 0.9, 1.0, -n + 1.7), target: new THREE.Vector3(x, 0, -n) };
    }
    if (reduce && goal.current && controls.current) {
      camera.position.copy(goal.current.pos);
      controls.current.target.copy(goal.current.target);
      goal.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.tick]);
  useFrame((_, raw) => {
    const g = goal.current;
    const c = controls.current;
    if (!g || !c) return;
    const t = 1 - Math.exp(-3.2 * Math.min(raw, 0.05));
    camera.position.lerp(g.pos, t);
    c.target.lerp(g.target, t);
    c.update();
    if (camera.position.distanceTo(g.pos) < 0.02) goal.current = null;
  });
  return null;
}

function Scene({ view }: { view: { kind: "nc" | "site" | "town" | "unc" | "me" | "free" | "zin" | "zout" | CityId; tick: number; at?: [number, number] } }) {
  const { setSite, selectedId, select, selectCounty } = usePlanner();
  const controls = useRef<OrbitImpl | null>(null);
  const [dragging, setDragging] = useState(false);
  const [spot, setSpot] = useState<{ x: number; y: number; z: number } | null>(null);
  const { camera } = useThree();
  const [zoomScale, setZoomScale] = useState(0.06);
  const [far, setFar] = useState(false);
  const loc = useLocation();
  const [focus, setFocus] = useState<[number, number]>([0, 0]);
  const [countyHover, setCountyHover] = useState<{ name: string; pop: number | null; x: number; z: number } | null>(null);
  useFrame(() => {
    const d = controls.current ? camera.position.distanceTo(controls.current.target) : 5;
    const nf = Math.max(d, camera.position.y) > 120;
    const tg = controls.current?.target;
    if (tg && Math.hypot(tg.x - focus[0], tg.z - focus[1]) > 3) setFocus([tg.x, tg.z]);
    if (nf !== far) {
      setFar(nf);
      setCountyHover(null);
    }
    const s = THREE.MathUtils.clamp(d * 0.012, 0.03, 3);
    if (Math.abs(s - zoomScale) / zoomScale > 0.15) setZoomScale(s);
  });

  useEffect(() => {
    const up = () => setDragging(false);
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging) return;
    const p = fromW(e.point.x, e.point.z);
    setSite({ lng: p.lng, lat: p.lat });
  };

  return (
    <>
      <color attach="background" args={[far ? "#dff3ee" : HEX.skyHorizon]} />
      <fog attach="fog" args={[far ? "#dff3ee" : HEX.skyHorizon, far ? 400 : 30, far ? 1400 : 140]} />
      <ambientLight intensity={0.45} />
      <hemisphereLight args={[HEX.skyHorizon, "#d9cdb0", 0.7]} />
      <directionalLight
        position={[6, 10, 4]}
        intensity={2}
        color={HEX.sun}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-camera-far={40}
      />
      <directionalLight position={[-200, 400, 300]} intensity={0.6} color={HEX.sun} />
      <Environment resolution={128}>
        <Lightformer intensity={2.5} position={[0, 5, 0]} scale={[10, 10, 1]} rotation-x={Math.PI / 2} />
        <Lightformer intensity={1.2} color={HEX.sky} position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 2, 1]} />
        <Lightformer intensity={1} color={HEX.sun} position={[5, 1, 1]} rotation-y={-Math.PI / 2} scale={[20, 2, 1]} />
      </Environment>
      <Counties extruded={far} onHover={far ? setCountyHover : undefined} onPick={far ? (c) => selectCounty(c.geoid, "3d") : undefined} />
      {!far && <Tracts flat />}
      {!far && (
        <group
          onClick={(e) => {
            if (e.delta > 4) return;
            e.stopPropagation();
            setSpot({ x: e.point.x, y: e.point.y, z: e.point.z });
          }}
        >
          {CITIES.map((c) => {
            const [x, n] = toW(c.center[0], c.center[1]);
            return Math.hypot(focus[0] - x, focus[1] + n) < 25 ? <CityTiles key={c.id} city={c.id} toW={toW} /> : null;
          })}
        </group>
      )}
      {!far && spot && (() => {
        const { lng, lat } = fromW(spot.x, spot.z);
        return (
          <Html position={[spot.x, spot.y + 0.03, spot.z]} center zIndexRange={[20, 0]}>
            <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-card px-2 py-1 text-[11px] text-evergreen shadow-lift">
              <a href={`https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lng.toFixed(6)}`} target="_blank" rel="noreferrer" className="rounded-full bg-evergreen px-2 py-0.5 font-semibold text-paper">Open in Google Maps</a>
              <a href={driveUrl(lat, lng)} target="_blank" rel="noreferrer" className="rounded-full bg-leaf/30 px-2 py-0.5 font-semibold">Drive</a>
              <button type="button" aria-label="Close" onClick={() => setSpot(null)} className="px-1">×</button>
            </div>
          </Html>
        );
      })()}
      {loc.status === "on" && (() => {
        const [x, n] = toW(loc.lng, loc.lat);
        return <YouAreHere x={x} z={-n} />;
      })()}
      {countyHover && (
        <Html position={[countyHover.x, 12, countyHover.z]} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap rounded-xl bg-card px-3 py-1.5 text-xs text-evergreen shadow-lift">
            <b>{countyHover.name}</b> · {countyHover.pop == null ? "Unavailable" : `${countyHover.pop.toLocaleString()} people`} <span className="text-evergreen-60">(ACS)</span>
          </div>
        </Html>
      )}
      {far && <Surround />}
      {far ? (
        <ResourcePins onSelect={(id) => select(id, "3d")} />
      ) : (
        resources
          .filter((r) => {
            const [x, n] = toW(r.lng, r.lat);
            return Math.hypot(x - focus[0], -n - focus[1]) < 12 || r.id === selectedId;
          })
          .map((r) => <Building key={r.id} r={r} selected={r.id === selectedId} onSelect={() => select(r.id, "3d")} scale={zoomScale} />)
      )}
      <Ring />
      <Storefront onDragStart={() => setDragging(true)} hideCard={far} />
      <mesh rotation-x={-Math.PI / 2} position-y={0.02} onPointerMove={onMove} visible={false}>
        <planeGeometry args={[2000, 2000]} />
        <meshBasicMaterial />
      </mesh>
      <OrbitControls ref={controls} enabled={!dragging} makeDefault maxPolarAngle={Math.PI / 2.15} minDistance={0.5} maxDistance={1500} target={[0, 0.2, 0]} />
      <Rig view={view} controls={controls} />
    </>
  );
}

export default function Map3D() {
  const [view, setView] = useState<{ kind: "nc" | "site" | "town" | "unc" | "me" | "free" | "zin" | "zout" | CityId; tick: number; at?: [number, number] }>({ kind: "site", tick: 0 });
  const loc = useLocation();
  const flewToMe = useRef(false);
  useEffect(() => {
    if (loc.status === "on" && !flewToMe.current) {
      flewToMe.current = true;
      setView((v) => ({ kind: "me", tick: v.tick + 1, at: [loc.lng, loc.lat] }));
    }
  }, [loc]);
  return (
    <div className="relative h-full w-full bg-sky-gradient">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0.9, 1.0, 1.7], fov: 45, near: 0.005, far: 5000 }} gl={{ alpha: true, antialias: true, logarithmicDepthBuffer: true }}>
        <Scene view={view} />
      </Canvas>
      <div className="absolute left-3 top-3 flex flex-wrap items-start gap-2">
        <LocateButton listPos="down" onLocated={(lng, lat) => setView((v) => ({ kind: "me", tick: v.tick + 1, at: [lng, lat] }))} />
        <button className="h-11 rounded-full glass px-4 text-sm font-medium text-evergreen" onClick={() => setView((v) => ({ kind: "site", tick: v.tick + 1 }))}>
          Pin
        </button>
        <button className="h-11 rounded-full glass px-4 text-sm font-medium text-evergreen" onClick={() => setView((v) => ({ kind: "unc", tick: v.tick + 1 }))}>
          UNC
        </button>
        <button className="h-11 rounded-full glass px-4 text-sm font-medium text-evergreen" onClick={() => setView((v) => ({ kind: "town", tick: v.tick + 1 }))}>
          Chapel Hill
        </button>
        <button className="h-11 rounded-full glass px-4 text-sm font-medium text-evergreen" onClick={() => setView((v) => ({ kind: "nc", tick: v.tick + 1 }))}>
          North Carolina
        </button>
      </div>
      <div className="absolute bottom-24 right-3 flex flex-col overflow-hidden rounded-2xl glass shadow-soft">
        <button aria-label="Zoom in" className="size-11 text-lg font-semibold text-evergreen hover:bg-card" onClick={() => setView((v) => ({ kind: "zin", tick: v.tick + 1 }))}>+</button>
        <button aria-label="Zoom out" className="size-11 border-t border-evergreen/10 text-lg font-semibold text-evergreen hover:bg-card" onClick={() => setView((v) => ({ kind: "zout", tick: v.tick + 1 }))}>−</button>
      </div>
      <div className="pointer-events-none absolute left-3 top-16 flex max-w-[70%] flex-wrap gap-x-3 gap-y-1 rounded-2xl bg-card/90 px-3 py-2 text-[11px] text-evergreen shadow-soft">
        {(Object.keys(CATEGORY_HEX) as (keyof typeof CATEGORY_HEX)[]).map((c) => (
          <span key={c} className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full" style={{ background: CATEGORY_HEX[c] }} />
            {CATEGORY_LABEL[c as Category]}
          </span>
        ))}
        <span className="w-full text-evergreen-60">Colored pins = food help (click for details). Click any other building for map links. Right-drag to pan.</span>
      </div>
      <p className="pointer-events-none absolute bottom-2 left-3 rounded-full bg-card/80 px-3 py-1 text-[11px] text-evergreen-60">
        {OSM_ATTRIBUTION} · statewide: county height = ACS population, green = food help places per resident · click a county for its numbers · orange line = town limits · drag the storefront to move it
      </p>
    </div>
  );
}

