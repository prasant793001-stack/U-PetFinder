import { useState, useEffect, useRef } from 'react';
import './CocoAgent.css';

// Simple SVG cat avatar for COCO (lightweight, no external model needed)
const CocoAvatar = ({ message, showBubble }) => {
  return (
    <div className="coco-avatar">
      {/* Cat head */}
      <svg viewBox="0 0 200 200" className="coco-svg">
        {/* Ears */}
        <path d="M50 60 L40 20 L90 45 Z" fill="#FF9F1C" />
        <path d="M150 60 L160 20 L110 45 Z" fill="#FF9F1C" />
        
        {/* Face */}
        <circle cx="100" cy="100" r="70" fill="#FF9F1C" />
        
        {/* Eyes */}
        <ellipse cx="75" cy="90" rx="12" ry="10" fill="white" />
        <ellipse cx="125" cy="90" rx="12" ry="10" fill="white" />
        <circle cx="75" cy="90" r="5" fill="#2D3748" />
        <circle cx="125" cy="90" r="5" fill="#2D3748" />
        
        {/* Nose */}
        <ellipse cx="100" cy="105" rx="6" ry="4" fill="#E58E18" />
        
        {/* Mouth */}
        <path d="M90 115 Q100 125 110 115" fill="none" stroke="#2D3748" strokeWidth="3" strokeLinecap="round" />
        
        {/* Whiskers */}
        <line x1="50" y1="105" x2="30" y2="100" stroke="#2D3748" strokeWidth="2" />
        <line x1="50" y1="115" x2="30" y2="120" stroke="#2D3748" strokeWidth="2" />
        <line x1="150" y1="105" x2="170" y2="100" stroke="#2D3748" strokeWidth="2" />
        <line x1="150" y1="115" x2="170" y2="120" stroke="#2D3748" strokeWidth="2" />
        
        {/* Cheeks */}
        <circle cx="65" cy="110" r="6" fill="#FFB347" opacity="0.5" />
        <circle cx="135" cy="110" r="6" fill="#FFB347" opacity="0.5" />
      </svg>
      
      {/* Tooltip bubble */}
      {showBubble && (
        <div className="coco-bubble">
          {message}
        </div>
      )}
    </div>
  );
};

function CocoAgent() {
  const [message, setMessage] = useState('Hi! I\'m COCO! Your friendly pet finder guide!');
  const [showBubble, setShowBubble] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [cocoPosition, setCocoPosition] = useState({ x: 0, y: 0 });
  const [animation, setAnimation] = useState('idle');
  const messageTimeout = useRef(null);

  // Track mouse position
  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 100 - 50;
      const y = (e.clientY / window.innerHeight) * 100 - 50;
      setMousePos({ x, y });
      
      // Move COCO to follow mouse (with delay)
      const targetX = x * 0.3;
      const targetY = y * 0.3;
      setCocoPosition({ x: targetX, y: targetY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Auto-update messages
  useEffect(() => {
    const messages = [
      'Hi! I\'m COCO! Your friendly pet finder guide!',
      'Lost a pet? Tap here to post a lost pet!',
      'Found a pet? Let\'s help reunite them with their family!',
      'I can help you search by emirate, breed, or colors!',
      'Remember: I strip all location data from photos for your privacy!',
      'UAE Federal Decree-Law No. 45 of 2021 compliant - your data stays safe!',
      'Swipe to the Lost & Found board to see all listings!',
      'Need to add a new listing? Click the button above!',
    ];

    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % messages.length;
      setMessage(messages[currentIndex]);
      setShowBubble(true);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Animation on hover
  useEffect(() => {
    if (hovered) {
      setAnimation('bounce');
      setTimeout(() => setAnimation('idle'), 1000);
    }
  }, [hovered]);

  return (
    <div 
      className={`coco-container ${hovered ? '' : 'coco-hidden'}`}
      style={{ 
        transform: `translate(${cocoPosition.x}px, ${cocoPosition.y}px)` 
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <CocoAvatar 
        message={message} 
        showBubble={showBubble} 
      />
    </div>
  );
}

export default CocoAgent;
