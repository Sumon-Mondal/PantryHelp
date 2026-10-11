import { useMemo } from "react";
import * as THREE from "three";
import { Apple, Orange } from "./Produce";

// Juice bottles: physically-based glass/PET shells, an inner liquid volume, paper labels and ridged caps.
// Conceptual illustration of "what gets packed" — no brands.

type Juice = { name: string; liquid: string; label: string; ink: string; shape: "tall" | "round" | "carton"; x: number };

const JUICES: Juice[] = [
  { name: "Orange", liquid: "#f39a1e", label: "#fff4dc", ink: "#d9700f", shape: "tall", x: -0.72 },
  { name: "Apple", liquid: "#e9b949", label: "#f3f8e8", ink: "#4f8f2a", shape: "round", x: -0.4 },
  { name: "Cranberry", liquid: "#8f1630", label: "#fbeef0", ink: "#8f1630", shape: "tall", x: -0.1 },
  { name: "Grape", liquid: "#4b1d4f", label: "#f2ecf6", ink: "#5a2a64", shape: "round", x: 0.2 },
  { name: "Green", liquid: "#7fae35", label: "#f5f9ec", ink: "#3f7a24", shape: "tall", x: 0.48 },
  { name: "Orange", liquid: "#f39a1e", label: "#f39a1e", ink: "#ffffff", shape: "carton", x: 0.76 },
];

function labelTexture(j: Juice) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 160;
  const g = c.getContext("2d")!;
  g.fillStyle = j.label;
  g.fillRect(0, 0, 512, 160);
  g.fillStyle = j.ink;
  g.fillRect(0, 0, 512, 10);
  g.fillRect(0, 150, 512, 10);
  // fruit mark
  g.beginPath();
  g.arc(70, 80, 38, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#4f8f2a";
  g.beginPath();
  g.ellipse(86, 38, 16, 7, -0.5, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = j.ink;
  g.font = "bold 56px 'Bricolage Grotesque', Georgia, sans-serif";
  g.textBaseline = "middle";
  g.fillText(j.name, 130, 70);
  g.font = "26px 'Atkinson Hyperlegible', sans-serif";
  g.fillText("100% juice", 132, 118);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function capRidges() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 8;
  const g = c.getContext("2d")!;
  for (let i = 0; i < 128; i += 4) {
    g.fillStyle = "#ffffff";
    g.fillRect(i, 0, 2, 8);
    g.fillStyle = "#000000";
    g.fillRect(i + 2, 0, 2, 8);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

const v = (pts: [number, number][]) => pts.map(([x, y]) => new THREE.Vector2(x, y));

const PROFILES = {
  tall: v([[0, 0], [0.04, 0], [0.046, 0.008], [0.046, 0.19], [0.04, 0.22], [0.02, 0.255], [0.016, 0.275], [0.016, 0.29]]),
  round: v([[0, 0], [0.05, 0], [0.058, 0.012], [0.06, 0.06], [0.056, 0.13], [0.046, 0.16], [0.022, 0.185], [0.018, 0.2], [0.018, 0.215]]),
};

function Bottle({ j }: { j: Juice }) {
  const label = useMemo(() => labelTexture(j), [j]);
  const ridges = useMemo(capRidges, []);
  const shape = j.shape === "carton" ? null : j.shape;
  const outer = useMemo(() => (shape ? new THREE.LatheGeometry(PROFILES[shape], 48) : null), [shape]);
  const liquid = useMemo(() => {
    if (!shape) return null;
    const fillTo = shape === "tall" ? 0.235 : 0.165;
    const pts = PROFILES[shape].filter((p) => p.y <= fillTo).map((p) => new THREE.Vector2(Math.max(0, p.x - 0.004), p.y + 0.003));
    const last = pts[pts.length - 1];
    pts.push(new THREE.Vector2(0, last.y)); // flat top = fill line
    return new THREE.LatheGeometry(pts, 40);
  }, [shape]);

  if (j.shape === "carton") {
    return (
      <group position={[j.x, 0, 0.05]} rotation-y={-0.4}>
        <mesh position-y={0.1} castShadow>
          <boxGeometry args={[0.08, 0.2, 0.08]} />
          <meshStandardMaterial map={label} roughness={0.6} />
        </mesh>
        <mesh position-y={0.225} rotation-z={Math.PI / 4} scale={[1, 1, 1.13]} castShadow>
          <boxGeometry args={[0.057, 0.057, 0.071]} />
          <meshStandardMaterial color={j.label} roughness={0.6} />
        </mesh>
        <mesh position={[0.018, 0.232, 0.018]}>
          <cylinderGeometry args={[0.011, 0.011, 0.012, 16]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
      </group>
    );
  }

  const tall = j.shape === "tall";
  const neckTop = tall ? 0.29 : 0.215;
  const neckR = tall ? 0.016 : 0.018;
  const bodyR = tall ? 0.0465 : 0.0605;
  return (
    <group position={[j.x, 0, (j.x * 7) % 2 > 1 ? -0.08 : 0.06]}>
      {/* liquid first so the transmissive shell refracts it */}
      <mesh geometry={liquid!}>
        <meshPhysicalMaterial color={j.liquid} roughness={0.12} clearcoat={0.5} transmission={0.12} thickness={0.08} ior={1.34} />
      </mesh>
      <mesh geometry={outer!} castShadow>
        <meshPhysicalMaterial
          color="#ffffff"
          transmission={1}
          roughness={tall ? 0.03 : 0.08}
          thickness={0.012}
          ior={tall ? 1.5 : 1.45}
          clearcoat={1}
          clearcoatRoughness={0.05}
          side={THREE.DoubleSide}
          transparent
        />
      </mesh>
      {/* paper label */}
      <mesh position-y={tall ? 0.1 : 0.075}>
        <cylinderGeometry args={[bodyR + 0.001, bodyR + 0.001, tall ? 0.09 : 0.07, 48, 1, true]} />
        <meshStandardMaterial map={label} roughness={0.75} />
      </mesh>
      {/* ridged cap */}
      <mesh position-y={neckTop + 0.012} castShadow>
        <cylinderGeometry args={[neckR + 0.004, neckR + 0.004, 0.026, 32]} />
        <meshStandardMaterial color={j.ink} roughness={0.35} bumpMap={ridges} bumpScale={0.6} />
      </mesh>
    </group>
  );
}

function Tray() {
  return (
    <group position={[0, 0.008, 0]}>
      <mesh receiveShadow castShadow>
        <boxGeometry args={[1.8, 0.016, 0.42]} />
        <meshStandardMaterial color="#b9874f" roughness={0.8} />
      </mesh>
      {[0.2, -0.2].map((z) => (
        <mesh key={z} position={[0, 0.02, z]}>
          <boxGeometry args={[1.8, 0.03, 0.016]} />
          <meshStandardMaterial color="#9c6d3b" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

export function JuiceTable() {
  return (
    <group>
      <Tray />
      <group position-y={0.016}>
        {JUICES.map((j, i) => (
          <Bottle key={i} j={j} />
        ))}
      </group>
      <group position={[-0.55, 0, 0.36]}>
        <Orange />
      </group>
      <group position={[-0.42, 0, 0.4]} rotation-y={1}>
        <Apple />
      </group>
      <group position={[0.62, 0, 0.38]}>
        <Orange s={0.9} />
      </group>
    </group>
  );
}
