import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import Landing from './pages/Landing';
import LostFoundBoard from './pages/LostFoundBoard';
import AddListing from './pages/AddListing';
import './App.css';

function App() {
  const [cocoState, setCocoState] = useState({
    position: { x: 0, y: 0 },
    animation: 'idle',
    message: 'Hi! I\'m COCO! Your friendly pet finder guide!'
  });
  const [showCoco, setShowCoco] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [currentPage, setCurrentPage] = useState('landing');

  // Track mouse movement for COCO
  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // COCO animations based on page changes
  useEffect(() => {
    const previousPage = currentPage;
    const nextPage = currentPage;

    if (previousPage !== nextPage) {
      setCocoState(prev => ({
        ...prev,
        animation: 'jump',
        message: 'Let\'s explore together!'
      }));

      setTimeout(() => {
        setCocoState(prev => ({
          ...prev,
          animation: 'idle'
        }));
      }, 1000);
    }
  }, [currentPage]);

  return (
    <div className="app">
      {/* Background video - ambient room interior */}
      <div className="background-video">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="ambient-bg"
        >
          <source src="/assets/ambient-room.mp4" type="video/mp4" />
        </video>
        <div className="overlay-glass" />
      </div>

      {/* Navigation */}
      <nav className="glass-nav">
        <div className="nav-brand">
          <svg width="40" height="40" viewBox="0 0 100 100" className="logo-svg">
            {/* Map pin base */}
            <path
              d="M50 5 L65 25 L85 25 L68 42 L72 65 L50 78 L28 65 L32 42 L15 25 L35 25 Z"
              fill="url(#pinGradient)"
              stroke="#FF9F1C"
              strokeWidth="2"
            />
            {/* Cat ears */}
            <path d="M45 25 L38 15 L52 22 Z" fill="#FF9F1C" />
            <path d="M55 25 L62 15 L48 22 Z" fill="#FF9F1C" />
            {/* Whiskers */}
            <line x1="35" y1="35" x2="25" y2="38" stroke="#2D3748" strokeWidth="2" />
            <line x1="38" y1="40" x2="28" y2="42" stroke="#2D3748" strokeWidth="2" />
            <line x1="62" y1="35" x2="72" y2="38" stroke="#2D3748" strokeWidth="2" />
            <line x1="59" y1="40" x2="69" y2="42" stroke="#2D3748" strokeWidth="2" />
            {/* Face */}
            <circle cx="50" cy="55" r="8" fill="#2D3748" />
            <circle cx="46" cy="55" r="2" fill="white" />
            <circle cx="54" cy="55" r="2" fill="white" />
            <path d="M48 62 Q50 64 52 62" fill="none" stroke="#2D3748" strokeWidth="2" />
          </svg>
          <span className="brand-text">U-PetFinder</span>
        </div>
        <div className="nav-links">
          <button 
            className={`nav-link ${currentPage === 'landing' ? 'active' : ''}`}
            onClick={() => setCurrentPage('landing')}
          >
            Home
          </button>
          <button 
            className={`nav-link ${currentPage === 'board' ? 'active' : ''}`}
            onClick={() => setCurrentPage('board')}
          >
            Lost & Found
          </button>
          <button 
            className={`nav-link ${currentPage === 'add' ? 'active' : ''}`}
            onClick={() => setCurrentPage('add')}
          >
            Add Pet
          </button>
        </div>
        <button 
          className="coco-toggle"
          onClick={() => setShowCoco(!showCoco)}
        >
          {showCoco ? 'Hide COCO' : 'Show COCO'}
        </button>
      </nav>

      {/* Main content */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/board" element={<LostFoundBoard />} />
          <Route path="/add" element={<AddListing />} />
        </Routes>
      </main>

      {/* COCO 3D Agent */}
      {showCoco && (
        <div 
          className="coco-container"
          style={{
            transform: `translate(${mousePos.x * -40}px, ${mousePos.y * -40}px)`,
            animation: cocoState.animation
          }}
        >
          <div className="coco-bubble">
            <div className="bubble-content">
              <p>{cocoState.message}</p>
            </div>
          </div>
          <div className="coco-avatar">
            {/* COCO - Stylized 3D Cat */}
            <div className="coco-3d-model">
              <div className="coco-head">
                <div className="coco-ears">
                  <div className="ear left" />
                  <div className="ear right" />
                </div>
                <div className="coco-face">
                  <div className="coco-eyes">
                    <div className="eye left">
                      <div className="pupil left" style={{ transform: `translateX(${mousePos.x * 8}px)` }} />
                    </div>
                    <div className="eye right">
                      <div className="pupil right" style={{ transform: `translateX(${mousePos.x * 8}px)` }} />
                    </div>
                  </div>
                  <div className="coco-nose" />
                  <div className="coco-mouth" />
                  <div className="coco-whiskers">
                    <div className="whisker left-1" />
                    <div className="whisker left-2" />
                    <div className="whisker right-1" />
                    <div className="whisker right-2" />
                  </div>
                </div>
                <div className="coco-body" />
                <div className="coco-tail" style={{ animation: cocoState.animation === 'idle' ? 'tail-swish 3s ease-in-out infinite' : '' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="glass-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h4>U-PetFinder</h4>
            <p>Reconnecting lost pets with their families across the UAE</p>
          </div>
          <div className="footer-contact">
            <a href="mailto:prasant.aakriti@gmail.com">prasant.aakriti@gmail.com</a>
          </div>
          <div className="footer-compliance">
            <p>Compliant with UAE Federal Decree-Law No. 45 of 2021</p>
            <p>Data Center: UAE (me-central1)</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
