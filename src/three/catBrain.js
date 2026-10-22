// COCO's behaviour brain: a small state machine that turns pointer activity into cat-like decisions.
// Everything is plain numbers so the render loop can run it 60x per second without React re-renders.

export const pointer = { nx: 0, ny: 0, speed: 0, lastMove: 0, has: false, clickAt: 0 };

let installed = false;
export function installPointer() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  let lx = 0, ly = 0, lt = performance.now();
  const onMove = (e) => {
    const now = performance.now();
    const dt = Math.max(8, now - lt);
    const dist = Math.hypot(e.clientX - lx, e.clientY - ly);
    pointer.speed = pointer.speed * 0.6 + (dist / dt) * 0.4; // px per ms, smoothed
    lx = e.clientX; ly = e.clientY; lt = now;
    pointer.nx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ny = -(e.clientY / window.innerHeight) * 2 + 1;
    pointer.lastMove = now;
    pointer.has = true;
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onMove, { passive: true });
}

export const STATES = ['idle', 'walk', 'run', 'sit', 'groom', 'loaf', 'sleep', 'stretch', 'crouch', 'pounce', 'hop', 'purr'];

export function createBrain() {
  return {
    state: 'sit',
    since: 0,           // seconds in current state
    t: 0,
    pounceFrom: null,
    pounceTo: null,
    nextIdleAct: 4 + Math.random() * 4,
    set(s) { if (this.state !== s) { this.state = s; this.since = 0; } },
  };
}

// decide the next state. dist = distance to the target on the floor, inside = target is reachable
export function think(brain, { dist, now, dt, wantHop, petted }) {
  brain.since += dt;
  brain.t += dt;
  const idleFor = (now - pointer.lastMove) / 1000;
  const s = brain.state;

  if (petted) { brain.set('purr'); return; }
  if (wantHop && s !== 'sleep') { brain.set('hop'); return; }

  // one-shot actions finish first
  if (s === 'hop' && brain.since < 0.9) return;
  if (s === 'purr' && brain.since < 2.6) return;
  if (s === 'pounce' && brain.since < 0.75) return;
  if (s === 'stretch' && brain.since < 2.2) return;
  if (s === 'stretch') { brain.set('sit'); return; }

  // sleepy cat: no pointer for a while -> lie down; any movement -> wake up with a stretch
  if (s === 'sleep') { if (idleFor < 0.3) brain.set('stretch'); return; }
  if (idleFor > 22 && (s === 'sit' || s === 'loaf' || s === 'idle' || s === 'groom')) { brain.set('sleep'); return; }

  // hunting: a fast-moving pointer close by is prey
  if (s === 'crouch') {
    if (brain.since > 0.9 && dist < 2.4) { brain.set('pounce'); return; }
    if (dist > 2.8 || brain.since > 2) { brain.set('walk'); return; }
    return;
  }
  if (pointer.speed > 1.1 && dist > 0.7 && dist < 2.2 && s !== 'pounce' && Math.random() < dt * 3) { brain.set('crouch'); return; }

  if (dist > 3.2) { brain.set('run'); return; }
  if (dist > 0.85) { brain.set(s === 'run' && dist > 1.6 ? 'run' : 'walk'); return; }

  // arrived near the cursor
  if (s === 'walk' || s === 'run' || s === 'pounce') { brain.set('idle'); return; }
  if (s === 'idle' && brain.since > 0.8) { brain.set('sit'); return; }
  if (s === 'sit' && brain.since > brain.nextIdleAct) {
    brain.set(Math.random() < 0.55 ? 'groom' : 'loaf');
    brain.nextIdleAct = 5 + Math.random() * 6;
    return;
  }
  if (s === 'groom' && brain.since > 3.4) { brain.set('sit'); return; }
  if (s === 'loaf' && brain.since > 7) { brain.set('sit'); }
}
