import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, RoundedBox } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const AMBER = "#c8f53a";
const TEAL = "#3dd8f0";

type Part = {
  key: string;
  dir: [number, number, number];
  spin: [number, number, number];
  node: React.ReactNode;
};

const input = { x: 0, y: 0, scroll: 0 };

function useInputs() {
  useEffect(() => {
    const move = (e: PointerEvent) => {
      input.x = (e.clientX / window.innerWidth) * 2 - 1;
      input.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    const scroll = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      input.scroll = Math.min(1, window.scrollY / (max * 0.55));
    };
    scroll();
    window.addEventListener("pointermove", move);
    window.addEventListener("scroll", scroll, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", scroll);
    };
  }, []);
}

function Exploding({ parts }: { parts: Part[] }) {
  const refs = useRef<(THREE.Group | null)[]>([]);
  const p = useRef(0);
  useFrame((_, d) => {
    const dt = Math.min(d, 0.05);
    p.current += (input.scroll - p.current) * (1 - Math.exp(-6 * dt));
    const e = p.current * p.current * (3 - 2 * p.current);
    parts.forEach((part, i) => {
      const g = refs.current[i];
      if (!g) return;
      g.position.set(part.dir[0] * e, part.dir[1] * e, part.dir[2] * e);
      g.rotation.set(part.spin[0] * e, part.spin[1] * e, part.spin[2] * e);
    });
  });
  return (
    <>
      {parts.map((part, i) => (
        <group key={part.key} ref={(el) => { refs.current[i] = el; }}>
          {part.node}
        </group>
      ))}
    </>
  );
}

function Battery() {
  const glow = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (glow.current) glow.current.emissiveIntensity = 1.4 + Math.sin(clock.elapsedTime * 2) * 0.5;
  });
  const parts = useMemo<Part[]>(() => {
    const cells: Part[] = [0, 1, 2, 3].map((i) => ({
      key: `cell${i}`,
      dir: [(i % 2 ? 1 : -1) * (1.6 + i * 0.4), (i - 1.5) * 1.1, (i % 2 ? -1 : 1) * 1.2],
      spin: [i * 0.8, i * 1.3, (i % 2 ? 1 : -1) * 1.2],
      node: (
        <mesh position={[0, -1.05 + i * 0.7, 0]} castShadow>
          <cylinderGeometry args={[0.62, 0.62, 0.58, 48]} />
          <meshStandardMaterial
            color={i < 3 ? TEAL : "#2a3a44"}
            emissive={i < 3 ? TEAL : "#000"}
            emissiveIntensity={i < 3 ? 0.35 : 0}
            metalness={0.3}
            roughness={0.35}
          />
        </mesh>
      ),
    }));
    return [
      {
        key: "shell",
        dir: [-2.6, 0.4, -1.5],
        spin: [0.4, -1.2, 0.9],
        node: (
          <mesh>
            <cylinderGeometry args={[0.85, 0.85, 3.2, 64, 1, true]} />
            <meshPhysicalMaterial color="#9fb8c8" transmission={0.85} roughness={0.12} thickness={0.4} transparent opacity={0.55} side={THREE.DoubleSide} />
          </mesh>
        ),
      },
      {
        key: "cap",
        dir: [0.6, 2.4, 0.8],
        spin: [1.4, 0, 0.6],
        node: (
          <group position={[0, 1.7, 0]}>
            <mesh>
              <cylinderGeometry args={[0.88, 0.88, 0.22, 64]} />
              <meshStandardMaterial color="#c8ccd2" metalness={0.9} roughness={0.25} />
            </mesh>
            <mesh position={[0, 0.22, 0]}>
              <cylinderGeometry args={[0.3, 0.3, 0.24, 32]} />
              <meshStandardMaterial color={AMBER} metalness={0.8} roughness={0.2} emissive={AMBER} emissiveIntensity={0.2} />
            </mesh>
          </group>
        ),
      },
      {
        key: "base",
        dir: [0.3, -2.4, 0.6],
        spin: [-1.1, 0.4, 0],
        node: (
          <mesh position={[0, -1.7, 0]}>
            <cylinderGeometry args={[0.88, 0.88, 0.22, 64]} />
            <meshStandardMaterial color="#c8ccd2" metalness={0.9} roughness={0.25} />
          </mesh>
        ),
      },
      {
        key: "core",
        dir: [0, 0, 2.4],
        spin: [0, 2, 0],
        node: (
          <mesh>
            <cylinderGeometry args={[0.12, 0.12, 3, 16]} />
            <meshStandardMaterial ref={glow} color={AMBER} emissive={AMBER} emissiveIntensity={1.5} />
          </mesh>
        ),
      },
      ...cells,
    ];
  }, []);
  return <Exploding parts={parts} />;
}

