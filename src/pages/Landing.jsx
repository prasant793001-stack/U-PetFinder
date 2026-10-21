import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

function Landing() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title animate-float">
            Reconnecting Lost Pets with Their Families
            <br />
            <span className="highlight">Across the UAE</span>
          </h1>
          <p className="hero-subtitle">
            U-PetFinder brings you a secure, privacy-first platform to find your beloved companions
          </p>
          <div className="hero-cta">
            <button className="btn btn-primary" onClick={() => navigate('/add')}>
              Report Lost/Found Pet
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/board')}>
              Browse Listings
            </button>
          </div>
        </div>
      </section>

      {/* Core Story Section */}
      <section className="story-section">
        <div className="story-container">
          <div className="story-content">
            <h2 className="story-title">The Cat Daddy Origins</h2>
            <p className="story-text">
              As a dedicated cat daddy to a large feline family, the most terrifying thought in my life 
              is the sudden panic of a door left open, a cat slipping out, and the overwhelming confusion 
              of how to bring them safely home.
            </p>
            <p className="story-text">
              U-PetFinder was born out of this exact vulnerability—built to give every pet owner in 
              the UAE a fast, secure, and instant tracking shield.
            </p>
            <div className="story-cta">
              <span className="story-badge">🏠 Built with love for pet families</span>
            </div>
          </div>
        </div>
      </section>

      {/* App Features */}
      <section className="features-section">
        <div className="features-grid">
          <div className="feature-card glass">
            <div className="feature-icon">🔒</div>
            <h3>In-App Privacy Protected Chat</h3>
            <p>
              Secure, anonymous messaging between pet owners. No personal details shared until both parties agree.
            </p>
          </div>

          <div className="feature-card glass">
            <div className="feature-icon">📍</div>
            <h3>Local Emirate-Level Sorting</h3>
            <p>
              Precise geolocation across all UAE emirates with privacy-protected location sharing.
            </p>
          </div>

          <div className="feature-card glass">
            <div className="feature-icon">🛡️</div>
            <h3>Instant Image Protection</h3>
            <p>
              All uploaded photos automatically stripped of EXIF metadata to protect home addresses.
            </p>
          </div>

          <div className="feature-card glass">
            <div className="feature-icon">🔍</div>
            <h3>Advanced Search & Filtering</h3>
            <p>
              Find pets by emirate, breed, colors, and date range with intelligent matching.
            </p>
          </div>
        </div>
      </section>

      {/* Company Profile */}
      <section className="company-section">
        <div className="company-content">
          <h2 className="company-title">About AAKRITI</h2>
          <p className="company-text">
            AAKRITI is a network dedicated to combining form, aesthetic design, and artificial 
            intelligence for social impact in the United Arab Emirates. Our mission is to leverage 
            technology to solve real community challenges while maintaining the highest standards 
            of privacy and security.
          </p>
          <div className="company-values">
            <div className="value-item">
              <span className="value-icon">✨</span>
              <span>Form</span>
            </div>
            <div className="value-item">
              <span className="value-icon">🎨</span>
              <span>Design</span>
            </div>
            <div className="value-item">
              <span className="value-icon">🤖</span>
              <span>AI</span>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter / Contact */}
      <section className="newsletter-section">
        <div className="newsletter-content">
          <h3>Stay Updated</h3>
          <p>Get notifications about new features and community stories</p>
          <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="input"
            />
            <button type="submit" className="btn btn-primary">Subscribe</button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-col">
            <h4>U-PetFinder</h4>
            <p>Reconnecting lost pets with their families</p>
          </div>
          <div className="footer-col">
            <h4>Contact</h4>
            <a href="mailto:prasant.aakriti@gmail.com">prasant.aakriti@gmail.com</a>
          </div>
          <div className="footer-col">
            <h4>Compliance</h4>
            <p>UAE Federal Decree-Law No. 45 of 2021</p>
            <p>Data Center: me-central1 (UAE)</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
