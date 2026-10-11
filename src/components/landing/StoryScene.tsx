import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, ContactShadows, RoundedBox } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Counties, Tracts, ResourcePins, Surround } from "@/components/planner/Map3D";
import { HEX } from "@/lib/palette";
import { ProduceItem, type ProduceKind } from "./Produce";
import { JuiceTable } from "./JuiceTable";
import { Snacks } from "./Snacks";
import { CityTiles, YouAreHere } from "@/components/three/City";
import { makeProjector } from "@/lib/geo";
import { DEFAULT_SITE } from "@/lib/data";
import { useLocation } from "@/lib/location";

const proj = makeProjector(DEFAULT_SITE.lng, DEFAULT_SITE.lat);
const storyToW = (lng: number, lat: number): [number, number] => {
  const [e, n] = proj(lng, lat);
  return [e / 1000, n / 1000];
};

// Live location (only after the visitor allows it). Shown when inside the modeled area (~2 km of Fetzer Hall).
function StoryMe() {
  const loc = useLocation();
  if (loc.status !== "on") return null;
  const [x, n] = storyToW(loc.lng, loc.lat);
  if (Math.hypot(x, n) > 2.2) return null;
  return <YouAreHere x={x} z={-n} />;
}

// Scroll-driven story: crate (food arrives) -> sorting table (volunteers) -> rise onto real Chapel Hill tracts.
// The crate/table are conceptual illustrations; tract shapes and heights are sourced data.

const MAP_Y = -12; // the town sits far below the tabletop scene (map units = km)

const KEYS: { pos: number[]; target: number[] }[] = [
  { pos: [2.6, 2.0, 3.4], target: [0.6, 0.2, 0] },
  { pos: [3.6, 0.75, 1.55], target: [3.2, 0.14, 0] },
  { pos: [1.1, MAP_Y + 1.25, 2.1], target: [0, MAP_Y, -0.1] },
  { pos: [-1.5, MAP_Y + 8, 9.5], target: [-1.5, MAP_Y, 0.5] },
  { pos: [-80, MAP_Y + 560, 640], target: [-80, MAP_Y, 70] },
];
const NC_FROM = 0.86; // progress at which the statewide 3D takes over

function woodTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#b9874f";
  g.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 40; i++) {
    g.strokeStyle = `rgba(90,55,25,${0.08 + Math.random() * 0.12})`;
    g.lineWidth = 1 + Math.random() * 2;
    g.beginPath();
    const y = Math.random() * 64;
    g.moveTo(0, y);
    g.bezierCurveTo(80, y + 6 * Math.random(), 170, y - 6 * Math.random(), 256, y);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Crate({ fill }: { fill: React.RefObject<number> }) {
  const tex = useMemo(woodTexture, []);
  const produce = useMemo(() => {
    const kinds: ProduceKind[] = ["apple", "orange", "pear", "lemon", "apple", "orange", "banana", "jar", "apple", "orange", "lemon", "pear"];
    const items: { p: [number, number, number]; kind: ProduceKind; ry: number }[] = [];
    let s = 7;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 24; i++) {
      const layer = Math.floor(i / 9);
      items.push({ p: [((i % 9) % 3 - 1) * 0.22 + (rnd() - 0.5) * 0.06, 0.035 + layer * 0.085, (Math.floor((i % 9) / 3) - 1) * 0.12 + (rnd() - 0.5) * 0.04], kind: kinds[i % kinds.length], ry: rnd() * 6 });
    }
    return items;
  }, []);
  const groupRefs = useRef<(THREE.Object3D | null)[]>([]);
  useFrame(() => {
    const f = fill.current ?? 0;
    groupRefs.current.forEach((o, i) => {
      if (!o) return;
      const show = THREE.MathUtils.clamp(f * produce.length - i, 0, 1);
      o.scale.setScalar(show > 0 ? 1 : 0.0001);
      const base = produce[i].p[1];
      const drop = 1 - show;
      o.position.y = THREE.MathUtils.lerp(o.position.y, base + drop * drop * 0.6 + Math.sin(show * Math.PI) * 0.015, 0.2);
    });
  });
  const slat = (y: number, z: number, w: number, d: number, key: string) => (
    <mesh key={key} position={[0, y, z]} castShadow receiveShadow>
      <boxGeometry args={[w, 0.07, d]} />
      <meshStandardMaterial map={tex} roughness={0.85} />
    </mesh>
  );
  return (
    <group>
      {[0.06, 0.18, 0.3].flatMap((y) => [slat(y, 0.22, 0.8, 0.03, `f${y}`), slat(y, -0.22, 0.8, 0.03, `b${y}`)])}
      {[0.06, 0.18, 0.3].flatMap((y) => [
        <mesh key={`l${y}`} position={[-0.39, y, 0]} castShadow>
          <boxGeometry args={[0.03, 0.07, 0.44]} />
          <meshStandardMaterial map={tex} roughness={0.85} />
        </mesh>,
        <mesh key={`r${y}`} position={[0.39, y, 0]} castShadow>
          <boxGeometry args={[0.03, 0.07, 0.44]} />
          <meshStandardMaterial map={tex} roughness={0.85} />
        </mesh>,
      ])}
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
        <mesh key={`p${sx}${sz}`} position={[sx * 0.385, 0.18, sz * 0.215]} castShadow>
          <boxGeometry args={[0.045, 0.36, 0.045]} />
          <meshStandardMaterial map={tex} color="#c79a62" roughness={0.85} />
        </mesh>
      )))}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[0.78, 0.02, 0.44]} />
        <meshStandardMaterial map={tex} />
      </mesh>
      {produce.map((it, i) => (
        <group key={i} position={it.p} rotation-y={it.ry} ref={(o) => (groupRefs.current[i] = o)} scale={0.0001}>
          <ProduceItem kind={it.kind} />
        </group>
      ))}
    </group>
  );
}

