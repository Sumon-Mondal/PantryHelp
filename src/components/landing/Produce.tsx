import { useMemo } from "react";
import * as THREE from "three";

// Hand-built produce: lathe profiles + stems/leaves so fruit reads as real fruit, not balls.

function lathe(points: [number, number][], seg = 32) {
  return new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), seg);
}

let _peel: THREE.CanvasTexture | null = null;
function peelBump() {
  if (_peel) return _peel;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#808080";
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) {
    const v = 90 + Math.random() * 80;
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.beginPath();
    g.arc(Math.random() * 128, Math.random() * 128, 0.6 + Math.random() * 1.2, 0, Math.PI * 2);
    g.fill();
  }
  _peel = new THREE.CanvasTexture(c);
  _peel.wrapS = _peel.wrapT = THREE.RepeatWrapping;
  _peel.repeat.set(3, 2);
  return _peel;
}

let _blush: THREE.CanvasTexture | null = null;
function appleBlush() {
  if (_blush) return _blush;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 64;
  const g = c.getContext("2d")!;
  const grd = g.createLinearGradient(0, 0, 0, 64);
  grd.addColorStop(0, "#9e1f22");
  grd.addColorStop(0.55, "#c7342c");
  grd.addColorStop(1, "#d9a03a");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 64);
  for (let i = 0; i < 60; i++) {
    g.strokeStyle = `rgba(240,200,90,${Math.random() * 0.25})`;
    g.beginPath();
    const x = Math.random() * 128;
    g.moveTo(x, 64);
    g.lineTo(x + (Math.random() - 0.5) * 6, 20 + Math.random() * 30);
    g.stroke();
  }
  _blush = new THREE.CanvasTexture(c);
  _blush.colorSpace = THREE.SRGBColorSpace;
  return _blush;
}

