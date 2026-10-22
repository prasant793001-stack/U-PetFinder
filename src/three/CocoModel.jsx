// COCO - the grey sculpted kitten. Two 3D models were generated locally with TRELLIS.2 (ComfyUI, RTX 5070)
// from the owner's reference photos (recoloured grey): a SITTING pose and a STANDING / walking pose made with
// FLUX.2 Klein. Both carry baked colour + normal maps. Here they get a light skeleton (cocoRig.json):
// head on both, four stepping legs + tail on the standing model, blinking eyelids. COCO swaps between the
// two poses the way a real cat stands up and sits down.
import { useMemo, useRef, useEffect } from 'react';
import { useFrame, useThree, createPortal } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { pointer, installPointer, createBrain, think } from './catBrain';
import RIG from './cocoRig.json';

const M_ = `${import.meta.env.BASE_URL}models/`;
const SIT_URL = `${M_}coco-sit.glb`;
const WALK_URL = `${M_}coco-walk.glb`;
// the same fur texture with half-closed / closed eyes painted in (blinks, naps, happy squints)
const EYES = { sit: [`${M_}coco-sit-eyes-half.webp`, `${M_}coco-sit-eyes-closed.webp`], walk: [`${M_}coco-walk-eyes-half.webp`, `${M_}coco-walk-eyes-closed.webp`] };
const damp = THREE.MathUtils.damp;
const clamp = THREE.MathUtils.clamp;
const smooth = THREE.MathUtils.smoothstep;
const STANDING = new Set(['walk', 'run', 'crouch', 'pounce', 'idle']);
// walk gait (lateral sequence, like a real cat): left hind, left fore, right hind, right fore
const GAIT = { LH: 0, LF: 0.25, RH: 0.5, RF: 0.75 };

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