function Table({ position, w = 1.8 }: { position: [number, number, number]; w?: number }) {
  return (
    <group position={position}>
      <RoundedBox args={[w, 0.06, 1]} radius={0.02} position-y={-0.03} receiveShadow castShadow>
        <meshStandardMaterial color="#e9dcc3" roughness={0.7} />
      </RoundedBox>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * (w / 2 - 0.08), -0.42, sz * 0.4]} castShadow>
            <cylinderGeometry args={[0.025, 0.025, 0.78]} />
            <meshStandardMaterial color={HEX.evergreen80} metalness={0.4} roughness={0.4} />
          </mesh>
        )),
      )}
    </group>
  );
}

function SortingStation({ progress }: { progress: React.RefObject<number> }) {
  return (
    <group position={[3.2, 0, 0]}>
      <Table position={[0, 0, 0]} w={2} />
      <JuiceTable />
      <Snacks progress={progress} />
    </group>
  );
}

function TownRing() {
  return (
    <group>
      <mesh position-y={0.03}>
        <cylinderGeometry args={[1.2, 1.2, 0.06, 128, 1, true]} />
        <meshPhysicalMaterial color={HEX.aqua} transparent opacity={0.25} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

function TableTop({ progress, children }: { progress: React.RefObject<number>; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const p = progress.current ?? 0;
    if (ref.current) ref.current.visible = p < 0.82;
  });
  return <group ref={ref}>{children}</group>;
}

function CameraRig({ progress }: { progress: React.RefObject<number> }) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3().fromArray(KEYS[0].target));
  const tmpP = useMemo(() => new THREE.Vector3(), []);
  const tmpT = useMemo(() => new THREE.Vector3(), []);
  const smooth = useRef(progress.current ?? 0);
  useFrame((state, raw) => {
    smooth.current += ((progress.current ?? 0) - smooth.current) * (1 - Math.exp(-3 * Math.min(raw, 0.05)));
    const p = THREE.MathUtils.clamp(smooth.current, 0, 1) * (KEYS.length - 1);
    const i = Math.min(Math.floor(p), KEYS.length - 2);
    const f = THREE.MathUtils.smoothstep(p - i, 0, 1);
    tmpP.fromArray(KEYS[i].pos).lerp(new THREE.Vector3().fromArray(KEYS[i + 1].pos), f);
    tmpT.fromArray(KEYS[i].target).lerp(new THREE.Vector3().fromArray(KEYS[i + 1].target), f);
    // gentle idle sway
    tmpP.x += Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
    const k = 1 - Math.exp(-6 * Math.min(raw, 0.05));
    camera.position.lerp(tmpP, k);
    target.current.lerp(tmpT, k);
    camera.lookAt(target.current);
  });
  return null;
}

