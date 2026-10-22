// "Meet COCO" - a close-up turntable of the 3D cat with pose buttons.
// URL options: #/coco?pose=sit&angle=0.8 (fixed angle in radians, no turning).
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, ContactShadows } from '@react-three/drei';
import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import CocoCat from '../three/CocoModel';
import './pages.css';

const POSES = [['sit', 'Sit'], ['idle', 'Stand'], ['walk', 'Walk'], ['groom', 'Groom'], ['loaf', 'Loaf'], ['sleep', 'Sleep'], ['purr', 'Purr'], ['crouch', 'Hunt']];

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
          <color attach="background" args={['#22262e']} />
          <hemisphereLight args={['#fff1dc', '#3a2a20', 0.7]} />
          <directionalLight position={[2.5, 4, 3]} intensity={2.2} color="#fff0dd" />
          <directionalLight position={[-3, 2, -3]} intensity={1.4} color="#9fc8ff" />
          <Environment resolution={64}>
            <Lightformer intensity={2} position={[0, 4, 4]} scale={[6, 2, 1]} color="#fff3e0" />
            <Lightformer intensity={1} position={[-5, 1, 0]} rotation-y={Math.PI / 2} scale={[4, 2, 1]} color="#ffd6a0" />
          </Environment>
          <mesh position={[0, -0.06, 0]}><cylinderGeometry args={[0.95, 1.0, 0.12, 9]} /><meshStandardMaterial color="#8d939b" roughness={0.95} flatShading /></mesh>
          <ContactShadows position={[0, 0.002, 0]} opacity={0.5} scale={3} blur={2.4} far={1.5} />
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
