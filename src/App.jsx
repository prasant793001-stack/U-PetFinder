import { Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef, lazy, Suspense, Component } from 'react';
import Landing from './pages/Landing';
import { isFirebaseReady } from './firebaseFlag';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);
import './App.css';
import './AppShell.css';

const CatStage = lazy(() => import('./three/CatStage'));
// Board + Add pages (and the Firebase SDK they need) load only when visited
const Board = lazy(() => import('./pages/Board'));
const ReportPet = lazy(() => import('./pages/ReportPet'));
const CocoStudio = lazy(() => import('./pages/CocoStudio'));
const canWebGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const COCO_LINES = {
  '/': "Hi, I'm COCO! I help reunite lost pets with their families across the UAE.",
  '/board': 'Filter by emirate, animal, breed and colour. Chats stay private - no phone numbers shown!',
  '/report': "Tap here to post a pet - I'll strip the photo's location data to protect your home privacy!"
};

// If the 3D chunk fails to download or WebGL crashes, show the lightweight 2D COCO instead of a broken page.
class Safe extends Component {
  constructor(p) { super(p); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e) { console.warn('[U-PetFinder] 3D COCO disabled:', e?.message); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function Logo() {
  return (
    <svg width="44" height="44" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="pin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFB347" />
          <stop offset="1" stopColor="#FF9F1C" />
        </linearGradient>
      </defs>
      {/* map pin with cat ears */}
      <path d="M32 60 C32 60 10 38 10 24 C10 18 12 13 15 10 L14 2 L23 7 C26 6 29 5.5 32 5.5 C35 5.5 38 6 41 7 L50 2 L49 10 C52 13 54 18 54 24 C54 38 32 60 32 60 Z" fill="url(#pin)" />
      <circle cx="32" cy="25" r="11" fill="#FFF8EC" />
      <circle cx="28" cy="23" r="1.8" fill="#2D3748" />
      <circle cx="36" cy="23" r="1.8" fill="#2D3748" />
      <path d="M30.5 27.5 L32 29 L33.5 27.5" fill="none" stroke="#2D3748" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M21 26 L13 24 M21 29 L13 30 M43 26 L51 24 M43 29 L51 30" stroke="#2D3748" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function Coco({ message, jumping, look }) {
  const [talking, setTalking] = useState(true);
  useEffect(() => {
    setTalking(true);
    const t = setTimeout(() => setTalking(false), 8000);
    return () => clearTimeout(t);
  }, [message]);
  return (
    <div className={`coco ${jumping ? 'coco-jump' : ''}`}>
      {talking && <div className="coco-say" role="status">{message}</div>}
      <button className="coco-hit" aria-label="Ask COCO" onClick={() => setTalking(t => !t)} />
      <svg className="coco-cat" viewBox="0 0 120 120" aria-label="COCO the cat guide">
        <path className="coco-tailpath" d="M88 96 C108 92 112 70 100 62" fill="none" stroke="#E58E18" strokeWidth="8" strokeLinecap="round" />
        <ellipse className="coco-breathe" cx="60" cy="92" rx="30" ry="22" fill="#FF9F1C" />
        <g style={{ transform: `rotate(${look.x * 8}deg)`, transformOrigin: '60px 60px', transition: 'transform .25s ease-out' }}>
          <path d="M30 40 L28 12 L50 30 Z M90 40 L92 12 L70 30 Z" fill="#FF9F1C" />
          <path d="M33 34 L32 19 L44 29 Z M87 34 L88 19 L76 29 Z" fill="#FFD6A0" />
          <circle cx="60" cy="52" r="32" fill="#FF9F1C" />
          <ellipse cx="48" cy="50" rx="7" ry="8" fill="#fff" />
          <ellipse cx="72" cy="50" rx="7" ry="8" fill="#fff" />
          <circle cx={48 + look.x * 3} cy={51 - look.y * 3} r="4" fill="#2D3748" />
          <circle cx={72 + look.x * 3} cy={51 - look.y * 3} r="4" fill="#2D3748" />
          <path d="M57 60 L60 63 L63 60 Z" fill="#C2410C" />
          <path d="M60 63 Q55 68 51 65 M60 63 Q65 68 69 65" fill="none" stroke="#2D3748" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M40 60 L24 57 M40 64 L24 66 M80 60 L96 57 M80 64 L96 66" stroke="#2D3748" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}

function App() {
  const location = useLocation();
  const [showCoco, setShowCoco] = useState(true);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [jumping, setJumping] = useState(false);
  const first = useRef(true);
  const message = COCO_LINES[location.pathname] || COCO_LINES['/'];

  // buttery smooth scrolling, synced with GSAP ScrollTrigger
  useEffect(() => {
    if (reducedMotion) return;
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => { gsap.ticker.remove(tick); lenis.destroy(); };
  }, []);

  useEffect(() => {
    let raf = 0;
    const onMove = (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setLook({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1
      }));
    };
    window.addEventListener('mousemove', onMove);
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    window.scrollTo({ top: 0 });
    setTimeout(() => ScrollTrigger.refresh(), 300);
    setJumping(true);
    const t = setTimeout(() => setJumping(false), 900);
    return () => clearTimeout(t);
  }, [location.pathname]);

  const link = ({ isActive }) => `shell-link ${isActive ? 'is-active' : ''}`;

  return (
    <div className="app">
      <div className="ambient" aria-hidden="true">
        <span className="blob b1" /><span className="blob b2" /><span className="blob b3" />
      </div>

      <nav className="shell-nav">
        <NavLink to="/" className="shell-brand" end>
          <Logo />
          <span>
            <strong>U-PetFinder</strong>
            <small>FORM. DESIGN. AI</small>
          </span>
        </NavLink>
        <div className="shell-links">
          <NavLink to="/" end className={link}>Home</NavLink>
          <NavLink to="/board" className={link}>Lost &amp; Found</NavLink>
          <NavLink to="/report" className={link}>Report a Pet</NavLink>
        </div>
        <button className="shell-coco-toggle" onClick={() => setShowCoco(s => !s)}>
          {showCoco ? 'Hide COCO' : 'Show COCO'}
        </button>
      </nav>

      {!isFirebaseReady && (
        <div className="demo-banner">Preview mode · sample listings</div>
      )}

      <main className="shell-main">
        <Suspense fallback={<div className="page-loading" aria-busy="true" />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/board" element={<Board />} />
          <Route path="/report" element={<ReportPet />} />
          <Route path="/coco" element={<CocoStudio />} />
          <Route path="/add" element={<Navigate to="/report" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </main>

      {showCoco && location.pathname !== '/coco' && (canWebGL && !reducedMotion
        ? <Safe fallback={<Coco message={message} jumping={jumping} look={look} />}><Suspense fallback={null}><CatStage /></Suspense></Safe>
        : <Coco message={message} jumping={jumping} look={look} />)}

      <footer className="shell-footer">
        <div>
          <strong>U-PetFinder</strong>
          <p>Reconnecting lost pets with their families across the UAE. An AAKRITI network project.</p>
        </div>
        <div>
          <a href="mailto:prasant.aakriti@gmail.com">prasant.aakriti@gmail.com</a>
        </div>
        <div className="shell-legal">
          <p>Aligned with UAE Federal Decree-Law No. 45 of 2021 (PDPL)</p>
          <p>Data region: UAE (me-central1)</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