export default function StoryScene({ progress, fill }: { progress: React.RefObject<number>; fill: React.RefObject<number> }) {
  return (
    <Canvas shadows dpr={[1, 1.75]} camera={{ position: [2.2, 1.6, 2.6], fov: 40, near: 0.02, far: 4000 }} gl={{ alpha: true, antialias: true, logarithmicDepthBuffer: true }}>
      <hemisphereLight args={[HEX.skyHorizon, "#d9cdb0", 0.7]} />
      <directionalLight position={[3, 6, 3]} intensity={2} color={HEX.sun} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5} />
      <directionalLight position={[0, MAP_Y + 20, 10]} intensity={1.4} color={HEX.sun} />
      <Environment resolution={128}>
        <Lightformer intensity={2.5} position={[0, 5, 0]} scale={[10, 10, 1]} rotation-x={Math.PI / 2} />
        <Lightformer intensity={1.2} color={HEX.sky} position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 2, 1]} />
        <Lightformer intensity={1} color={HEX.sun} position={[5, 1, 1]} rotation-y={-Math.PI / 2} scale={[20, 2, 1]} />
      </Environment>
      <TableTop progress={progress}>
        <Table position={[0, 0, 0]} />
        <Crate fill={fill} />
        <SortingStation progress={progress} />
        <ContactShadows position={[1.6, 0.001, 0]} scale={8} opacity={0.4} blur={2.2} far={1} />
      </TableTop>
      <fog attach="fog" args={[HEX.skyHorizon, 30, 110]} />
      <directionalLight position={[-200, 400, 300]} intensity={0.6} color={HEX.sun} />
      <MapGate progress={progress}>
        <StateLayer progress={progress} />
        <StoryMe />
      </MapGate>
      <FogRig />
      <SkyRig progress={progress} />
      <CameraRig progress={progress} />
    </Canvas>
  );
}

// Town detail up close; past NC_FROM the counties rise by population, green by food help per resident, with every place as a pin.
function StateLayer({ progress }: { progress: React.RefObject<number> }) {
  const [state, setState] = useState(false);
  useFrame(() => {
    const s = (progress.current ?? 0) > NC_FROM;
    if (s !== state) setState(s);
  });
  return (
    <>
      <Counties extruded={state} />
      {state ? (
        <>
          <Surround />
          <ResourcePins />
        </>
      ) : (
        <>
          <Tracts flat />
          <CityTiles toW={storyToW} detailKm={1.5} />
          <TownRing />
        </>
      )}
    </>
  );
}

// The town/state sit far below the table; keep them hidden until the camera starts descending so they never show as pale slabs behind the table.
function MapGate({ progress, children }: { progress: React.RefObject<number>; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.visible = (progress.current ?? 0) > 0.38;
  });
  return (
    <group ref={ref} position-y={MAP_Y} visible={false}>
      {children}
    </group>
  );
}

// Fog scales with camera height so the town stays crisp and the whole state stays visible from high up.
function FogRig() {
  const { scene, camera } = useThree();
  useFrame(() => {
    const f = scene.fog as THREE.Fog | null;
    if (!f) return;
    const h = Math.max(1, camera.position.y - MAP_Y);
    f.near = h < 15 ? 40 : h * 2;
    f.far = h < 15 ? 260 : h * 6;
    // keep depth precision high: far-off state view z-fought with a tiny near plane
    const near = h < 3 ? 0.02 : Math.min(h * 0.05, 20);
    const pc = camera as THREE.PerspectiveCamera;
    if (Math.abs(pc.near - near) > near * 0.2) {
      pc.near = near;
      pc.updateProjectionMatrix();
    }
  });
  return null;
}

// Sky and fog colors blend scene to scene: warm morning at the tables -> clear sky over campus -> aqua-green over the state.
const SKY_STOPS: [number, string][] = [
  [0, "#FBF1DD"],
  [0.22, "#F7F8F2"],
  [0.45, "#D9F0FA"],
  [0.7, "#BFE6F6"],
  [1, "#D6EFE6"],
];
function SkyRig({ progress }: { progress: React.RefObject<number> }) {
  const { scene } = useThree();
  const cur = useMemo(() => new THREE.Color(SKY_STOPS[0][1]), []);
  const a = useMemo(() => new THREE.Color(), []);
  const b = useMemo(() => new THREE.Color(), []);
  useFrame((_, raw) => {
    const p = THREE.MathUtils.clamp(progress.current ?? 0, 0, 1);
    let i = 0;
    while (i < SKY_STOPS.length - 2 && p > SKY_STOPS[i + 1][0]) i++;
    const [p0, c0] = SKY_STOPS[i];
    const [p1, c1] = SKY_STOPS[i + 1];
    const f = THREE.MathUtils.smoothstep(p, p0, p1);
    a.set(c0).lerp(b.set(c1), f);
    cur.lerp(a, 1 - Math.exp(-3 * Math.min(raw, 0.05)));
    if (!(scene.background instanceof THREE.Color)) scene.background = new THREE.Color();
    (scene.background as THREE.Color).copy(cur);
    const fog = scene.fog as THREE.Fog | null;
    if (fog) fog.color.copy(cur);
  });
  return null;
}
