import { useMemo, useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import osm from "@/data/chapel-hill-osm.json";
import cityIndex from "@/data/chapel-hill-index.json";
import fayIndex from "@/data/fayetteville-index.json";
import wilIndex from "@/data/wilmington-index.json";
import { HEX } from "@/lib/palette";

// Real Chapel Hill from OpenStreetMap: building footprints (height from OSM tags, else a typical height by building type),
// streets as ribbons sized by road class, parks/woods as ground. Trees are decorative, scattered inside OSM wooded areas.
// Units: 1 world unit = 1 km, x = east, z = south, ground at y = 0. toW must be the same projector as the map.

type OSM = {
  buildings: { c: number[][]; h: number; s: string; n: string | null; k: string | null }[];
  roads: { c: number[][]; w: number; k: string }[];
  green: { c: number[][]; k: string }[];
};
const data = osm as unknown as OSM;

const ROAD_COLOR: Record<string, string> = { footway: "#e9e4d6", pedestrian: "#e9e4d6", service: "#d9d7cf" };

export function City({ toW, lift = 0, src = data, detail = true }: { toW: (lng: number, lat: number) => [number, number]; lift?: number; src?: OSM; detail?: boolean }) {
  const { buildings, roads, green, wood, treePts } = useMemo(() => {
    const shape = (c: number[][]) => new THREE.Shape(c.map(([x, y]) => new THREE.Vector2(...toW(x, y))));
    // buildings
    const bGeos: THREE.BufferGeometry[] = [];
    const roofs = [new THREE.Color("#8d9196"), new THREE.Color("#a35d45"), new THREE.Color("#6f7b78"), new THREE.Color("#b9a68a")];
    const brick = new THREE.Color("#b5694a");
    const walls = [new THREE.Color("#e8dcc4"), new THREE.Color("#d9c3a5"), new THREE.Color("#cfd3cf")];
    src.buildings.forEach((b, i) => {
      const g = new THREE.ExtrudeGeometry(shape(b.c), { depth: b.h / 1000, bevelEnabled: false });
      g.deleteAttribute("uv");
      const nrm = g.attributes.normal;
      const top = roofs[i % roofs.length];
      const wall = (b.k === "university" || b.k === "church" || b.k === "dormitory" || b.k === "school" ? brick : walls[i % walls.length]).clone();
      const cols = new Float32Array(nrm.count * 3);
      for (let j = 0; j < nrm.count; j++) (Math.abs(nrm.getZ(j)) > 0.5 ? top : wall).toArray(cols, j * 3);
      g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
      bGeos.push(g);
    });
    // roads: quad ribbons
    const pos: number[] = [];
    const col: number[] = [];
    const c = new THREE.Color();
    for (const r of src.roads) {
      const w = r.w / 1000 / 2;
      c.set(ROAD_COLOR[r.k] ?? "#ffffff");
      const p = r.c.map(([x, y]) => toW(x, y));
      for (let i = 0; i < p.length - 1; i++) {
        const [ax, ay] = p[i];
        const [bx, by] = p[i + 1];
        const dx = bx - ax,
          dy = by - ay;
        const L = Math.hypot(dx, dy) || 1;
        const nx = (-dy / L) * w,
          ny = (dx / L) * w;
        const quad = [ax + nx, ay + ny, ax - nx, ay - ny, bx + nx, by + ny, bx + nx, by + ny, ax - nx, ay - ny, bx - nx, by - ny];
        for (let q = 0; q < 6; q++) {
          pos.push(quad[q * 2], quad[q * 2 + 1], r.w > 8 ? 0.0012 : 0.001);
          col.push(c.r, c.g, c.b);
        }
      }
    }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    rg.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    rg.computeVertexNormals();
    // green
    const gGeos: THREE.BufferGeometry[] = [];
    const wGeos: THREE.BufferGeometry[] = [];
    const trees: [number, number][] = [];
    let s = 11;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (const g of src.green) {
      const sh = shape(g.c);
      const geo = new THREE.ShapeGeometry(sh);
      geo.deleteAttribute("uv");
      (g.k === "wood" ? wGeos : gGeos).push(geo);
      if (g.k === "wood") {
        const pts = sh.getPoints();
        const xs = pts.map((p) => p.x),
          ys = pts.map((p) => p.y);
        const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
        const n = Math.min(60, Math.ceil((x1 - x0) * (y1 - y0) * 1500));
        for (let i = 0; i < n * 3 && trees.length < 2500; i++) {
          const px = x0 + rnd() * (x1 - x0),
            py = y0 + rnd() * (y1 - y0);
          if (THREE.ShapeUtils.isClockWise(pts) !== undefined && inPoly(px, py, pts)) trees.push([px, py]);
        }
      }
    }
    return {
      buildings: bGeos.length ? mergeGeometries(bGeos) : null,
      roads: rg,
      green: gGeos.length ? mergeGeometries(gGeos) : null,
      wood: wGeos.length ? mergeGeometries(wGeos) : null,
      treePts: trees,
    };
  }, [toW, src]);

  return (
    <group position-y={lift}>
      <group rotation-x={-Math.PI / 2}>
        {green && (
          <mesh geometry={green} position-z={0.0004} receiveShadow>
            <meshStandardMaterial color="#cfe3b0" roughness={1} />
          </mesh>
        )}
        {wood && (
          <mesh geometry={wood} position-z={0.0006} receiveShadow>
            <meshStandardMaterial color="#a9c98a" roughness={1} />
          </mesh>
        )}
        <mesh geometry={roads} receiveShadow>
          <meshStandardMaterial vertexColors roughness={0.9} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-2} />
        </mesh>
        {buildings && (
          <mesh geometry={buildings} castShadow={detail} receiveShadow>
            <meshStandardMaterial vertexColors roughness={0.75} />
          </mesh>
        )}
      </group>
      {detail && <Trees pts={treePts} />}
    </group>
  );
}

