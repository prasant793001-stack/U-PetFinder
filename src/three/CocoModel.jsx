// COCO - the sculpted ginger kitten. The 3D shape was generated from the reference images with Hunyuan3D 2.1
// (image-to-3D), painted from the photo, and given a light skeleton here: a neck bone for looking around,
// grooming and napping, plus real 3D eyes that blink. Movement is done as bouncy kitten hops.
import { useMemo, useRef, useEffect } from 'react';
import { useFrame, useThree, createPortal } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { pointer, installPointer, createBrain, think } from './catBrain';

const MODEL = `${import.meta.env.BASE_URL}models/coco.glb`;
// eye sockets found on the generated mesh (model space: height 1, y up, face towards +z)
const EYES = [
  { c: [-0.101, 0.643, 0.423], n: [-0.36, 0.1, 0.93] },
  { c: [-0.234, 0.638, 0.348], n: [-0.91, 0.42, -0.05] },
];
const damp = THREE.MathUtils.damp;
const clamp = THREE.MathUtils.clamp;
const smooth = THREE.MathUtils.smoothstep;

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


function useRiggedKitten() {
  const gltf = useGLTF(MODEL, false, true);
  return useMemo(() => {
    let src = null;
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse((o) => { if (o.isMesh && !src) src = o; });
    // de-quantise into float attributes and bake the node transform
    const g0 = src.geometry, n = g0.attributes.position.count, M = src.matrixWorld;
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), v = new THREE.Vector3(), tmpC = new THREE.Color();
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(g0.attributes.position, i).applyMatrix4(M);
      pos.set([v.x, v.y, v.z], i * 3);
      const c = g0.attributes.color;
      // vertex colours were painted from an sRGB photo; the renderer works in linear light
      tmpC.setRGB(c ? c.getX(i) : 0.9, c ? c.getY(i) : 0.5, c ? c.getZ(i) : 0.25, THREE.SRGBColorSpace);
      col.set([tmpC.r, tmpC.g, tmpC.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(g0.index);
    geo.computeVertexNormals();
    // head = everything around the head centre; smooth weights so the neck bends instead of tearing
    const e0 = new THREE.Vector3(...EYES[0].c), e1 = new THREE.Vector3(...EYES[1].c);
    const face = new THREE.Vector3(...EYES[0].n).add(new THREE.Vector3(...EYES[1].n)).setY(0).normalize();
    const headC = e0.clone().add(e1).multiplyScalar(0.5).addScaledVector(face, -0.14).setY(0.68);
    const neck = new THREE.Vector3(headC.x, 0.47, headC.z - 0.02);
    const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      v.fromArray(pos, i * 3);
      const d = v.distanceTo(headC);
      let w = Math.max(smooth(v.y, 0.5, 0.6), 1 - smooth(d, 0.2, 0.3)) * smooth(v.y, 0.4, 0.48);
      si.set([0, 1, 0, 0], i * 4); sw.set([1 - w, w, 0, 0], i * 4);
    }
    geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    const rootBone = new THREE.Bone(), neckBone = new THREE.Bone();
    neckBone.position.copy(neck); rootBone.add(neckBone);
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0 });
    const mesh = new THREE.SkinnedMesh(geo, mat);
    mesh.add(rootBone);
    mesh.bind(new THREE.Skeleton([rootBone, neckBone]));
    mesh.frustumCulled = false;
    return { mesh, neckBone, neck, faceYaw: Math.atan2(face.x, face.z) };
  }, [gltf]);
}

