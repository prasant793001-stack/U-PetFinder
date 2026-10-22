// COCO - an original, fully procedural 3D cartoon cat (no external model files, ~0 KB of assets).
// Rig: body -> head (eyes, lids, ears, whiskers, mouth) + 4 legs + 12-segment tail.
// Motion: procedural gait, inertial tail, saccadic eyes, blinks, ear twitches and a behaviour brain
// (walk / run / sit / groom / loaf / sleep / stretch / crouch / pounce / hop / purr).
import { useMemo, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { pointer, installPointer, createBrain, think } from './catBrain';

// Persian 'blue' (grey) coat with copper eyes - the classic Persian look
const FUR = '#A9B1BC', FUR_DARK = '#8C95A2', CREAM = '#DCE1E7', PINK = '#EFA7B6', IRIS = '#E8962E';
const TAIL_SEGMENTS = 12;
const damp = THREE.MathUtils.damp;
const clamp = THREE.MathUtils.clamp;

// Long-hair look: thousands of short soft strands painted into a canvas, lighter underneath.
function furTexture(base = FUR, under = CREAM) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  for (let x = 0; x < c.width; x++) {
    const top = Math.cos((x / c.width - 0.75) * Math.PI * 2);
    g.fillStyle = new THREE.Color(base).lerp(new THREE.Color(under), clamp((-top + 0.1) * 0.9, 0, 1)).getStyle();
    g.fillRect(x, 0, 1, c.height);
  }
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 9000; i++) {
    const x = rnd() * c.width, y = rnd() * c.height, len = 6 + rnd() * 14, a = -Math.PI / 2 + (rnd() - 0.5) * 0.9;
    const light = rnd() < 0.55;
    g.strokeStyle = light ? `rgba(255,255,255,${0.05 + rnd() * 0.12})` : `rgba(40,48,60,${0.04 + rnd() * 0.08})`;
    g.lineWidth = 0.6 + rnd() * 1.2;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + 2, y + Math.sin(a) * len * 0.5, x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// A round Persian-style rug in the site's sunny colours: borders, a centre medallion and small motifs.
function rugTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d'); const C = 256;
  const ring = (r, color) => { g.beginPath(); g.arc(C, C, r, 0, Math.PI * 2); g.fillStyle = color; g.fill(); };
  ring(256, '#B4380F'); ring(236, '#FFE3A1'); ring(226, '#C2410C'); ring(196, '#F59E0B'); ring(188, '#9A2F0B'); ring(120, '#FFD166');
  // zig-zag border
  g.strokeStyle = '#FFF4D6'; g.lineWidth = 5; g.beginPath();
  for (let i = 0; i <= 96; i++) { const a = (i / 96) * Math.PI * 2, r = i % 2 ? 203 : 219; g.lineTo(C + Math.cos(a) * r, C + Math.sin(a) * r); }
  g.stroke();
  // petals around the medallion
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.save(); g.translate(C + Math.cos(a) * 152, C + Math.sin(a) * 152); g.rotate(a);
    g.fillStyle = i % 2 ? '#FFF4D6' : '#0F766E'; g.beginPath(); g.ellipse(0, 0, 22, 11, 0, 0, Math.PI * 2); g.fill(); g.restore();
  }
  // medallion
  g.fillStyle = '#C2410C'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.lineTo(C + Math.cos(a) * (i % 2 ? 70 : 104), C + Math.sin(a) * (i % 2 ? 70 : 104)); } g.fill();
  ring(48, '#FFF4D6'); ring(34, '#0F766E'); ring(14, '#FFD166');
  // woven texture
  for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '60,20,0'},0.06)`; g.fillRect(Math.random() * 512, Math.random() * 512, 2, 1); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// soft cluster of fur puffs (ruff, cheeks, chest) - what makes a Persian look fluffy
function Fluff({ m, puffs, mat = 'furSoft' }) {
  return puffs.map(([x, y, z, r, sx = 1, sy = 1, sz = 1], i) => (
    <mesh key={i} material={m[mat]} position={[x, y, z]} scale={[sx, sy, sz]}><sphereGeometry args={[r, 20, 14]} /></mesh>
  ));
}
const ring = (n, rad, y, z, r, squash = 1) => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * Math.PI * 2;
  return [Math.cos(a) * rad, y + Math.sin(a) * rad * squash, z, r];
});

function useMaterials() {
  return useMemo(() => {
    const furMap = furTexture();
    const fur = new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: furMap, roughness: 0.92, sheen: 1, sheenColor: new THREE.Color('#f4f7fb'), sheenRoughness: 0.35 });
    const furStriped = fur; // Persians are solid-coloured - no tabby stripes
    const furSoft = new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: furTexture('#B4BCC6', '#E3E7EC'), roughness: 0.95, sheen: 1, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.3 });
    const dark = new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: furTexture(FUR_DARK, FUR), roughness: 0.92, sheen: 1, sheenColor: new THREE.Color('#e8edf3') });
    const cream = new THREE.MeshPhysicalMaterial({ color: CREAM, roughness: 0.7, sheen: 1, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.5 });
    const pink = new THREE.MeshPhysicalMaterial({ color: PINK, roughness: 0.4, clearcoat: 0.6 });
    const eyeWhite = new THREE.MeshPhysicalMaterial({ color: '#fbfbf6', roughness: 0.15, clearcoat: 1 });
    const iris = new THREE.MeshPhysicalMaterial({ color: IRIS, roughness: 0.2, emissive: new THREE.Color('#7a3b05'), emissiveIntensity: 0.35, clearcoat: 1 });
    const pupil = new THREE.MeshStandardMaterial({ color: '#111318', roughness: 0.1 });
    const shine = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const mouth = new THREE.MeshStandardMaterial({ color: '#4a1f24', roughness: 0.6 });
    const whisker = new THREE.MeshStandardMaterial({ color: '#fffaf0', roughness: 0.3 });
    const blush = new THREE.MeshBasicMaterial({ color: '#FF8FB0', transparent: true, opacity: 0.4, depthWrite: false });
    return { fur, furStriped, furSoft, dark, cream, pink, eyeWhite, iris, pupil, shine, mouth, whisker, blush };
  }, []);
}

function Eye({ side, m, refs }) {
  const x = side * 0.165;
  return (
    <group position={[side * 0.18, 0.07, 0.27]} rotation={[0.05, side * 0.32, 0]}>
      <group ref={(g) => (refs.eyes[side > 0 ? 1 : 0] = g)}>
        <mesh material={m.eyeWhite} scale={[1, 1.08, 0.62]}><sphereGeometry args={[0.142, 32, 24]} /></mesh>
        <mesh material={m.iris} position={[0, -0.005, 0.07]} scale={[1, 1.08, 0.45]}><sphereGeometry args={[0.112, 32, 24]} /></mesh>
        <mesh ref={(p) => (refs.pupils[side > 0 ? 1 : 0] = p)} material={m.pupil} position={[0, -0.005, 0.104]} scale={[0.7, 1, 0.3]}><sphereGeometry args={[0.078, 24, 16]} /></mesh>
        <mesh material={m.shine} position={[-0.038, 0.045, 0.135]}><sphereGeometry args={[0.03, 14, 10]} /></mesh>
        <mesh material={m.shine} position={[0.035, -0.04, 0.132]}><sphereGeometry args={[0.014, 10, 8]} /></mesh>
        <mesh material={m.shine} position={[0.04, 0.05, 0.13]}><sphereGeometry args={[0.007, 8, 6]} /></mesh>
      </group>
      {/* eyelid: a fur-coloured hemisphere that rotates down over the eyeball */}
      <mesh ref={(l) => (refs.lids[side > 0 ? 1 : 0] = l)} material={m.fur} scale={[1.02, 1.1, 0.7]}>
        <sphereGeometry args={[0.148, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
    </group>
  );
}

function Ear({ side, m, refs }) {
  return (
    <group position={[side * 0.27, 0.24, -0.02]} rotation={[0, 0, side * -0.62]}>
      <group ref={(e) => (refs.ears[side > 0 ? 1 : 0] = e)}>
        <mesh material={m.fur} position={[0, 0.09, 0]} scale={[1, 1, 0.6]}><coneGeometry args={[0.14, 0.18, 24]} /></mesh>
        <mesh material={m.fur} position={[0, 0.175, 0]} scale={[1, 0.8, 0.6]}><sphereGeometry args={[0.032, 12, 8]} /></mesh>
        <mesh material={m.pink} position={[0, 0.08, 0.05]} scale={[0.58, 0.7, 0.25]}><coneGeometry args={[0.14, 0.18, 24]} /></mesh>
        <mesh material={m.furSoft} position={[0, 0.03, 0.06]} scale={[0.9, 0.5, 0.4]}><sphereGeometry args={[0.07, 10, 8]} /></mesh>
      </group>
    </group>
  );
}

function Whiskers({ side, m, refs }) {
  return (
    <group ref={(w) => (refs.whiskers[side > 0 ? 1 : 0] = w)} position={[side * 0.12, -0.06, 0.34]}>
      {[-0.16, 0, 0.16].map((a, i) => (
        <mesh key={i} material={m.whisker} rotation={[0, side * 0.25, side * (Math.PI / 2 + a)]} position={[side * 0.16, a * 0.2, 0]}>
          <cylinderGeometry args={[0.003, 0.0012, 0.3, 4]} />
        </mesh>
      ))}
    </group>
  );
}

function Leg({ pos, back, m, legRef, kneeRef }) {
  return (
    <group position={pos} ref={legRef}>
      {back && <mesh material={m.furStriped} position={[0, 0.02, 0]} scale={[0.8, 1.15, 1.1]}><sphereGeometry args={[0.17, 24, 16]} /></mesh>}
      <mesh material={m.fur} position={[0, -0.1, 0]}><capsuleGeometry args={[0.1, 0.12, 8, 16]} /></mesh>
      <group position={[0, -0.21, 0]} ref={kneeRef}>
        <mesh material={m.fur} position={[0, -0.04, 0]}><capsuleGeometry args={[0.078, 0.05, 8, 16]} /></mesh>
        <mesh material={m.cream} position={[0, -0.11, 0.03]} scale={[1, 0.66, 1.2]}><sphereGeometry args={[0.098, 20, 14]} /></mesh>
        {[-0.04, 0, 0.04].map((bx, k) => <mesh key={k} material={m.pink} position={[bx, -0.14, 0.13]} scale={[1, 0.8, 0.6]}><sphereGeometry args={[0.018, 8, 6]} /></mesh>)}
      </group>
    </group>
  );
}

export default function CocoCat({ onScreen, petSignal, hopSignal, restSignal, scale = 0.6 }) {
  const m = useMaterials();
  const { camera, size } = useThree();
  const brain = useMemo(createBrain, []);
  const rug = useRef();
  const root = useRef(), bodyPivot = useRef(), body = useRef(), head = useRef(), jaw = useRef(), shadow = useRef();
  const legs = useRef([]), knees = useRef([]), tail = useRef([]);
  const refs = useMemo(() => ({ eyes: [], pupils: [], lids: [], ears: [], whiskers: [] }), []);
  const sim = useMemo(() => ({
    rug: new THREE.Vector3(2.5, 0, 1.5), rugInit: false,
    pos: new THREE.Vector3(0.8, 0, 0.8), heading: -0.6, speed: 0, phase: 0, vy: 0, y: 0,
    pose: { bodyY: 0.47, pitch: 0, roll: 0, frontFold: 0, backFold: 0, headPitch: 0, headYaw: 0, headRoll: 0, lid: 0, tailUp: 0.6, tailCurl: 0, earBack: 0, pupil: 0.72, mouth: 0 },
    blinkAt: 1.5, blink: 0, twitchAt: 2, twitch: 0, twitchSide: 1,
    saccade: new THREE.Vector2(), saccadeAt: 0.5,
    tailVel: 0, lastHeading: -0.6, petSeen: 0, hopSeen: 0,
    target: new THREE.Vector3(), look: new THREE.Vector3(),
  }), []);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const floor = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const tmp = useMemo(() => ({ v: new THREE.Vector3(), w: new THREE.Vector3(), ndc: new THREE.Vector2() }), []);

  useEffect(() => { installPointer(); }, []);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1); // slow phones still get correct timing (a long frame never skips more than 0.1 s)
    const now = performance.now();
    const t = state.clock.elapsedTime;
    const P = sim.pose;

    // ---- where is the cursor on the floor? ---------------------------------------------------------
    // visible half-width of the floor near the cat (portrait phones are narrow - keep COCO on screen)
    const halfW = Math.max(0.35, camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (size.width / size.height) - 0.55 * scale - 0.2);
    if (pointer.has) {
      tmp.ndc.set(pointer.nx, Math.min(pointer.ny, 0.2));
      ray.setFromCamera(tmp.ndc, camera);
      if (ray.ray.intersectPlane(floor, tmp.v)) sim.target.copy(tmp.v);
    } else {
      sim.target.set(Math.sin(t * 0.2) * 2, 0, 0.8); // wander a little before the visitor moves the mouse
    }
    // COCO's carpet: a fixed spot in the bottom corner of the screen (recomputed so it fits every screen size)
    tmp.ndc.set(size.width < 700 ? 0.5 : 0.74, size.width < 700 ? -0.78 : -0.7);
    ray.setFromCamera(tmp.ndc, camera);
    if (ray.ray.intersectPlane(floor, tmp.v)) {
      // keep the carpet inside the area COCO can walk to, otherwise it can never reach it
      tmp.v.x = clamp(tmp.v.x, -halfW + 0.2, halfW - 0.2); tmp.v.z = clamp(tmp.v.z, -2.4, 3.2);
      sim.rug.lerp(tmp.v, sim.rugInit ? Math.min(1, dt * 4) : 1); sim.rugInit = true;
    }
    rug.current.position.set(sim.rug.x, 0.004, sim.rug.z);
    const resting = !!restSignal?.current;
    if (resting) sim.target.copy(sim.rug);
    // a real cat stops NEXT to you and looks up - it never sits on the thing you are about to click
    else if (brain.state !== 'crouch' && brain.state !== 'pounce') {
      tmp.w.set(sim.pos.x - sim.target.x, 0, sim.pos.z - sim.target.z);
      const away = tmp.w.length();
      if (away > 1e-3) sim.target.addScaledVector(tmp.w.multiplyScalar(1 / away), 1.05);
      else sim.target.x += 1.05;
    }
    sim.target.x = clamp(sim.target.x, -halfW, halfW);
    sim.target.z = clamp(sim.target.z, -2.6, 3.4);
    // look target: the cursor itself, roughly at head height in front of the camera
    tmp.ndc.set(pointer.nx, pointer.ny);
    ray.setFromCamera(tmp.ndc, camera);
    ray.ray.at(camera.position.distanceTo(sim.pos) * 0.85, sim.look);

    const dx = sim.target.x - sim.pos.x, dz = sim.target.z - sim.pos.z;
    const dist = Math.hypot(dx, dz);
    const petted = petSignal.current !== sim.petSeen; sim.petSeen = petSignal.current;
    const wantHop = hopSignal.current !== sim.hopSeen; sim.hopSeen = hopSignal.current;
    const prev = brain.state;
    think(brain, { dist, now, dt, wantHop, petted, resting });
    const S = brain.state, since = brain.since;
    if (S === 'pounce' && prev !== 'pounce') { sim.pounceFrom = sim.pos.clone(); sim.pounceTo = sim.target.clone(); }

    // ---- locomotion ------------------------------------------------------------------------------
    const moving = S === 'walk' || S === 'run';
    const onRug = resting && dist < 0.3;
    const desired = onRug ? -0.35 : Math.atan2(dx, dz);
    let diff = Math.atan2(Math.sin(desired - sim.heading), Math.cos(desired - sim.heading));
    if (moving || S === 'crouch' || S === 'idle' || (onRug && S !== 'sleep')) sim.heading += clamp(diff, -1, 1) * Math.min(1, dt * (S === 'run' ? 6 : 4));
    const targetSpeed = moving ? (S === 'run' ? 2.7 : 1.15) * (Math.abs(diff) < 1.1 ? 1 : 0.25) * clamp(dist / 1.2, 0.35, 1) : 0;
    sim.speed = damp(sim.speed, targetSpeed, 6, dt);
    if (S === 'pounce' && sim.pounceFrom) {
      const k = clamp(since / 0.75, 0, 1);
      const e = k * k * (3 - 2 * k);
      sim.pos.lerpVectors(sim.pounceFrom, sim.pounceTo, e);
      sim.y = Math.sin(Math.PI * k) * 0.75;
    } else {
      sim.pos.x += Math.sin(sim.heading) * sim.speed * dt;
      sim.pos.z += Math.cos(sim.heading) * sim.speed * dt;
      sim.y = S === 'hop' ? Math.max(0, Math.sin(Math.PI * clamp(since / 0.7, 0, 1))) * 0.55 : damp(sim.y, 0, 10, dt);
    }
    sim.pos.x = clamp(sim.pos.x, -halfW, halfW); sim.pos.z = clamp(sim.pos.z, -2.6, 3.4);
    sim.phase += sim.speed * dt * (S === 'run' ? 5.2 : 7.5);

    // ---- pose targets per state (blended with damping = smooth transitions) -----------------------
    const T = { bodyY: 0.47, pitch: 0, roll: 0, frontFold: 0, backFold: 0, headPitch: 0, headRoll: 0, lid: 0, tailUp: 0.7, tailCurl: 0, earBack: 0, pupil: 0.72, mouth: 0 };
    if (S === 'sit' || S === 'groom' || S === 'purr') Object.assign(T, { bodyY: 0.5, pitch: -0.55, frontFold: 0.62, backFold: -1.55, tailUp: -0.9, tailCurl: 1.1 });
    if (S === 'loaf') Object.assign(T, { bodyY: 0.27, pitch: 0, frontFold: -1.45, backFold: -1.4, tailUp: -1.2, tailCurl: 1.3, lid: 0.45 });
    if (S === 'sleep') Object.assign(T, { bodyY: 0.22, pitch: 0.04, roll: 0.28, frontFold: -1.5, backFold: -1.45, headPitch: 0.28, headRoll: 0.4, lid: 1, tailUp: -1.3, tailCurl: 1.9, earBack: 0.3 });
    if (S === 'stretch') { const k = Math.sin(Math.PI * clamp(since / 2.2, 0, 1)); Object.assign(T, { bodyY: 0.47 - 0.14 * k, pitch: 0.38 * k, frontFold: -0.95 * k, headPitch: -0.3 * k, lid: 0.6 * k, mouth: since > 0.5 && since < 1.4 ? 1 : 0, tailUp: 1.2 }); }
    if (S === 'crouch') Object.assign(T, { bodyY: 0.33, pitch: 0.12, frontFold: -0.25, backFold: -0.55, headPitch: -0.1, tailUp: -0.2, earBack: 0.55, pupil: 0.95 });
    if (S === 'pounce') Object.assign(T, { pitch: since < 0.35 ? -0.35 : 0.3, frontFold: since < 0.35 ? -1.1 : 0.4, backFold: since < 0.35 ? 0.9 : -0.4, tailUp: 0.4, earBack: 0.4, pupil: 1 });
    if (S === 'hop') Object.assign(T, { tailUp: 1.4, pupil: 0.8, frontFold: sim.y > 0.05 ? -0.5 : 0, backFold: sim.y > 0.05 ? 0.5 : 0 });
    if (S === 'purr') Object.assign(T, { lid: 0.68, tailUp: 1.45, tailCurl: 0, headRoll: 0.18 });
    if (moving) Object.assign(T, { tailUp: S === 'run' ? 0.15 : 1.05 });
    for (const k in T) P[k] = damp(P[k], T[k], k === 'lid' ? 14 : 7, dt);

    // ---- apply to the rig ------------------------------------------------------------------------
    root.current.position.set(sim.pos.x, sim.y, sim.pos.z);
    root.current.rotation.y = sim.heading;
    const gaitAmp = clamp(sim.speed / 1.2, 0, 1.25);
    const bob = moving ? Math.abs(Math.sin(sim.phase)) * 0.035 * gaitAmp : 0;
    const breathe = Math.sin(t * (S === 'sleep' ? 1.6 : S === 'purr' ? 9 : 2.4)) * (S === 'purr' ? 0.008 : 0.012);
    const wiggle = S === 'crouch' && since > 0.35 ? Math.sin(t * 22) * 0.08 : 0; // the famous butt wiggle
    bodyPivot.current.position.y = P.bodyY + bob;
    bodyPivot.current.rotation.set(P.pitch + (moving ? Math.sin(sim.phase * 2) * 0.03 : 0), wiggle * 0.6, P.roll + wiggle * 0.4);
    body.current.scale.set(1 + breathe, 1 + breathe, 1);

    // legs: diagonal gait (front-left with back-right), knees bend on the swing phase
    const offsets = [0, Math.PI, Math.PI * 0.9, Math.PI * 1.9];
    for (let i = 0; i < 4; i++) {
      const front = i < 2;
      const swing = Math.sin(sim.phase + offsets[i]) * 0.55 * gaitAmp;
      let rx = (front ? P.frontFold : P.backFold) + swing;
      let knee = moving ? Math.max(0, Math.cos(sim.phase + offsets[i])) * (front ? -0.45 : 0.6) * gaitAmp : 0;
      if (!front && P.backFold < -0.6) knee = 1.35 * clamp(-P.backFold - 0.6, 0, 1) * 1.1; // folded haunches
      if (front && P.frontFold < -0.6) knee = -0.9 * clamp(-P.frontFold - 0.6, 0, 1) * 1.2;  // paws tucked
      if (S === 'groom' && i === 0) { rx = -1.75 + Math.sin(t * 7) * 0.12; knee = -1.3; }       // licking the left paw
      legs.current[i].rotation.x = rx;
      knees.current[i].rotation.x = knee;
    }

    // head: tracks the cursor (yaw/pitch relative to the body), with grooming, sleeping and purr overrides
    tmp.w.copy(sim.look);
    head.current.parent.worldToLocal(tmp.w);
    let yaw = Math.atan2(tmp.w.x, tmp.w.z - 0.3);
    let pitch = -Math.atan2(tmp.w.y - 0.25, Math.hypot(tmp.w.x, tmp.w.z));
    const alert = S !== 'sleep' && S !== 'groom' && S !== 'loaf';
    yaw = alert ? clamp(yaw, -1.05, 1.05) : 0;
    pitch = alert ? clamp(pitch - 0.18, -0.55, 0.12) : 0; // face tilts up towards the viewer - cuter
    if (S === 'groom') { yaw = -0.3 + Math.sin(t * 7) * 0.08; pitch = 0.28 + Math.sin(t * 7) * 0.1; }
    P.headYaw = damp(P.headYaw, yaw, 5, dt);
    sim.lookPitch = damp(sim.lookPitch || 0, pitch, 5, dt);
    // counter-rotate the body pitch so the head stays level while sitting / stretching
    head.current.rotation.set(P.headPitch + sim.lookPitch - P.pitch * 0.8, P.headYaw, P.headRoll + (S === 'idle' ? Math.sin(t * 0.7) * 0.06 : 0));

    // eyes: look further than the head + small saccades; pupils dilate when hunting or playing
    sim.saccadeAt -= dt;
    if (sim.saccadeAt < 0) { sim.saccade.set((Math.random() - 0.5) * 0.18, (Math.random() - 0.5) * 0.12); sim.saccadeAt = 0.4 + Math.random() * 1.6; }
    const eyeYaw = clamp((yaw - P.headYaw) * 1.4 + sim.saccade.x, -0.45, 0.45);
    const eyePitch = clamp(pitch * 0.4 + sim.saccade.y, -0.3, 0.3);
    refs.eyes.forEach((e) => e && e.rotation.set(eyePitch, eyeYaw, 0));
    const dil = P.pupil + (pointer.speed > 0.8 ? 0.2 : 0);
    refs.pupils.forEach((p) => p && p.scale.set(clamp(dil, 0.45, 1.05), clamp(0.95 + (dil - 0.72) * 0.2, 0.9, 1.05), 0.3));

    // blinks (sometimes a slow "I trust you" blink), plus state-driven lid level
    sim.blinkAt -= dt;
    if (sim.blinkAt < 0) { sim.blink = 1; sim.blinkAt = 2 + Math.random() * 4; sim.slowBlink = Math.random() < 0.2; }
    sim.blink = Math.max(0, sim.blink - dt * (sim.slowBlink ? 2.2 : 7));
    const blinkK = Math.sin(sim.blink * Math.PI);
    const lid = Math.max(P.lid, blinkK);
    refs.lids.forEach((l) => l && (l.rotation.x = THREE.MathUtils.lerp(-1.25, 1.62, lid)));

    // ears: occasional twitch, flatten when hunting, perk up when the cursor moves
    sim.twitchAt -= dt;
    if (sim.twitchAt < 0) { sim.twitch = 1; sim.twitchSide = Math.random() < 0.5 ? 0 : 1; sim.twitchAt = 1.5 + Math.random() * 3.5; }
    sim.twitch = Math.max(0, sim.twitch - dt * 6);
    refs.ears.forEach((e, i) => {
      if (!e) return;
      const tw = i === sim.twitchSide ? Math.sin(sim.twitch * Math.PI * 3) * 0.35 * sim.twitch : 0;
      e.rotation.set(-P.earBack * 0.9, (i ? -1 : 1) * P.earBack * 0.6, tw);
    });
    refs.whiskers.forEach((w, i) => w && (w.rotation.z = Math.sin(t * 3 + i) * 0.04 + (S === 'purr' ? Math.sin(t * 30) * 0.03 : 0)));
    jaw.current.scale.y = 0.15 + P.mouth * 0.95;

    // tail: per-segment curve + travelling wave + inertia from turning
    const turnRate = (sim.heading - sim.lastHeading) / Math.max(dt, 1e-3); sim.lastHeading = sim.heading;
    sim.tailVel = damp(sim.tailVel, clamp(-turnRate * 0.25, -0.6, 0.6), 4, dt);
    const lash = S === 'crouch' ? 2.4 : 1;
    for (let i = 0; i < TAIL_SEGMENTS; i++) {
      const seg = tail.current[i];
      if (!seg) continue;
      const k = i / TAIL_SEGMENTS;
      const wave = Math.sin(t * (S === 'purr' ? 14 : 2.1 * lash) - i * 0.55) * (S === 'sleep' ? 0.02 : 0.09 + k * 0.12) * (S === 'purr' ? 0.35 : 1);
      // +x rotation lifts the tail (it grows along -z). High tailUp = proud upright tail with a hooked tip,
      // negative = tail resting on the floor, curving back to horizontal and wrapping round the body.
      seg.rotation.x = i === 0 ? -0.25 + P.tailUp * 0.85
        : P.tailUp > 0.9 ? (i > 8 ? 0.28 : 0.02) + (S === 'purr' && i > 9 ? Math.sin(t * 30) * 0.08 : 0)
        : clamp(-P.tailUp, 0, 1.5) * 0.11 + 0.02;
      seg.rotation.y = wave + sim.tailVel * (0.3 + k) + P.tailCurl * 0.22 * k;
    }

    // blob shadow follows the cat and shrinks while it is in the air
    shadow.current.position.set(sim.pos.x, 0.002, sim.pos.z);
    const sh = 1 - clamp(sim.y, 0, 0.8) * 0.6;
    shadow.current.scale.set(1.25 * sh * scale, 1.75 * sh * scale, 1);
    shadow.current.rotation.z = -sim.heading;
    shadow.current.material.opacity = 0.32 * sh;

    // report the head position in screen pixels for the DOM speech bubble, click target and particles
    if (onScreen) {
      head.current.getWorldPosition(tmp.v);
      tmp.v.project(camera);
      onScreen((tmp.v.x * 0.5 + 0.5) * size.width, (-tmp.v.y * 0.5 + 0.5) * size.height, S);
    }
  });

  const rugTex = useMemo(rugTexture, []);
  const shadowTex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    gr.addColorStop(0, 'rgba(60,35,15,1)'); gr.addColorStop(1, 'rgba(60,35,15,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }, []);

  return (
    <>
      {/* COCO's Persian carpet */}
      <group ref={rug} scale={scale * 1.05}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1.02, 0.7, 1]} position={[0, -0.002, 0.012]}><circleGeometry args={[1, 64]} /><meshBasicMaterial color="#7A2E0E" transparent opacity={0.35} depthWrite={false} /></mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.68, 1]} receiveShadow><circleGeometry args={[1, 64]} /><meshStandardMaterial map={rugTex} roughness={0.95} /></mesh>
        {Array.from({ length: 26 }, (_, i) => {
          const a = (i / 26) * Math.PI * 2;
          return <mesh key={i} position={[Math.cos(a) * 1.04, 0.004, Math.sin(a) * 0.72]} rotation={[-Math.PI / 2, 0, -a]}><planeGeometry args={[0.1, 0.025]} /><meshStandardMaterial color="#FFF4D6" /></mesh>;
        })}
      </group>
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={shadowTex} transparent depthWrite={false} opacity={0.3} />
      </mesh>
      <group ref={root} scale={scale}>
        <group ref={bodyPivot}>
          <group ref={body}>
            <mesh material={m.furStriped} rotation={[Math.PI / 2, 0, 0]} scale={[0.47, 0.54, 0.44]} castShadow><sphereGeometry args={[1, 48, 32]} /></mesh>
            {/* long-hair puffs along the back and flanks */}
            <Fluff m={m} puffs={[[0, 0.27, 0.05, 0.22, 1.6, 0.6, 2.0], [-0.3, 0.02, 0, 0.16, 0.7, 1.2, 2.4], [0.3, 0.02, 0, 0.16, 0.7, 1.2, 2.4], [0, 0.08, -0.42, 0.2, 1.5, 1.1, 0.7]]} />
            {/* the Persian mane / chest ruff */}
            <Fluff m={m} puffs={[[0, 0.02, 0.38, 0.2, 1.5, 1.3, 0.8], [0, -0.14, 0.34, 0.16, 1.5, 1, 0.9]]} />
            <mesh material={m.cream} position={[0, -0.06, 0.32]} scale={[0.3, 0.3, 0.24]}><sphereGeometry args={[1, 32, 24]} /></mesh>
            <mesh material={m.cream} position={[0, -0.2, 0.05]} scale={[0.3, 0.16, 0.38]}><sphereGeometry args={[1, 24, 16]} /></mesh>
          </group>
          {[[-0.17, -0.12, 0.3, false], [0.17, -0.12, 0.3, false], [-0.2, -0.1, -0.3, true], [0.2, -0.1, -0.3, true]].map(([x, y, z, back], i) => (
            <Leg key={i} pos={[x, y, z]} back={back} m={m} legRef={(r) => (legs.current[i] = r)} kneeRef={(r) => (knees.current[i] = r)} />
          ))}
          {/* tail: nested segments so each one bends relative to the previous */}
          <group position={[0, 0.12, -0.48]}>
            {(() => {
              let node = null;
              for (let i = TAIL_SEGMENTS - 1; i >= 0; i--) {
                const r = 0.13 - i * 0.002; // bushy Persian plume
                const mat = i % 2 ? m.furSoft : m.fur;
                node = (
                  <group key={i} ref={(g) => (tail.current[i] = g)} position={[0, 0, i === 0 ? 0 : -0.085]}>
                    <mesh material={mat} position={[0, 0, -0.04]} scale={[1.1, 1, 1.35]}><sphereGeometry args={[r, 16, 12]} /></mesh>
                    {node}
                  </group>
                );
              }
              return node;
            })()}
          </group>
          {/* head */}
          <group position={[0, 0.36, 0.5]}>
            <group ref={head} scale={1.28}>
              <mesh material={m.fur} scale={[1.2, 0.98, 0.9]}><sphereGeometry args={[0.4, 48, 32]} /></mesh>
              {/* big fluffy cheeks + collar that frame the face */}
              <Fluff m={m} puffs={[[-0.37, -0.12, 0.03, 0.13, 0.8, 1.15, 1.1], [0.37, -0.12, 0.03, 0.13, 0.8, 1.15, 1.1], [0, -0.3, 0.06, 0.16, 2.0, 0.75, 1.1]]} />
              {/* muzzle + cheeks */}
              <mesh material={m.furSoft} position={[-0.075, -0.08, 0.3]} scale={[1, 0.8, 0.62]}><sphereGeometry args={[0.12, 24, 16]} /></mesh>
              <mesh material={m.furSoft} position={[0.075, -0.08, 0.3]} scale={[1, 0.8, 0.62]}><sphereGeometry args={[0.12, 24, 16]} /></mesh>
              <mesh material={m.furSoft} position={[0, -0.15, 0.28]} scale={[1, 0.62, 0.7]}><sphereGeometry args={[0.09, 20, 14]} /></mesh>
              {[-1, 1].map((s) => <mesh key={s} material={m.blush} position={[s * 0.24, -0.04, 0.3]} scale={[1, 0.62, 0.3]}><sphereGeometry args={[0.07, 16, 10]} /></mesh>)}
              {[-1, 1].map((s) => <mesh key={'m' + s} material={m.mouth} position={[s * 0.024, -0.055, 0.385]} rotation={[0.25, 0, Math.PI]}><torusGeometry args={[0.026, 0.0065, 8, 16, Math.PI]} /></mesh>)}
              <mesh material={m.pink} position={[0, 0.0, 0.385]} rotation={[0.3, 0, 0]} scale={[1.35, 0.75, 0.7]}><sphereGeometry args={[0.034, 16, 12]} /></mesh>
              <mesh ref={jaw} material={m.mouth} position={[0, -0.095, 0.37]} scale={[1, 0.15, 0.6]}><sphereGeometry args={[0.05, 16, 12]} /></mesh>
              <Eye side={-1} m={m} refs={refs} />
              <Eye side={1} m={m} refs={refs} />
              <Ear side={-1} m={m} refs={refs} />
              <Ear side={1} m={m} refs={refs} />
              <Whiskers side={-1} m={m} refs={refs} />
              <Whiskers side={1} m={m} refs={refs} />
            </group>
          </group>
        </group>
      </group>
    </>
  );
}
