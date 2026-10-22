// Full-screen, click-through 3D layer where COCO lives. The page stays fully usable underneath.
import { Canvas } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import CocoCat from './CocoCat';
import './catStage.css';

const LINES = {
  '/': ["Hi, I'm COCO! Move your mouse - I'll follow you.", 'Psst... click me for a purr.', "I'm a Persian - I help reunite lost pets across all 7 emirates."],
  '/board': ['Filter by emirate, breed and colour. Chats stay private!', 'Every listing is a family waiting.'],
  '/report': ["Post a pet - I strip your photo's GPS so your home stays private.", 'Add as many pets as you need in one go.'],
};

// soft synthesized purr (no audio files): low-frequency rumble with 25 Hz amplitude flutter
function purr() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ac = purr.ac || (purr.ac = new AC());
    const len = ac.sampleRate * 1.8, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.2; }
    const src = ac.createBufferSource(); src.buffer = buf;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
    const g = ac.createGain(); g.gain.value = 0;
    const lfo = ac.createOscillator(); lfo.frequency.value = 24; const lg = ac.createGain(); lg.gain.value = 0.18;
    lfo.connect(lg).connect(g.gain);
    g.gain.setValueAtTime(0, ac.currentTime); g.gain.linearRampToValueAtTime(0.22, ac.currentTime + 0.25); g.gain.linearRampToValueAtTime(0, ac.currentTime + 1.8);
    src.connect(lp).connect(g).connect(ac.destination); src.start(); lfo.start(); src.stop(ac.currentTime + 1.8); lfo.stop(ac.currentTime + 1.8);
  } catch { /* audio is a bonus */ }
}

export default function CatStage() {
  const location = useLocation();
  const petSignal = useRef(0), hopSignal = useRef(0), restSignal = useRef(false);
  const [resting, setResting] = useState(false);
  const anchor = useRef(), bubble = useRef(), hit = useRef(), fx = useRef();
  const stateRef = useRef('sit');
  const [line, setLine] = useState(LINES['/'][0]);
  const [showLine, setShowLine] = useState(true);

  useEffect(() => { // new page -> happy hop + a fresh line
    hopSignal.current++;
    const l = LINES[location.pathname] || LINES['/'];
    setLine(l[0]); setShowLine(true);
    const t = setTimeout(() => setShowLine(false), 7000);
    return () => clearTimeout(t);
  }, [location.pathname]);

  // COCO goes to its carpet while the visitor fills in details: on the report form, when any field has
  // focus, or while the pointer is over a form panel / pet details. It comes back when they leave.
  useEffect(() => {
    let overForm = false, focused = false;
    const FORM = '.panel, .sheet, .filters, .consent-sheet, form, input, textarea, select';
    const update = () => {
      const r = location.pathname === '/report' || overForm || focused;
      if (r !== restSignal.current) { restSignal.current = r; setResting(r); }
    };
    const onOver = (e) => { overForm = !!e.target.closest?.(FORM); update(); };
    const onFocus = (e) => { focused = !!e.target.closest?.('input, textarea, select'); update(); };
    const onBlur = () => { setTimeout(() => { focused = !!document.activeElement?.closest?.('input, textarea, select'); update(); }, 0); };
    window.addEventListener('pointerover', onOver, { passive: true });
    window.addEventListener('focusin', onFocus);
    window.addEventListener('focusout', onBlur);
    update();
    return () => { window.removeEventListener('pointerover', onOver); window.removeEventListener('focusin', onFocus); window.removeEventListener('focusout', onBlur); };
  }, [location.pathname]);

  useEffect(() => {
    if (!resting) return;
    setLine("I'll wait on my carpet while you fill this in 💛"); setShowLine(true);
    const t = setTimeout(() => setShowLine(false), 5000);
    return () => clearTimeout(t);
  }, [resting]);

  const headAt = useRef({ x: -999, y: -999 });
  const onScreen = (x, y, s) => {
    headAt.current.x = x; headAt.current.y = y;
    if (anchor.current) anchor.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    if (anchor.current) anchor.current.dataset.flip = x > window.innerWidth * 0.55 ? '1' : '0'; // keep the bubble on screen
    if (s !== stateRef.current) {
      stateRef.current = s;
      if (fx.current) fx.current.dataset.state = s;
    }
  };

  useEffect(() => {
    const onDown = (e) => {
      if (e.target.closest?.('a, button, input, select, textarea, label, [role="button"], [role="tab"], .leaflet-container')) return; // page controls always win
      const dx = e.clientX - headAt.current.x, dy = e.clientY - (headAt.current.y + 20);
      if (dx * dx + dy * dy < 55 * 55) pet();
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  });

  const pet = () => {
    petSignal.current++;
    purr();
    const l = LINES[location.pathname] || LINES['/'];
    setLine(['Prrrr... 💛', ...l][Math.floor(Math.random() * (l.length + 1))]); setShowLine(true);
    const box = fx.current; if (!box) return;
    for (let i = 0; i < 7; i++) {
      const h = document.createElement('span');
      h.className = 'coco-heart'; h.textContent = i % 3 ? '♥' : '✦';
      h.style.setProperty('--dx', `${(Math.random() - 0.5) * 120}px`);
      h.style.setProperty('--d', `${0.9 + Math.random() * 0.8}s`);
      h.style.left = `${(Math.random() - 0.5) * 30}px`;
      box.appendChild(h); setTimeout(() => h.remove(), 1800);
    }
  };

  return (
    <div className={`coco-stage ${resting ? "is-resting" : ""}`} aria-hidden="false">
      <Canvas
        className="coco-canvas"
        // R3F puts an inline pointer-events:auto on its wrapper div, which covered the whole page and
        // swallowed every click. The cat layer must be click-through (only the small .coco-hit3d is clickable).
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        dpr={[1, 1.25]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 3.1, 10], fov: 28, near: 0.1, far: 60 }}
        onCreated={({ camera }) => camera.lookAt(0, 0.45, 0)}
      >
        <hemisphereLight args={['#fff4e2', '#b9875a', 0.75]} />
        <directionalLight position={[3, 6, 5]} intensity={1.9} color="#fff1dc" />
        <directionalLight position={[-4, 3, -4]} intensity={1.2} color="#9fd0ff" />
        <Environment resolution={64}>
          <Lightformer intensity={2} position={[0, 4, 4]} scale={[6, 2, 1]} color="#fff3e0" />
          <Lightformer intensity={1.2} position={[-5, 1, 0]} rotation-y={Math.PI / 2} scale={[4, 2, 1]} color="#ffd6a0" />
          <Lightformer intensity={0.8} position={[5, 1, -2]} rotation-y={-Math.PI / 2} scale={[4, 2, 1]} color="#bfe3ff" />
        </Environment>
        <CocoCat onScreen={onScreen} petSignal={petSignal} hopSignal={hopSignal} restSignal={restSignal} scale={window.innerWidth < 700 ? 0.4 : window.innerWidth < 1100 ? 0.5 : 0.6} />
      </Canvas>
      <div className="coco-anchor" ref={anchor}>
        <div className="coco-fx" ref={fx} data-state="sit">
          <span className="coco-z">z</span><span className="coco-z">z</span><span className="coco-z">Z</span>
        </div>
        <span ref={hit} className="coco-hit3d" aria-hidden="true" />
        <div ref={bubble} className={`coco-bubble3d ${showLine ? 'is-on' : ''}`} role="status">{line}</div>
      </div>
    </div>
  );
}