function SolarPanel() {
  const parts = useMemo<Part[]>(() => {
    const tiles: Part[] = [];
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 4; c++) {
        const x = (c - 1.5) * 0.62;
        const y = (r - 1) * 0.62;
        tiles.push({
          key: `t${r}${c}`,
          dir: [x * 2.2, y * 2.2 + 0.5, (r + c) % 2 ? 1.5 : -1],
          spin: [(r - 1) * 1.5, (c - 1.5) * 1.2, (r + c) * 0.4],
          node: (
            <RoundedBox args={[0.58, 0.58, 0.05]} radius={0.02} position={[x, y, 0.04]}>
              <meshStandardMaterial color="#1b3b6b" metalness={0.6} roughness={0.2} emissive="#16335f" emissiveIntensity={0.3} />
            </RoundedBox>
          ),
        });
      }
    tiles.push({
      key: "frame",
      dir: [0, -1.5, -2],
      spin: [0.8, 0, 0],
      node: (
        <mesh>
          <boxGeometry args={[2.6, 2, 0.04]} />
          <meshStandardMaterial color="#c8ccd2" metalness={0.85} roughness={0.3} />
        </mesh>
      ),
    });
    return tiles;
  }, []);
  return <Exploding parts={parts} />;
}

function Sun() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 1.3) * 0.04);
  });
  return (
    <mesh ref={ref} position={[3.6, 2.6, -4]}>
      <sphereGeometry args={[0.7, 48, 48]} />
      <meshStandardMaterial color="#ffd27a" emissive="#ffb340" emissiveIntensity={2.2} />
    </mesh>
  );
}

function Rig() {
  const root = useRef<THREE.Group>(null);
  useInputs();
  useFrame(({ clock }, d) => {
    const g = root.current;
    if (!g) return;
    const k = 1 - Math.exp(-4 * Math.min(d, 0.05));
    g.rotation.y += (input.x * 0.6 + clock.elapsedTime * 0.08 - g.rotation.y) * k;
    g.rotation.x += (-input.y * 0.3 - g.rotation.x) * k;
    g.position.y = Math.sin(clock.elapsedTime * 0.8) * 0.08 - input.scroll * 0.6;
  });
  return (
    <group ref={root}>
      <group position={[0.4, 0, 0]}>
        <Battery />
      </group>
      <group position={[-2.1, 0.3, -0.8]} rotation={[-0.35, 0.5, 0.1]}>
        <SolarPanel />
      </group>
    </group>
  );
}

export default function EnergyScene() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.4, 7.5], fov: 42 }}
      onCreated={({ gl }) => gl.domElement.parentElement?.setAttribute("data-scene-ready", "")}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 5, 3]} intensity={2} color="#ffe2a8" />
      <pointLight position={[-4, -2, 2]} intensity={12} color={TEAL} />
      <Environment resolution={128}>
        <Lightformer intensity={2} position={[0, 5, 0]} scale={[10, 10, 1]} />
        <Lightformer intensity={1.2} color="#ffcf80" position={[5, 1, -1]} rotation-y={-Math.PI / 2} scale={[20, 2, 1]} />
        <Lightformer intensity={0.8} color="#7fd8c0" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 2, 1]} />
      </Environment>
      <Sun />
      <Rig />
    </Canvas>
  );
}
