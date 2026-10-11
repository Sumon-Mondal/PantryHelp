import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Shelf-stable snacks next to the juice bottles. Conceptual illustration, brand-free artwork.

function label(bg: string, ink: string, title: string, sub: string, w = 256, h = 256) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = ink;
  g.fillRect(0, h * 0.08, w, h * 0.05);
  g.fillRect(0, h * 0.87, w, h * 0.05);
  g.font = `bold ${Math.round(h * 0.17)}px 'Bricolage Grotesque', Georgia, sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(title, w / 2, h * 0.42);
  g.font = `${Math.round(h * 0.1)}px 'Atkinson Hyperlegible', sans-serif`;
  g.fillText(sub, w / 2, h * 0.62);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function CerealBox() {
  const tex = useMemo(() => label("#f4b544", "#7e5000", "Oat Os", "whole grain", 256, 360), []);
  return (
    <mesh castShadow receiveShadow position-y={0.15}>
      <boxGeometry args={[0.2, 0.3, 0.07]} />
      <meshStandardMaterial attach="material-0" color="#e7a83a" roughness={0.7} />
      <meshStandardMaterial attach="material-1" color="#e7a83a" roughness={0.7} />
      <meshStandardMaterial attach="material-2" color="#e7a83a" roughness={0.7} />
      <meshStandardMaterial attach="material-3" color="#e7a83a" roughness={0.7} />
      <meshStandardMaterial attach="material-4" map={tex} roughness={0.6} />
      <meshStandardMaterial attach="material-5" map={tex} roughness={0.6} />
    </mesh>
  );
}

function Crackers() {
  const tex = useMemo(() => label("#b23a22", "#fff4dc", "Crackers", "baked", 256, 160), []);
  return (
    <mesh castShadow receiveShadow position-y={0.045} rotation-y={0.3}>
      <boxGeometry args={[0.2, 0.09, 0.13]} />
      <meshStandardMaterial attach="material-0" color="#a33520" roughness={0.6} />
      <meshStandardMaterial attach="material-1" color="#a33520" roughness={0.6} />
      <meshStandardMaterial attach="material-2" color="#a33520" roughness={0.6} />
      <meshStandardMaterial attach="material-3" color="#a33520" roughness={0.6} />
      <meshStandardMaterial attach="material-4" map={tex} roughness={0.5} />
      <meshStandardMaterial attach="material-5" map={tex} roughness={0.5} />
    </mesh>
  );
}

function Can({ bg = "#f7f8f2", ink = "#b23a22", title = "Tomato", sub = "soup" }) {
  const tex = useMemo(() => {
    const t = label(bg, ink, title, sub, 512, 200);
    return t;
  }, [bg, ink, title, sub]);
  return (
    <group>
      <mesh castShadow receiveShadow position-y={0.055}>
        <cylinderGeometry args={[0.04, 0.04, 0.11, 32, 1, true]} />
        <meshStandardMaterial map={tex} roughness={0.45} side={THREE.DoubleSide} />
      </mesh>
      {[0.004, 0.106].map((y) => (
        <mesh key={y} position-y={y}>
          <cylinderGeometry args={[0.041, 0.041, 0.008, 32]} />
          <meshStandardMaterial color="#c9ccd0" metalness={0.9} roughness={0.25} />
        </mesh>
      ))}
    </group>
  );
}

function PeanutJar() {
  const glass = useMemo(() => {
    const pts = [0, 0.0, 0.05, 0.0, 0.055, 0.01, 0.055, 0.1, 0.045, 0.115, 0.045, 0.125].reduce<THREE.Vector2[]>((a, v, i, arr) => {
      if (i % 2 === 0) a.push(new THREE.Vector2(v, arr[i + 1]));
      return a;
    }, []);
    return new THREE.LatheGeometry(pts, 32);
  }, []);
  const tex = useMemo(() => label("#fff4dc", "#7e5000", "Peanut", "butter", 512, 160), []);
  return (
    <group>
      <mesh geometry={glass} castShadow>
        <meshStandardMaterial color="#b97a3a" roughness={0.35} />
      </mesh>
      <mesh position-y={0.055}>
        <cylinderGeometry args={[0.0565, 0.0565, 0.05, 32, 1, true]} />
        <meshStandardMaterial map={tex} roughness={0.6} />
      </mesh>
      <mesh position-y={0.135} castShadow>
        <cylinderGeometry args={[0.048, 0.048, 0.022, 32]} />
        <meshStandardMaterial color="#123b32" roughness={0.5} />
      </mesh>
    </group>
  );
}

function GranolaBar({ color }: { color: string }) {
  return (
    <group>
      <mesh castShadow position-y={0.012}>
        <boxGeometry args={[0.13, 0.024, 0.04]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.35} />
      </mesh>
      {[-0.07, 0.07].map((x) => (
        <mesh key={x} position={[x, 0.012, 0]}>
          <boxGeometry args={[0.012, 0.012, 0.042]} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

function TrailMix() {
  const bits = useMemo(() => {
    let s = 3;
    const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    return Array.from({ length: 26 }, () => ({
      p: [(r() - 0.5) * 0.09, 0.035 + r() * 0.02, (r() - 0.5) * 0.09] as [number, number, number],
      c: ["#8a5a2b", "#c99556", "#5b3a1e", "#b23a22", "#f4b544"][Math.floor(r() * 5)],
    }));
  }, []);
  return (
    <group>
      <mesh castShadow receiveShadow position-y={0.025}>
        <sphereGeometry args={[0.07, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial color="#f7f8f2" roughness={0.3} side={THREE.DoubleSide} />
      </mesh>
      {bits.map((b, i) => (
        <mesh key={i} position={b.p} scale={[1, 0.7, 1]}>
          <sphereGeometry args={[0.011, 8, 6]} />
          <meshStandardMaterial color={b.c} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function PaperBag() {
  return (
    <group>
      <mesh castShadow receiveShadow position-y={0.11}>
        <boxGeometry args={[0.16, 0.22, 0.1]} />
        <meshStandardMaterial color="#c9a274" roughness={0.95} />
      </mesh>
      {[-0.04, 0.03].map((x, i) => (
        <mesh key={x} position={[x, 0.24, 0]} castShadow>
          <sphereGeometry args={[0.04, 20, 14]} />
          <meshStandardMaterial color={i ? "#b23a22" : "#76ad3b"} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

type Item = { el: React.ReactNode; p: [number, number, number]; ry?: number };

export function Snacks({ progress }: { progress: React.RefObject<number> }) {
  const items: Item[] = [
    { el: <CerealBox />, p: [-0.82, 0, -0.34], ry: 0.2 },
    { el: <PaperBag />, p: [-0.5, 0, -0.34], ry: -0.2 },
    { el: <Crackers />, p: [0.05, 0, -0.33] },
    { el: <Can />, p: [0.35, 0, -0.32] },
    { el: <Can bg="#eef1e6" ink="#3f6e14" title="Veggie" sub="soup" />, p: [0.46, 0, -0.3] },
    { el: <PeanutJar />, p: [0.7, 0, -0.32] },
    { el: <TrailMix />, p: [0.1, 0, 0.34] },
    { el: <GranolaBar color="#42b5b1" />, p: [-0.15, 0, 0.36], ry: 0.4 },
    { el: <GranolaBar color="#f4b544" />, p: [0.3, 0, 0.38], ry: -0.3 },
    { el: <GranolaBar color="#76ad3b" />, p: [-0.2, 0.024, 0.33], ry: 0.1 },
  ];
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    const p = progress.current ?? 0;
    // snacks arrive while the camera moves to the second table
    const f = THREE.MathUtils.clamp((p - 0.06) / 0.14, 0, 1);
    refs.current.forEach((o, i) => {
      if (!o) return;
      const show = THREE.MathUtils.clamp(f * items.length - i, 0, 1);
      o.scale.setScalar(show > 0 ? 1 : 0.0001);
      const drop = 1 - show;
      const y = items[i].p[1] + drop * drop * 0.5 + Math.sin(show * Math.PI) * 0.012;
      o.position.y = THREE.MathUtils.lerp(o.position.y, y, 0.2);
    });
  });
  return (
    <group>
      {items.map((it, i) => (
        <group key={i} position={it.p} rotation-y={it.ry ?? 0} scale={0.0001} ref={(o) => (refs.current[i] = o)}>
          {it.el}
        </group>
      ))}
    </group>
  );
}