function Stem({ y, tilt = 0.2 }: { y: number; tilt?: number }) {
  return (
    <group position-y={y} rotation-z={tilt}>
      <mesh position-y={0.012}>
        <cylinderGeometry args={[0.0025, 0.004, 0.028, 6]} />
        <meshStandardMaterial color="#5b3a1e" roughness={0.9} />
      </mesh>
      <mesh position={[0.014, 0.02, 0]} rotation={[0.3, 0, -1.0]} scale={[1, 0.25, 0.55]}>
        <sphereGeometry args={[0.016, 10, 6]} />
        <meshStandardMaterial color="#4f8f2a" roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function Apple({ s = 1 }: { s?: number }) {
  const geo = useMemo(
    () => lathe([[0, 0.004], [0.022, 0], [0.042, 0.012], [0.052, 0.035], [0.05, 0.06], [0.038, 0.078], [0.012, 0.08], [0, 0.072]]),
    [],
  );
  return (
    <group scale={s}>
      <mesh geometry={geo} castShadow>
        <meshPhysicalMaterial map={appleBlush()} roughness={0.32} clearcoat={0.7} clearcoatRoughness={0.25} />
      </mesh>
      <Stem y={0.072} />
    </group>
  );
}

export function Pear({ s = 1 }: { s?: number }) {
  const geo = useMemo(
    () => lathe([[0, 0.002], [0.03, 0.004], [0.046, 0.025], [0.044, 0.05], [0.028, 0.075], [0.02, 0.1], [0.012, 0.115], [0, 0.118]]),
    [],
  );
  return (
    <group scale={s}>
      <mesh geometry={geo} castShadow>
        <meshPhysicalMaterial color="#b8c43a" roughness={0.5} clearcoat={0.3} bumpMap={peelBump()} bumpScale={0.3} />
      </mesh>
      <Stem y={0.115} tilt={0.35} />
    </group>
  );
}

export function Orange({ s = 1 }: { s?: number }) {
  return (
    <group scale={s}>
      <mesh position-y={0.048} castShadow>
        <sphereGeometry args={[0.05, 32, 20]} />
        <meshPhysicalMaterial color="#ee8a1c" roughness={0.55} bumpMap={peelBump()} bumpScale={0.6} clearcoat={0.25} />
      </mesh>
      <mesh position-y={0.097}>
        <cylinderGeometry args={[0.006, 0.008, 0.004, 8]} />
        <meshStandardMaterial color="#5f7d2a" />
      </mesh>
    </group>
  );
}

export function Lemon({ s = 1 }: { s?: number }) {
  return (
    <group scale={s} rotation-z={Math.PI / 2}>
      <mesh scale={[1, 1.35, 1]} castShadow>
        <sphereGeometry args={[0.036, 28, 18]} />
        <meshPhysicalMaterial color="#f2d23a" roughness={0.5} bumpMap={peelBump()} bumpScale={0.5} clearcoat={0.2} />
      </mesh>
      {[1, -1].map((d) => (
        <mesh key={d} position-y={d * 0.05} rotation-z={d < 0 ? Math.PI : 0}>
          <coneGeometry args={[0.009, 0.012, 10]} />
          <meshStandardMaterial color="#e6c42f" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

export function Banana({ s = 1 }: { s?: number }) {
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.09, 0.05, 0),
      new THREE.Vector3(-0.05, 0.015, 0),
      new THREE.Vector3(0.02, 0.005, 0),
      new THREE.Vector3(0.08, 0.03, 0),
      new THREE.Vector3(0.1, 0.06, 0),
    ]);
    const g = new THREE.TubeGeometry(curve, 40, 0.019, 5, false);
    // taper the ends
    const pos = g.attributes.position;
    const pts = curve.getSpacedPoints(40);
    for (let i = 0; i < pos.count; i++) {
      const ring = Math.floor(i / 6);
      const t = ring / 40;
      const taper = Math.sin(Math.PI * Math.min(1, Math.max(0.08, t))) * 0.85 + 0.15;
      const c = pts[Math.min(ring, 40)];
      pos.setXYZ(i, c.x + (pos.getX(i) - c.x) * taper, c.y + (pos.getY(i) - c.y) * taper, c.z + (pos.getZ(i) - c.z) * taper);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <group scale={s}>
      <mesh geometry={geo} castShadow>
        <meshStandardMaterial color="#f1cf45" roughness={0.6} flatShading />
      </mesh>
      <mesh position={[0.102, 0.066, 0]} rotation-z={0.6}>
        <cylinderGeometry args={[0.004, 0.006, 0.02, 6]} />
        <meshStandardMaterial color="#4a3a1c" />
      </mesh>
    </group>
  );
}

export function Jar({ s = 1 }: { s?: number }) {
  const geo = useMemo(() => lathe([[0, 0], [0.042, 0], [0.046, 0.01], [0.046, 0.1], [0.036, 0.115], [0.034, 0.125], [0, 0.125]]), []);
  return (
    <group scale={s}>
      <mesh geometry={geo} castShadow>
        <meshPhysicalMaterial color="#ffffff" transmission={1} roughness={0.04} thickness={0.03} ior={1.5} transparent />
      </mesh>
      <mesh position-y={0.055} scale={0.9}>
        <cylinderGeometry args={[0.044, 0.044, 0.1, 24]} />
        <meshPhysicalMaterial color="#b3261e" roughness={0.3} clearcoat={0.6} />
      </mesh>
      <mesh position-y={0.132}>
        <cylinderGeometry args={[0.037, 0.037, 0.018, 28]} />
        <meshStandardMaterial color="#d8a83a" metalness={0.75} roughness={0.3} />
      </mesh>
    </group>
  );
}

export type ProduceKind = "apple" | "pear" | "orange" | "lemon" | "banana" | "jar";
export function ProduceItem({ kind, s }: { kind: ProduceKind; s?: number }) {
  switch (kind) {
    case "apple":
      return <Apple s={s} />;
    case "pear":
      return <Pear s={s} />;
    case "orange":
      return <Orange s={s} />;
    case "lemon":
      return <Lemon s={s} />;
    case "banana":
      return <Banana s={s} />;
    case "jar":
      return <Jar s={s} />;
  }
}