function inPoly(x: number, y: number, pts: THREE.Vector2[]) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i],
      b = pts[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function Trees({ pts }: { pts: [number, number][] }) {
  const crown = useRef<THREE.InstancedMesh>(null);
  const trunk = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    const greens = [HEX.leaf, HEX.leafDeep, "#5f9a3a", "#86b552"];
    pts.forEach(([x, y], i) => {
      const s = 0.8 + ((i * 37) % 10) / 20;
      o.position.set(x, 0.0075 * s, -y);
      o.scale.setScalar(s);
      o.updateMatrix();
      crown.current?.setMatrixAt(i, o.matrix);
      crown.current?.setColorAt(i, c.set(greens[i % greens.length]));
      o.position.set(x, 0.002 * s, -y);
      o.updateMatrix();
      trunk.current?.setMatrixAt(i, o.matrix);
    });
    [crown, trunk].forEach((r) => {
      if (!r.current) return;
      r.current.instanceMatrix.needsUpdate = true;
      if (r.current.instanceColor) r.current.instanceColor.needsUpdate = true;
    });
  }, [pts]);
  if (!pts.length) return null;
  return (
    <>
      <instancedMesh ref={crown} args={[undefined, undefined, pts.length]} castShadow>
        <icosahedronGeometry args={[0.0055, 0]} />
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
      <instancedMesh ref={trunk} args={[undefined, undefined, pts.length]}>
        <cylinderGeometry args={[0.0006, 0.0008, 0.004, 5]} />
        <meshStandardMaterial color="#6b4a2b" />
      </instancedMesh>
    </>
  );
}

export function YouAreHere({ x, z, y = 0 }: { x: number; z: number; y?: number }) {
  const ring = useRef<THREE.Mesh>(null);
  return (
    <group position={[x, y, z]}>
      <PulseRing r={ring} />
      <mesh position-y={0.03}>
        <sphereGeometry args={[0.012, 24, 16]} />
        <meshStandardMaterial color={HEX.skyDeep} emissive={HEX.skyDeep} emissiveIntensity={0.4} />
      </mesh>
      <mesh position-y={0.015}>
        <cylinderGeometry args={[0.0015, 0.0015, 0.03, 8]} />
        <meshStandardMaterial color={HEX.white} />
      </mesh>
    </group>
  );
}

function PulseRing({ r }: { r: React.RefObject<THREE.Mesh | null> }) {
  useFrame(({ clock }) => {
    const t = (clock.elapsedTime % 1.8) / 1.8;
    if (r.current) {
      r.current.scale.setScalar(1 + t * 3);
      (r.current.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - t);
    }
  });
  return (
    <mesh ref={r} rotation-x={-Math.PI / 2} position-y={0.002}>
      <ringGeometry args={[0.012, 0.018, 48]} />
      <meshBasicMaterial color={HEX.skyDeep} transparent depthWrite={false} />
    </mesh>
  );
}