// Turn a generated GLB into a skinned mesh with bones at the rig points.
function useRigged(url, rig) {
  const gltf = useGLTF(url, false, true);
  return useMemo(() => {
    let src = null;
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse((o) => { if (o.isMesh && !src) src = o; });
    const g0 = src.geometry, n = g0.attributes.position.count, M = src.matrixWorld;
    const pos = new Float32Array(n * 3), v = new THREE.Vector3();
    for (let i = 0; i < n; i++) { v.fromBufferAttribute(g0.attributes.position, i).applyMatrix4(M); pos.set([v.x, v.y, v.z], i * 3); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    if (g0.attributes.uv) geo.setAttribute('uv', g0.attributes.uv);
    geo.setIndex(g0.index);
    // keep the model's own normals: the generated mesh's triangle winding is not reliable, so normals
    // recomputed from it can point inwards and make the fur render almost black
    if (g0.attributes.normal) {
      const nm = new THREE.Matrix3().getNormalMatrix(M), nrm = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { v.fromBufferAttribute(g0.attributes.normal, i).applyMatrix3(nm).normalize(); nrm.set([v.x, v.y, v.z], i * 3); }
      geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    } else geo.computeVertexNormals();

    const bones = [new THREE.Bone()]; // 0 = root (feet level, model origin)
    const add = (p) => { const b = new THREE.Bone(); b.position.set(p[0], p[1], p[2]); bones[0].add(b); bones.push(b); return bones.length - 1; };
    const neckI = add(rig.neck);
    const legI = (rig.legs || []).map((L) => add(L.pivot));
    const tailI = rig.tail ? add(rig.tail.base) : -1;

    const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    const head = rig.head, nk = rig.neck;
    for (let i = 0; i < n; i++) {
      const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
      const w = [];
      // head + neck: everything around the head, fading out down the neck
      const dh = Math.hypot(x - head[0], y - head[1], z - head[2]);
      let wn;
      if (rig.kind === 'walk') wn = Math.max(1 - smooth(dh, 0.2, 0.3), smooth(z, nk[2] - 0.02, nk[2] + 0.1) * smooth(y, nk[1] - 0.06, nk[1] + 0.06));
      else wn = Math.max(smooth(y, nk[1] + 0.02, nk[1] + 0.12), 1 - smooth(dh, 0.2, 0.3)) * smooth(y, nk[1] - 0.08, nk[1]);
      if (wn > 0.001) w.push([neckI, wn]);
      // legs: nearest leg column, below its pivot
      if (legI.length) {
        let best = -1, bd = 1e9;
        rig.legs.forEach((L, k) => { const d = Math.hypot(x - L.foot[0], z - L.foot[2]); if (d < bd) { bd = d; best = k; } });
        const L = rig.legs[best];
        const wl = (1 - smooth(y, L.pivot[1] - 0.12, L.pivot[1] + 0.02)) * (1 - smooth(bd, 0.09, 0.15));
        if (wl > 0.001) w.push([legI[best], wl]);
      }
      // tail: everything behind the tail base and above the hips
      if (tailI >= 0) {
        const tb = rig.tail.base;
        const wt = smooth(tb[2] - z, 0.0, 0.07) * smooth(y, tb[1] - 0.06, tb[1] + 0.04);
        if (wt > 0.001) w.push([tailI, wt]);
      }
      w.sort((a, b) => b[1] - a[1]);
      let tot = 0; const use = w.slice(0, 3);
      use.forEach((e) => { tot += e[1]; });
      if (tot > 1) { use.forEach((e) => { e[1] /= tot; }); tot = 1; }
      const idx = [0, 0, 0, 0], wt = [1 - tot, 0, 0, 0];
      use.forEach((e, k) => { idx[k + 1] = e[0]; wt[k + 1] = e[1]; });
      si.set(idx, i * 4); sw.set(wt, i * 4);
    }
    geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    const mat = src.material.clone();
    mat.side = THREE.DoubleSide; mat.metalness = 0; mat.envMapIntensity = 0.9;
    if (mat.roughness !== undefined) mat.roughness = Math.max(mat.roughness ?? 0.8, 0.55);
    const eyeMaps = { open: mat.map, half: null, closed: null };
    const loader = new THREE.TextureLoader();
    (EYES[rig.kind] || []).forEach((u, k) => loader.load(u, (t) => {
      t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
      if (mat.map) { t.wrapS = mat.map.wrapS; t.wrapT = mat.map.wrapT; t.channel = mat.map.channel; t.minFilter = mat.map.minFilter; t.magFilter = mat.map.magFilter; }
      eyeMaps[k ? 'closed' : 'half'] = t;
    }));
    const mesh = new THREE.SkinnedMesh(geo, mat);
    mesh.add(bones[0]);
    mesh.bind(new THREE.Skeleton(bones));
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    return { mesh, eyeMaps, neck: bones[neckI], legs: legI.map((k, j) => ({ bone: bones[k], ...rig.legs[j] })), tail: tailI >= 0 ? bones[tailI] : null, rig };
  }, [gltf, rig]);
}

function Rig({ r, anchor }) {
  return createPortal(<group ref={anchor} position={[0, 0.3, 0.05]} />, r.neck);
}

export default function CocoModel({ onScreen, petSignal, hopSignal, restSignal, avoid = null, scale = 0.6, studio = null }) {
  const { camera, size } = useThree();
  const sitR = useRigged(SIT_URL, RIG.sit);
  const walkR = useRigged(WALK_URL, RIG.walk);
  // make both poses the same cat: match head size (eye spacing)
  const walkK = useMemo(() => {
    const d = (r) => { const e = r.eyes; return e && e.length === 2 ? Math.hypot(e[0].c[0] - e[1].c[0], e[0].c[1] - e[1].c[1], e[0].c[2] - e[1].c[2]) : 0; };
    const a = d(RIG.sit), b = d(RIG.walk);
    // standing height (without the raised tail) should be a little under the sitting height, like a real kitten
    return a && b ? clamp((a / b) * 1.35, 0.9, 1.4) : 1.1;
  }, []);
  const brain = useMemo(createBrain, []);
  const rug = useRef(), root = useRef(), body = useRef(), sitG = useRef(), walkG = useRef(), shadow = useRef();
  const sitAnchor = useRef(), walkAnchor = useRef();
  const sim = useMemo(() => ({
    rug: new THREE.Vector3(2.5, 0, 1.5), rugInit: false, rugK: 0,
    pos: new THREE.Vector3(0.8, 0, 0.8), heading: -0.6, speed: 0, phase: 0, y: 0, swap: 0, standing: false, gaitAmp: 0,
    pose: { squash: 0, pitch: 0, roll: 0, lid: 0, lean: 0 },
    blinkAt: 1.5, blink: 0, petSeen: 0, hopSeen: 0, lookYaw: 0, lookPitch: 0, clearSide: 0,
    target: new THREE.Vector3(), look: new THREE.Vector3(),
  }), []);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const floor = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const tmp = useMemo(() => ({ v: new THREE.Vector3(), w: new THREE.Vector3(), p: new THREE.Vector3(), ndc: new THREE.Vector2() }), []);

  // ---- keep COCO (and its speech bubble) off readable content ---------------------------------------
  const footprint = (x, z) => {
    const H = scale * 1.35, hw = scale * 1.35 * 0.45, P = tmp.p, W = size.width, Hh = size.height;
    P.set(x - hw, 0, z).project(camera); const l = (P.x * 0.5 + 0.5) * W, foot = (-P.y * 0.5 + 0.5) * Hh;
    P.set(x + hw, 0, z).project(camera); const r = (P.x * 0.5 + 0.5) * W;
    P.set(x, H, z).project(camera); const top = (-P.y * 0.5 + 0.5) * Hh;
    return [l, top - 64, r, foot + 4];
  };
  const blocked = (b) => {
    const R = avoid?.current; if (!R) return false;
    for (let i = 0; i < R.length; i++) { const q = R[i]; if (b[0] < q[2] && b[2] > q[0] && b[1] < q[3] && b[3] > q[1]) return true; }
    return false;
  };
  const steerClear = (target, halfW) => {
    if (!blocked(footprint(target.x, target.z))) { sim.clearSide = 0; return; }
    let best = null, bestCost = Infinity;
    for (const z of [target.z, 2.4, 3.0, 3.4]) {
      for (let k = 1; k <= 14; k++) {
        for (const sgn of [-1, 1]) {
          const x = target.x + sgn * k * 0.22;
          if (Math.abs(x) > halfW) continue;
          const cost = k * 0.22 + Math.abs(z - target.z) * 0.6 + (sim.clearSide && sgn !== sim.clearSide ? 0.5 : 0);
          if (cost >= bestCost || blocked(footprint(x, z))) continue;
          best = [x, z, sgn]; bestCost = cost;
        }
      }
    }
    if (best) { target.x = best[0]; target.z = best[1]; sim.clearSide = best[2]; }
    else target.z = 3.4;
  };

  useEffect(() => { installPointer(); }, []);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const now = performance.now();
    const t = state.clock.elapsedTime;
    const P = sim.pose;

    // ---- where is the cursor on the floor? ---------------------------------------------------------
    const halfW = Math.max(0.35, camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (size.width / size.height) - 0.55 * scale - 0.2);
    if (pointer.has) {
      tmp.ndc.set(pointer.nx, Math.min(pointer.ny, 0.2));
      ray.setFromCamera(tmp.ndc, camera);
      if (ray.ray.intersectPlane(floor, tmp.v)) sim.target.copy(tmp.v);
    } else sim.target.set(Math.sin(t * 0.2) * 2, 0, 0.8);
    tmp.ndc.set(size.width < 700 ? 0.5 : 0.74, size.width < 700 ? -0.78 : -0.7);
    ray.setFromCamera(tmp.ndc, camera);
    if (ray.ray.intersectPlane(floor, tmp.v)) {
      tmp.v.x = clamp(tmp.v.x, -halfW + 0.2, halfW - 0.2); tmp.v.z = clamp(tmp.v.z, -2.4, 3.2);
      sim.rug.lerp(tmp.v, sim.rugInit ? Math.min(1, dt * 4) : 1); sim.rugInit = true;
    }
    const resting = !!restSignal?.current;
    sim.rugK = damp(sim.rugK, resting ? 1 : 0, 4, dt);
    rug.current.position.set(sim.rug.x, 0.004, sim.rug.z);
    rug.current.scale.setScalar(scale * 1.05 * Math.max(0.001, sim.rugK));
    rug.current.visible = !studio && sim.rugK > 0.02;
    if (resting) sim.target.copy(sim.rug);
    else if (brain.state !== 'crouch' && brain.state !== 'pounce') {
      tmp.w.set(sim.pos.x - sim.target.x, 0, sim.pos.z - sim.target.z);
      const away = tmp.w.length();
      if (away > 1e-3) sim.target.addScaledVector(tmp.w.multiplyScalar(1 / away), 1.05); else sim.target.x += 1.05;
    }
    sim.target.x = clamp(sim.target.x, -halfW, halfW);
    sim.target.z = clamp(sim.target.z, -2.6, 3.4);
    if (!studio && !resting && brain.state !== 'pounce') steerClear(sim.target, halfW);
    tmp.ndc.set(pointer.nx, pointer.ny);
    ray.setFromCamera(tmp.ndc, camera);
    ray.ray.at(camera.position.distanceTo(sim.pos) * 0.85, sim.look);

    const dx = sim.target.x - sim.pos.x, dz = sim.target.z - sim.pos.z;
    const dist = Math.hypot(dx, dz);
    const petted = petSignal.current !== sim.petSeen; sim.petSeen = petSignal.current;
    const wantHop = hopSignal.current !== sim.hopSeen; sim.hopSeen = hopSignal.current;
    const prev = brain.state;
    if (studio) { if (brain.state !== studio.state) { brain.state = studio.state; brain.since = 0; } else brain.since += dt; }
    else think(brain, { dist, now, dt, wantHop, petted, resting });
    const S = brain.state, since = brain.since;
    if (S === 'pounce' && prev !== 'pounce') { sim.pounceFrom = sim.pos.clone(); sim.pounceTo = sim.target.clone(); }

    // ---- locomotion ------------------------------------------------------------------------------
    const moving = S === 'walk' || S === 'run';
    const onRug = resting && dist < 0.3;
    const desired = onRug ? -0.35 : Math.atan2(dx, dz);
    const diff = Math.atan2(Math.sin(desired - sim.heading), Math.cos(desired - sim.heading));
    if (studio) sim.heading = studio.heading ?? 0;
    else if (moving || S === 'crouch' || S === 'idle' || (onRug && S !== 'sleep')) sim.heading += clamp(diff, -1, 1) * Math.min(1, dt * (S === 'run' ? 5 : 3.5));
    const targetSpeed = studio ? 0 : moving ? (S === 'run' ? 2.4 : 1.0) * (Math.abs(diff) < 1.1 ? 1 : 0.3) * clamp(dist / 1.2, 0.35, 1) : 0;
    sim.speed = damp(sim.speed, targetSpeed, 6, dt);
    if (S === 'pounce' && sim.pounceFrom) {
      const k = clamp(since / 0.75, 0, 1), e = k * k * (3 - 2 * k);
      sim.pos.lerpVectors(sim.pounceFrom, sim.pounceTo, e);
      sim.y = Math.sin(Math.PI * k) * 0.6;
    } else {
      if (studio) sim.pos.set(0, 0, 0);
      else { sim.pos.x += Math.sin(sim.heading) * sim.speed * dt; sim.pos.z += Math.cos(sim.heading) * sim.speed * dt; }
      sim.y = S === 'hop' ? Math.max(0, Math.sin(Math.PI * clamp(since / 0.7, 0, 1))) * 0.5 : damp(sim.y, 0, 10, dt);
    }
    sim.pos.x = clamp(sim.pos.x, -halfW, halfW); sim.pos.z = clamp(sim.pos.z, -2.6, 3.4);
    // stride: legs cycle in step with the distance walked (feet don't slide); studio walks in place
    const stepSpeed = studio && moving ? (S === 'run' ? 2.4 : 1.0) : sim.speed;
    sim.phase += stepSpeed * dt * (S === 'run' ? 1.5 : 1.9);

    // ---- which body: standing (walk model) or sitting --------------------------------------------
    const standing = STANDING.has(S);
    if (standing !== sim.standing) { sim.standing = standing; sim.swap = 1; }
    sim.swap = Math.max(0, sim.swap - dt * 6);
    sitG.current.visible = !standing; walkG.current.visible = standing;

    // ---- pose -----------------------------------------------------------------------------------
    const T = { squash: 0, pitch: 0, roll: 0, lid: 0, lean: 0 };
    if (S === 'loaf') Object.assign(T, { squash: 0.05, lid: 0.5 });
    if (S === 'sleep') Object.assign(T, { squash: 0.06, pitch: 0.16, roll: 0.2, lid: 1 });
    if (S === 'groom') Object.assign(T, { pitch: 0.2 + Math.sin(t * 7) * 0.06, roll: 0.12, lid: 0.6 });
    if (S === 'purr') Object.assign(T, { roll: 0.16 + Math.sin(t * 18) * 0.03, lid: 0.7 });
    if (S === 'crouch') Object.assign(T, { squash: 0.14, lean: 0.1, pitch: -0.1 });
    if (S === 'stretch') { const k = Math.sin(Math.PI * clamp(since / 2.2, 0, 1)); Object.assign(T, { squash: -0.06 * k, pitch: -0.3 * k, lid: 0.7 * k }); }
    for (const k in T) P[k] = damp(P[k], T[k], k === 'lid' ? 14 : 7, dt);

    const cyc = sim.phase / (Math.PI * 2) * Math.PI * 2;
    const gaitTarget = moving ? (S === 'run' ? 0.62 : 0.42) * clamp(stepSpeed / 0.8, 0.35, 1) : 0;
    sim.gaitAmp = damp(sim.gaitAmp, gaitTarget, 8, dt);
    const bob = moving ? Math.abs(Math.sin(cyc * 2)) * 0.018 * sim.gaitAmp / 0.42 : 0;
    root.current.position.set(sim.pos.x, sim.y + bob * scale, sim.pos.z);
    root.current.rotation.y = sim.heading;
    const breathe = Math.sin(t * (S === 'sleep' ? 1.6 : S === 'purr' ? 10 : 2.4)) * (S === 'purr' ? 0.006 : 0.01);
    const sq = P.squash + sim.swap * 0.08 + (S === 'hop' && sim.y > 0.02 ? -0.06 : 0);
    body.current.scale.set(1 + sq * 0.5 + breathe, 1 - sq + breathe, 1 + sq * 0.5 + breathe);
    const wiggle = S === 'crouch' && since > 0.35 ? Math.sin(t * 22) * 0.04 : 0;
    body.current.rotation.set(P.lean, wiggle, moving ? Math.sin(cyc) * 0.025 : wiggle * 0.5);

    // legs: real stepping on the standing model
    const W = walkR;
    W.legs.forEach((L) => {
      const off = GAIT[(L.side || 'L') + (L.front ? 'F' : 'H')] || 0;
      const a = (cyc + off * Math.PI * 2);
      let swing = Math.sin(a) * sim.gaitAmp;
      let lift = Math.max(0, Math.cos(a)) * sim.gaitAmp * 0.07;
      if (S === 'pounce') { const k = Math.sin(Math.PI * clamp(since / 0.75, 0, 1)); swing = (L.front ? 0.7 : -0.7) * k; lift = 0; }
      if (S === 'crouch') { swing = L.front ? 0.25 : -0.35; lift = -0.03; }
      L.bone.rotation.x = damp(L.bone.rotation.x, -swing, 18, dt);
      L.bone.position.y = damp(L.bone.position.y, L.pivot[1] + lift, 18, dt);
    });
    if (W.tail) {
      const low = S === 'crouch';
      W.tail.rotation.x = damp(W.tail.rotation.x, low ? 0.7 : moving ? -0.1 + Math.sin(cyc * 2) * 0.06 : -0.05, 5, dt);
      W.tail.rotation.z = Math.sin(t * (low ? 9 : 1.8)) * (low ? 0.12 : 0.22);
    }

    // head: looks at the cursor, with state overrides
    const active = standing ? walkR : sitR;
    tmp.w.copy(sim.look); root.current.worldToLocal(tmp.w);
    const s3 = scale * 1.35;
    let yaw = Math.atan2(tmp.w.x, tmp.w.z);
    let pitch = -Math.atan2(tmp.w.y / s3 - 0.65, Math.hypot(tmp.w.x, tmp.w.z) / s3);
    const alert = S !== 'sleep' && S !== 'groom' && S !== 'loaf';
    yaw = studio ? Math.sin(t * 0.5) * 0.3 : alert ? clamp(yaw, -0.7, 0.7) : 0;
    pitch = studio ? -0.05 : alert ? clamp(pitch, -0.35, 0.25) : 0;
    if (moving) { yaw *= 0.4; pitch *= 0.4; }
    sim.lookYaw = damp(sim.lookYaw, yaw, 5, dt); sim.lookPitch = damp(sim.lookPitch, pitch, 5, dt);
    [sitR, walkR].forEach((r) => r.neck.rotation.set(P.pitch + sim.lookPitch + (moving && r === walkR ? Math.sin(cyc * 2) * 0.03 : 0), sim.lookYaw, P.roll + (S === 'idle' ? Math.sin(t * 0.7) * 0.05 : 0), 'YXZ'));

    // eyes: blinks (sometimes a slow trusting blink) and sleepy lids
    sim.blinkAt -= dt;
    if (sim.blinkAt < 0) { sim.blink = 1; sim.blinkAt = 2 + Math.random() * 4; sim.slowBlink = Math.random() < 0.2; }
    sim.blink = Math.max(0, sim.blink - dt * (sim.slowBlink ? 2.4 : 8));
    const lid = Math.max(P.lid, Math.sin(sim.blink * Math.PI));
    const level = lid > 0.72 ? 'closed' : lid > 0.3 ? 'half' : 'open';
    [sitR, walkR].forEach((r) => { const m = r.eyeMaps[level] || r.eyeMaps.open; if (r.mesh.material.map !== m) r.mesh.material.map = m; });

    shadow.current.position.set(sim.pos.x, 0.002, sim.pos.z);
    shadow.current.rotation.z = -sim.heading;
    const sh = 1 - clamp(sim.y, 0, 0.8) * 0.7;
    shadow.current.scale.set(0.9 * sh * scale, (standing ? 1.35 : 0.95) * sh * scale, 1);
    shadow.current.material.opacity = 0.32 * sh;

    if (onScreen) {
      const A = standing ? walkAnchor.current : sitAnchor.current;
      if (A) {
        A.getWorldPosition(tmp.v); tmp.v.project(camera);
        onScreen((tmp.v.x * 0.5 + 0.5) * size.width, (-tmp.v.y * 0.5 + 0.5) * size.height, S);
      }
    }
  });

  const rugTex = useMemo(rugTexture, []);
  const shadowTex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    gr.addColorStop(0, 'rgba(40,30,25,1)'); gr.addColorStop(1, 'rgba(40,30,25,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }, []);

  return (
    <>
      <group ref={rug} visible={false}>
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
          <group ref={sitG}><primitive object={sitR.mesh} /><Rig r={sitR} anchor={sitAnchor} /></group>
          <group ref={walkG} scale={walkK} visible={false}><primitive object={walkR.mesh} /><Rig r={walkR} anchor={walkAnchor} /></group>
        </group>
      </group>
    </>
  );
}

useGLTF.preload(SIT_URL, false, true);
useGLTF.preload(WALK_URL, false, true);
