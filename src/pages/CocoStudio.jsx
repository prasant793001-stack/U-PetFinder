// "Meet COCO" - a close-up turntable of the 3D cat with pose buttons.
// URL options: #/coco?pose=sit&angle=0.8 (fixed angle in radians, no turning).
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import RoomLight from '../three/RoomLight';
import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import CocoCat from '../three/CocoModel';
import './pages.css';

const POSES = [['sit', 'Sit'], ['idle', 'Stand'], ['walk', 'Walk'], ['run', 'Run'], ['groom', 'Groom'], ['loaf', 'Loaf'], ['sleep', 'Sleep'], ['purr', 'Purr'], ['crouch', 'Hunt']];

function Spin({ studio, on }) {
  useFrame((_, dt) => { if (on) studio.heading += Math.min(dt, 0.1) * 0.45; });
  return null;
}

export default function CocoStudio() {
  const [params] = useSearchParams();
  const fixed = params.get('angle');
  const [pose, setPose] = useState(params.get('pose') || 'sit');
  const [turn, setTurn] = useState(!fixed);
  const studio = useMemo(() => ({ state: pose, heading: fixed ? Number(fixed) : 0.5 }), []); // eslint-disable-line
  studio.state = pose;
  const zero = useRef(0), no = useRef(false);
  return (
    <div className="page wide studio">
      <header className="page-head"><p className="eyebrow">Meet COCO</p><h1>Your guide to every reunion</h1></header>
      <div className="studio-stage">
        <Canvas dpr={[1, 1.5]} camera={{ position: [0, 1.25, 4.3], fov: 30 }} onCreated={({ camera }) => camera.lookAt(0, 0.7, 0)}>
          <color attach="background" args={['#2a2420']} />
          <hemisphereLight args={['#fff1dc', '#3a2a20', 0.7]} />
          <directionalLight position={[2.5, 4, 3]} intensity={2.2} color="#fff0dd" />
          <directionalLight position={[-3, 2, -3]} intensity={1.4} color="#9fc8ff" />
          <RoomLight intensity={1.05} />
          {/* soft round cushion in the site's sunny colours */}
          <mesh position={[0, -0.19, 0]}><cylinderGeometry args={[1.05, 1.08, 0.13, 64]} /><meshStandardMaterial color="#F6B94A" roughness={0.85} /></mesh>
          <mesh position={[0, -0.125, 0]} scale={[1, 0.12, 1]}><sphereGeometry args={[1.02, 64, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#FFE3A1" roughness={0.95} /></mesh>
          <ContactShadows position={[0, 0.001, 0]} opacity={0.5} scale={3} blur={2.4} far={1.5} />
          <Spin studio={studio} on={turn} />
          <CocoCat studio={studio} petSignal={zero} hopSignal={zero} restSignal={no} scale={1} />
        </Canvas>
      </div>
      <div className="row center">
        {POSES.map(([k, label]) => <button key={k} className={`chip ${pose === k ? 'on' : ''}`} onClick={() => setPose(k)}>{label}</button>)}
        <button className="chip" onClick={() => setTurn((t) => !t)}>{turn ? 'Stop turning' : 'Turn'}</button>
      </div>
    </div>
  );
}