function Eye({ e, neck, lidRef, pupilRef }) {
  const n = new THREE.Vector3(...e.n);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n.normalize());
  const p = new THREE.Vector3(...e.c).sub(neck).addScaledVector(n, 0.004);
  const r = 0.05;
  return (
    <group position={p} quaternion={q}>
      <mesh scale={[1, 1.05, 0.55]}><sphereGeometry args={[r, 24, 18]} /><meshPhysicalMaterial color="#79C64A" emissive="#1f5a0e" emissiveIntensity={0.4} roughness={0.12} clearcoat={1} /></mesh>
      <mesh ref={pupilRef} position={[0, 0, r * 0.42]} scale={[0.75, 1, 0.3]}><sphereGeometry args={[r * 0.58, 16, 12]} /><meshStandardMaterial color="#111" roughness={0.1} /></mesh>
      <mesh position={[-r * 0.32, r * 0.35, r * 0.58]}><sphereGeometry args={[r * 0.2, 10, 8]} /><meshBasicMaterial color="#fff" /></mesh>
      <mesh position={[r * 0.3, -r * 0.3, r * 0.56]}><sphereGeometry args={[r * 0.09, 8, 6]} /><meshBasicMaterial color="#fff" /></mesh>
      <mesh ref={lidRef} scale={[1.08, 1.12, 0.75]}><sphereGeometry args={[r * 1.04, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#C8652C" roughness={0.85} /></mesh>
    </group>
  );
}

export default function CocoModel({ onScreen, petSignal, hopSignal, restSignal, scale = 0.6, studio = null }) {
  const { camera, size } = useThree();
  const rig = useRiggedKitten();
  const brain = useMemo(createBrain, []);
  const rug = useRef(), root = useRef(), body = useRef(), shadow = useRef(), headAnchor = useRef();
  const lids = useRef([]), pupils = useRef([]);
  const sim = useMemo(() => ({
    rug: new THREE.Vector3(2.5, 0, 1.5), rugInit: false,
    pos: new THREE.Vector3(0.8, 0, 0.8), heading: -0.6, speed: 0, phase: 0, y: 0,
    pose: { squash: 0, yaw: 0, pitch: 0, roll: 0, lid: 0, lean: 0 },
    blinkAt: 1.5, blink: 0, petSeen: 0, hopSeen: 0, lookYaw: 0, lookPitch: 0,
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
    if (studio) { if (brain.state !== studio.state) { brain.state = studio.state; brain.since = 0; } else brain.since += dt; } // studio: pose chosen by buttons
    else think(brain, { dist, now, dt, wantHop, petted, resting });
    const S = brain.state, since = brain.since;
    if (S === 'pounce' && prev !== 'pounce') { sim.pounceFrom = sim.pos.clone(); sim.pounceTo = sim.target.clone(); }

    // ---- locomotion ------------------------------------------------------------------------------
    const moving = S === 'walk' || S === 'run';
    const onRug = resting && dist < 0.3;
    const desired = onRug ? -0.35 : Math.atan2(dx, dz);
    let diff = Math.atan2(Math.sin(desired - sim.heading), Math.cos(desired - sim.heading));
    if (studio) sim.heading = studio.heading ?? 0;
    else if (moving || S === 'crouch' || S === 'idle' || (onRug && S !== 'sleep')) sim.heading += clamp(diff, -1, 1) * Math.min(1, dt * (S === 'run' ? 6 : 4));
    const targetSpeed = studio ? (moving ? (S === 'run' ? 2.7 : 1.15) : 0) : moving ? (S === 'run' ? 2.7 : 1.15) * (Math.abs(diff) < 1.1 ? 1 : 0.25) * clamp(dist / 1.2, 0.35, 1) : 0;
    sim.speed = damp(sim.speed, targetSpeed, 6, dt);
    if (S === 'pounce' && sim.pounceFrom) {
      const k = clamp(since / 0.75, 0, 1);
      const e = k * k * (3 - 2 * k);
      sim.pos.lerpVectors(sim.pounceFrom, sim.pounceTo, e);
      sim.y = Math.sin(Math.PI * k) * 0.75;
    } else {
      if (studio) sim.pos.set(0, 0, 0);
      else { sim.pos.x += Math.sin(sim.heading) * sim.speed * dt; sim.pos.z += Math.cos(sim.heading) * sim.speed * dt; }
      sim.y = S === 'hop' ? Math.max(0, Math.sin(Math.PI * clamp(since / 0.7, 0, 1))) * 0.55 : damp(sim.y, 0, 10, dt);
    }
    sim.pos.x = clamp(sim.pos.x, -halfW, halfW); sim.pos.z = clamp(sim.pos.z, -2.6, 3.4);
    sim.phase += sim.speed * dt * (S === 'run' ? 5.2 : 7.5);

    // ---- pose for the sculpted kitten -------------------------------------------------------------
    const T = { squash: 0, pitch: 0, roll: 0, lid: 0, lean: 0 };
    if (S === 'loaf') Object.assign(T, { squash: 0.06, lid: 0.45 });
    if (S === 'sleep') Object.assign(T, { squash: 0.1, pitch: 0.38, roll: 0.25, lid: 1 });
    if (S === 'groom') Object.assign(T, { pitch: 0.32 + Math.sin(t * 7) * 0.08, roll: 0.15, lid: 0.55 });
    if (S === 'purr') Object.assign(T, { roll: 0.16 + Math.sin(t * 18) * 0.03, lid: 0.65 });
    if (S === 'crouch') Object.assign(T, { squash: 0.12, lean: 0.12 });
    if (S === 'stretch') { const k = Math.sin(Math.PI * clamp(since / 2.2, 0, 1)); Object.assign(T, { squash: -0.08 * k, pitch: -0.25 * k, lid: 0.6 * k }); }
    for (const k in T) P[k] = damp(P[k], T[k], k === 'lid' ? 14 : 7, dt);

    // body: position, hops while moving (kitten bounding), squash & stretch, breathing
    const hopH = moving ? Math.abs(Math.sin(sim.phase * 0.5)) * (S === 'run' ? 0.22 : 0.12) * clamp(sim.speed, 0, 1.2) : 0;
    const landing = moving ? Math.pow(1 - Math.abs(Math.sin(sim.phase * 0.5)), 6) : 0;
    root.current.position.set(sim.pos.x, sim.y + hopH, sim.pos.z);
    root.current.rotation.y = sim.heading;
    const breathe = Math.sin(t * (S === 'sleep' ? 1.6 : S === 'purr' ? 10 : 2.4)) * (S === 'purr' ? 0.006 : 0.012);
    const sq = P.squash + landing * 0.12 - (hopH > 0.05 ? 0.05 : 0) + (S === 'hop' && sim.y > 0.02 ? -0.06 : 0);
    const wiggle = S === 'crouch' && since > 0.35 ? Math.sin(t * 22) * 0.05 : 0;
    body.current.scale.set(1 + sq * 0.6 + breathe, 1 - sq + breathe, 1 + sq * 0.6 + breathe);
    body.current.rotation.set(P.lean + (moving ? 0.08 : 0), wiggle, wiggle * 0.5);

    // head: looks at the cursor (relative to how the sculpt's face is turned), with state overrides
    tmp.w.copy(sim.look); root.current.worldToLocal(tmp.w);
    let yaw = Math.atan2(tmp.w.x, tmp.w.z) - rig.faceYaw;
    let pitch = -Math.atan2(tmp.w.y / scale - 0.65, Math.hypot(tmp.w.x, tmp.w.z) / scale);
    const alert = S !== 'sleep' && S !== 'groom' && S !== 'loaf';
    yaw = studio ? Math.sin(t * 0.5) * 0.35 - rig.faceYaw * 0.5 : alert ? clamp(yaw, -0.75, 0.75) : 0;
    pitch = studio ? -0.05 : alert ? clamp(pitch, -0.35, 0.25) : 0;
    sim.lookYaw = damp(sim.lookYaw, yaw, 5, dt); sim.lookPitch = damp(sim.lookPitch, pitch, 5, dt);
    rig.neckBone.rotation.set(P.pitch + sim.lookPitch, sim.lookYaw, P.roll + (S === 'idle' ? Math.sin(t * 0.7) * 0.05 : 0), 'YXZ');

    // eyes: blinks (sometimes a slow trusting blink), lids for sleepy states, pupils widen when playing
    sim.blinkAt -= dt;
    if (sim.blinkAt < 0) { sim.blink = 1; sim.blinkAt = 2 + Math.random() * 4; sim.slowBlink = Math.random() < 0.2; }
    sim.blink = Math.max(0, sim.blink - dt * (sim.slowBlink ? 2.2 : 7));
    const lid = Math.max(P.lid, Math.sin(sim.blink * Math.PI));
    lids.current.forEach((l) => l && (l.rotation.x = THREE.MathUtils.lerp(-1.3, 1.62, lid)));
    const dil = S === 'crouch' || S === 'pounce' || pointer.speed > 0.8 ? 0.95 : 0.65;
    pupils.current.forEach((p) => p && (p.scale.x = damp(p.scale.x, dil * 1.2, 6, dt)));

    shadow.current.position.set(sim.pos.x, 0.002, sim.pos.z);
    const sh = 1 - clamp(sim.y + hopH, 0, 0.8) * 0.7;
    shadow.current.scale.set(0.95 * sh * scale, 0.95 * sh * scale, 1);
    shadow.current.material.opacity = 0.35 * sh;

    if (onScreen) {
      headAnchor.current.getWorldPosition(tmp.v); tmp.v.project(camera);
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
      <group ref={rug} scale={scale * 1.05} visible={!studio}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1.02, 0.7, 1]} position={[0, -0.002, 0.012]}><circleGeometry args={[1, 64]} /><meshBasicMaterial color="#7A2E0E" transparent opacity={0.35} depthWrite={false} /></mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.68, 1]}><circleGeometry args={[1, 64]} /><meshStandardMaterial map={rugTex} roughness={0.95} /></mesh>
        {Array.from({ length: 26 }, (_, i) => {
          const a = (i / 26) * Math.PI * 2;
          return <mesh key={i} position={[Math.cos(a) * 1.04, 0.004, Math.sin(a) * 0.72]} rotation={[-Math.PI / 2, 0, -a]}><planeGeometry args={[0.1, 0.025]} /><meshStandardMaterial color="#FFF4D6" /></mesh>;
        })}
      </group>
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={shadowTex} transparent depthWrite={false} opacity={0.3} />
      </mesh>
      <group ref={root} scale={scale * 1.35}>
        <group ref={body}>
          <primitive object={rig.mesh} />
          {/* eyes + speech-bubble anchor live on the neck bone, so they move with the head */}
          {createPortal(<>
            {EYES.map((e, i) => <Eye key={i} e={e} neck={rig.neck} lidRef={(r) => (lids.current[i] = r)} pupilRef={(r) => (pupils.current[i] = r)} />)}
            <group ref={headAnchor} position={[0, 0.25, 0.05]} />
          </>, rig.neckBone)}
        </group>
      </group>
    </>
  );
}

useGLTF.preload(MODEL, false, true);