export const OSM_ATTRIBUTION = "Buildings & streets © OpenStreetMap contributors";

// Whole Chapel Hill + Carrboro: OSM split into ~1 km tiles, loaded nearest-first (one at a time so the
// page stays responsive). Tiles near the camera focus get trees + shadows; farther tiles stay plain.
const tileFiles = import.meta.glob("../../data/*-tiles/*.json", { import: "default" }) as Record<string, () => Promise<OSM>>;
type Idx = { tiles: { k: string; c: [number, number]; b: number }[]; boundary: number[][][] };
export type CityId = "chapel-hill" | "fayetteville" | "wilmington";
const INDEX: Record<CityId, Idx> = { "chapel-hill": cityIndex as unknown as Idx, fayetteville: fayIndex as unknown as Idx, wilmington: wilIndex as unknown as Idx };
// Cities with real OSM buildings in 3D, with a center used to decide when to load them.
export const CITIES: { id: CityId; name: string; center: [number, number] }[] = [
  { id: "chapel-hill", name: "Chapel Hill", center: [-79.05, 35.915] },
  { id: "fayetteville", name: "Fayetteville", center: [-78.9, 35.06] },
  { id: "wilmington", name: "Wilmington", center: [-77.9, 34.225] },
];

export function CityTiles({ toW, lift = 0, detailKm = 2.5, city = "chapel-hill" }: { toW: (lng: number, lat: number) => [number, number]; lift?: number; detailKm?: number; city?: CityId }) {
  const idx = INDEX[city];
  const [loaded, setLoaded] = useState<Record<string, OSM>>({});
  const [focus, setFocus] = useState<[number, number]>([0, 0]);
  const { camera, controls } = useThree();
  useFrame(() => {
    const t = (controls as unknown as { target?: THREE.Vector3 } | null)?.target ?? camera.position;
    if (Math.hypot(t.x - focus[0], t.z - focus[1]) > 0.5) setFocus([t.x, t.z]);
  });
  const centers = useMemo(() => idx.tiles.map((t) => ({ k: t.k, w: toW(t.c[0], t.c[1]) })), [toW, idx]);
  const focusRef = useRef(focus);
  focusRef.current = focus;
  useEffect(() => {
    let alive = true;
    const done = new Set<string>();
    const next = async () => {
      if (!alive) return;
      const [fx, fz] = focusRef.current;
      const todo = centers.filter((c) => !done.has(c.k)).sort((a, b) => Math.hypot(a.w[0] - fx, -a.w[1] - fz) - Math.hypot(b.w[0] - fx, -b.w[1] - fz));
      if (!todo.length) return;
      const c = todo[0];
      done.add(c.k);
      const f = tileFiles[`../../data/${city}-tiles/${c.k}.json`];
      if (f) {
        const d = await f();
        if (!alive) return;
        setLoaded((l) => ({ ...l, [c.k]: d }));
      }
      setTimeout(next, 30);
    };
    next();
    return () => {
      alive = false;
    };
  }, [centers, city]);
  return (
    <group>
      {centers.map((c) =>
        loaded[c.k] ? <City key={c.k} toW={toW} lift={lift} src={loaded[c.k]} detail={Math.hypot(c.w[0] - focus[0], -c.w[1] - focus[1]) < detailKm} /> : null,
      )}
      {idx.boundary.length > 0 && <TownLine toW={toW} lift={lift} boundary={idx.boundary} />}
    </group>
  );
}

function TownLine({ toW, lift, boundary }: { toW: (lng: number, lat: number) => [number, number]; lift: number; boundary: number[][][] }) {
  const geo = useMemo(() => {
    const pts: number[] = [];
    for (const ring of boundary)
      for (let i = 0; i < ring.length - 1; i++) {
        const a = toW(ring[i][0], ring[i][1]);
        const b = toW(ring[i + 1][0], ring[i + 1][1]);
        pts.push(a[0], 0.004, -a[1], b[0], 0.004, -b[1]);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [toW, boundary]);
  return (
    <lineSegments geometry={geo} position-y={lift}>
      <lineBasicMaterial color={HEX.citrus} />
    </lineSegments>
  );
}
