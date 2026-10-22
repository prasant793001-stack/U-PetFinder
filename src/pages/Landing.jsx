import { Fragment, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './Landing.css';

gsap.registerPlugin(ScrollTrigger);
const M = (name) => `${import.meta.env.BASE_URL}media/${name}`;
const EMIRATES = ['Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah', 'Al Ain'];

// split text into word spans so GSAP can animate each word
function Words({ text, className = '' }) {
  return text.split(' ').map((w, i) => (
    <Fragment key={i}><span className={`lp-word ${className}`}><span className="lp-word-in">{w}</span></span>{' '}</Fragment>
  ));
}

function Icon({ name }) {
  const p = {
    chat: <path d="M5 6h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-6l-4 3v-3H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm4 5h.01M12 11h.01M15 11h.01" />,
    pin: <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />,
    shield: <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Zm-3 9 2 2 4-4" />,
    search: <path d="M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Zm9 3-4.3-4.3" />,
  }[name];
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{p}</svg>;
}

function Magnetic({ children, className, onClick }) {
  const ref = useRef();
  const move = (e) => {
    const r = ref.current.getBoundingClientRect();
    gsap.to(ref.current, { x: (e.clientX - r.left - r.width / 2) * 0.25, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.4, ease: 'power3.out' });
  };
  const leave = () => gsap.to(ref.current, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' });
  return <button ref={ref} className={className} onClick={onClick} onMouseMove={move} onMouseLeave={leave}>{children}</button>;
}

function TiltCard({ icon, title, text, i }) {
  const ref = useRef();
  const move = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.setProperty('--mx', `${(x + 0.5) * 100}%`);
    ref.current.style.setProperty('--my', `${(y + 0.5) * 100}%`);
    gsap.to(ref.current, { rotateY: x * 10, rotateX: -y * 10, duration: 0.5, ease: 'power2.out' });
  };
  const leave = () => gsap.to(ref.current, { rotateY: 0, rotateX: 0, duration: 0.8, ease: 'power3.out' });
  return (
    <article ref={ref} className="lp-card" onMouseMove={move} onMouseLeave={leave} style={{ '--i': i }}>
      <div className="lp-card-icon"><Icon name={icon} /></div>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const root = useRef();

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = gsap.context(() => {
      // HERO: words rise in, image breathes, then scroll pushes the camera into the window
      gsap.from('.lp-hero .lp-word-in', { yPercent: 115, rotate: 4, duration: 1.1, ease: 'expo.out', stagger: 0.06, delay: 0.15 });
      gsap.from('.lp-hero .lp-fade', { y: 24, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.12, delay: 0.7 });
      if (reduce) return;
      gsap.to('.lp-hero-img', { scale: 1.32, yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.lp-hero', start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.lp-hero-copy', { yPercent: -35, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.lp-hero', start: 'top top', end: '80% top', scrub: true } });

      // STORY: pinned, image un-masks while the sentence lights up word by word
      const story = gsap.timeline({ scrollTrigger: { trigger: '.lp-story', start: 'top top', end: '+=140%', scrub: 0.6, pin: true } });
      story.fromTo('.lp-story-media', { clipPath: 'inset(18% 22% 18% 22% round 40px)' }, { clipPath: 'inset(0% 0% 0% 0% round 28px)', ease: 'none' }, 0)
        .fromTo('.lp-story-media img', { scale: 1.25 }, { scale: 1, ease: 'none' }, 0)
        .to('.lp-story .lp-word-in', { opacity: 1, stagger: 0.03, ease: 'none' }, 0.1);

      // FILM: a scroll-scrubbed three-shot cinematic (window -> family -> reunion) with letterbox + captions
      const film = gsap.timeline({ scrollTrigger: { trigger: '.lp-film', start: 'top top', end: '+=260%', scrub: 0.8, pin: true } });
      film.fromTo('.lp-film-bars', { '--bar': '0vh' }, { '--bar': '9vh', duration: 0.4 }, 0)
        .fromTo('.lp-shot-1 img', { scale: 1.1 }, { scale: 1.35, duration: 1.4, ease: 'none' }, 0)
        .fromTo('.lp-cap-1', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.3 }, 0.2).to('.lp-cap-1', { opacity: 0, y: -30, duration: 0.3 }, 1)
        .to('.lp-shot-2', { opacity: 1, duration: 0.4 }, 1.1)
        .fromTo('.lp-shot-2 img', { scale: 1.3, xPercent: -4 }, { scale: 1.05, xPercent: 4, duration: 1.4, ease: 'none' }, 1.1)
        .fromTo('.lp-cap-2', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.3 }, 1.4).to('.lp-cap-2', { opacity: 0, y: -30, duration: 0.3 }, 2.2)
        .to('.lp-shot-3', { opacity: 1, duration: 0.4 }, 2.3)
        .fromTo('.lp-shot-3 img', { scale: 1.35 }, { scale: 1, duration: 1.3, ease: 'none' }, 2.3)
        .fromTo('.lp-cap-3', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.35 }, 2.7);

      // HOW IT WORKS: horizontal scroll track
      const track = document.querySelector('.lp-steps-track');
      if (track) {
        gsap.to(track, {
          x: () => -(track.scrollWidth - window.innerWidth + 64), ease: 'none',
          scrollTrigger: { trigger: '.lp-steps', start: 'top top', end: () => `+=${track.scrollWidth}`, scrub: 0.6, pin: true, invalidateOnRefresh: true },
        });
      }

      // cards, map pins, counters and the FORM. DESIGN. AI finale
      gsap.from('.lp-card', { y: 80, opacity: 0, rotateX: -12, duration: 1, ease: 'power3.out', stagger: 0.1, scrollTrigger: { trigger: '.lp-cards', start: 'top 80%' } });
      gsap.from('.lp-map-pin', { scale: 0, opacity: 0, duration: 0.7, ease: 'back.out(3)', stagger: 0.12, scrollTrigger: { trigger: '.lp-map', start: 'top 70%' } });
      document.querySelectorAll('.lp-count').forEach((el) => {
        const end = Number(el.dataset.to);
        gsap.fromTo(el, { textContent: 0 }, { textContent: end, duration: 1.6, ease: 'power2.out', snap: { textContent: 1 }, scrollTrigger: { trigger: el, start: 'top 85%' } });
      });
      gsap.from('.lp-fda span', { yPercent: 110, duration: 1, ease: 'expo.out', stagger: 0.15, scrollTrigger: { trigger: '.lp-fda', start: 'top 80%' } });
      gsap.utils.toArray('.lp-reveal').forEach((el) => gsap.from(el, { y: 50, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%' } }));
    }, root);
    const refresh = setTimeout(() => ScrollTrigger.refresh(), 400);
    return () => { clearTimeout(refresh); ctx.revert(); };
  }, []);

  return (
    <div className="lp" ref={root}>
      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-hero-media">
          <img className="lp-hero-img" src={M('hero-cat-window.webp')} alt="A ginger cat watching the Dubai skyline from a sunlit window" fetchpriority="high" />
          <div className="lp-hero-shade" />
        </div>
        <div className="lp-hero-copy">
          <p className="lp-eyebrow lp-fade"><span className="lp-dot" /> Lost &amp; Found · All 7 Emirates · Privacy-first</p>
          <h1 className="lp-h1">
            <Words text="Reconnecting lost pets" /><br />
            <Words text="with their families" /><br />
            <Words text="across the UAE." className="lp-accent" />
          </h1>
          <p className="lp-lede lp-fade">A calm, secure place to report, search and reunite - with your home location protected at every step.</p>
          <div className="lp-ctas lp-fade">
            <Magnetic className="lp-btn lp-btn-primary" onClick={() => navigate('/add')}>Report a pet <span aria-hidden>→</span></Magnetic>
            <Magnetic className="lp-btn lp-btn-glass" onClick={() => navigate('/board')}>Browse listings</Magnetic>
          </div>
        </div>
        <div className="lp-scrollcue lp-fade" aria-hidden><span /></div>
      </section>

      {/* EMIRATES MARQUEE */}
      <div className="lp-marquee" aria-label="Covering every emirate">
        <div className="lp-marquee-track">
          {[...EMIRATES, ...EMIRATES].map((e, i) => <span key={i}>{e}<i>✦</i></span>)}
        </div>
      </div>

      {/* STORY */}
      <section className="lp-story">
        <div className="lp-story-grid">
          <div className="lp-story-copy">
            <p className="lp-kicker">The Cat Daddy origins</p>
            <p className="lp-story-text">
              <Words text="As a dedicated cat daddy to a large feline family, the most terrifying thought in my life is the sudden panic of a door left open, a cat slipping out, and the overwhelming confusion of how to bring them safely home." />
            </p>
            <p className="lp-story-sub">U-PetFinder was born out of this exact vulnerability - built to give every pet owner in the UAE a fast, secure, and instant tracking shield.</p>
          </div>
          <div className="lp-story-media"><img src={M('family-sofa.webp')} alt="Five cats relaxing together on a cream sofa" loading="lazy" /></div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="lp-section">
        <div className="lp-head lp-reveal">
          <p className="lp-kicker">Built for trust</p>
          <h2>Everything a worried owner needs.<br /><em>Nothing a stranger shouldn't see.</em></h2>
        </div>
        <div className="lp-cards">
          <TiltCard i={0} icon="chat" title="Privacy-protected chat" text="Talk to finders inside a sandboxed chat. No phone numbers, surnames or emails on public listings - share details only when you both feel safe." />
          <TiltCard i={1} icon="pin" title="Emirate-level geolocation" text="Sort by emirate and community, drop a precise pin for the sighting, and choose 'continue without sharing' any time." />
          <TiltCard i={2} icon="shield" title="Instant image protection" text="Photos are cleaned in your browser before upload. GPS and EXIF metadata never leave your phone, so your home stays private." />
          <TiltCard i={3} icon="search" title="Smart search & filters" text="Lost or found, cat or dog, breed, colours and dates - the right match surfaces in seconds, with reward tags where offered." />
        </div>
      </section>

      {/* FILM (scroll-scrubbed) */}
      <section className="lp-film" aria-label="The journey home">
        <div className="lp-film-bars">
          <figure className="lp-shot lp-shot-1"><img src={M('hero-cat-window.webp')} alt="" loading="lazy" /></figure>
          <figure className="lp-shot lp-shot-2"><img src={M('family-sofa.webp')} alt="" loading="lazy" /></figure>
          <figure className="lp-shot lp-shot-3"><img src={M('reunion.webp')} alt="A woman hugging her grey cat at her front door" loading="lazy" /></figure>
          <div className="lp-cap lp-cap-1"><small>01 — The door was open</small><strong>One curious step outside.</strong></div>
          <div className="lp-cap lp-cap-2"><small>02 — The community moves</small><strong>Neighbours post, search and share.</strong></div>
          <div className="lp-cap lp-cap-3"><small>03 — Home</small><strong>The moment they come back.</strong></div>
        </div>
      </section>

      {/* HOW IT WORKS (horizontal) */}
      <section className="lp-steps">
        <div className="lp-steps-track">
          <div className="lp-steps-intro">
            <p className="lp-kicker">How it works</p>
            <h2>Three steps.<br />Zero exposure.</h2>
          </div>
          {[
            ['01', 'Post in under a minute', 'Lost or found, one pet or a whole litter - add photos, colours, breed and an optional reward in AED.'],
            ['02', 'We protect you automatically', 'Photo metadata is stripped on your device. Your exact address is never published - only the area you choose.'],
            ['03', 'Chat safely, reunite fast', 'Matches reach you in a private chat. Swap contact details only when you are ready.'],
          ].map(([n, t, d]) => (
            <article key={n} className="lp-step"><span className="lp-step-n">{n}</span><h3>{t}</h3><p>{d}</p></article>
          ))}
        </div>
      </section>

      {/* MAP + NUMBERS */}
      <section className="lp-section lp-map-wrap">
        <div className="lp-map">
          <img src={M('uae-glow-map.webp')} alt="Stylised glass map of the UAE with glowing pins" loading="lazy" />
          {[[22, 34], [55, 47], [74, 41], [48, 70], [83, 30]].map(([x, y], i) => (
            <span key={i} className="lp-map-pin" style={{ left: `${x}%`, top: `${y}%`, '--d': `${i * 0.4}s` }} />
          ))}
        </div>
        <div className="lp-stats lp-reveal">
          <div><b className="lp-count" data-to="7">0</b><span>emirates covered</span></div>
          <div><b><span className="lp-count" data-to="100">0</span>%</b><span>photos stripped of GPS</span></div>
          <div><b className="lp-count" data-to="0">0</b><span>phone numbers shown publicly</span></div>
        </div>
      </section>

      {/* COMPANY */}
      <section className="lp-section lp-company">
        <h2 className="lp-fda" aria-label="Form. Design. AI."><span>FORM.</span><span>DESIGN.</span><span className="lp-accent">AI</span></h2>
        <p className="lp-reveal">U-PetFinder is part of the <strong>AAKRITI network</strong> - combining form, aesthetic design and artificial intelligence for social impact in the United Arab Emirates. Built to the spirit of UAE Federal Decree-Law No. 45 of 2021 on personal data protection, with data kept in the UAE region (me-central1).</p>
      </section>

      {/* FINAL CTA */}
      <section className="lp-final lp-reveal">
        <h2>Someone is looking for them<br /><em>right now.</em></h2>
        <div className="lp-ctas">
          <Magnetic className="lp-btn lp-btn-primary" onClick={() => navigate('/add')}>Post a lost or found pet <span aria-hidden>→</span></Magnetic>
          <a className="lp-btn lp-btn-ghost" href="mailto:prasant.aakriti@gmail.com">prasant.aakriti@gmail.com</a>
        </div>
      </section>
    </div>
  );
}
