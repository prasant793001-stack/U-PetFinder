import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ANIMALS, COLOURS, EMIRATES, chatThread, listPets, myId, redact, sendChat, storageMode, timeAgo } from '../lib/listings';
import './pages.css';

const PinMap = lazy(() => import('../components/PinMap'));
const BASE = import.meta.env.BASE_URL;
const src = (p) => (!p ? '' : /^(data:|https?:)/.test(p) ? p : BASE + p);

function Card({ pet, onOpen }) {
  return (
    <article className="pet-card" onClick={() => onOpen(pet)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen(pet)}>
      <div className="pet-photo">
        {pet.photo ? <img src={src(pet.photo)} alt={`${pet.type} - ${pet.breed}`} loading="lazy" /> : <div className="ph">{pet.type === 'Dog' ? '🐕' : pet.type === 'Cat' ? '🐈' : '🐾'}</div>}
        <span className={`tag ${pet.status}`}>{pet.status === 'lost' ? 'LOST' : 'FOUND'}</span>
        {pet.status === 'lost' && pet.reward > 0 && <span className="tag reward">Reward offered: {pet.reward} AED</span>}
      </div>
      <div className="pet-body">
        <h3>{pet.name || pet.breed || pet.type}</h3>
        <p className="meta">{pet.type} · {pet.breed}</p>
        <p className="meta">📍 {pet.area ? pet.area + ', ' : ''}{pet.emirate} · {timeAgo(pet.date)}</p>
        <div className="chips small">{(pet.colors || []).map((c) => <span key={c} className="chip on">{c}</span>)}</div>
        <button className="btn btn-primary btn-block" onClick={(e) => { e.stopPropagation(); onOpen(pet, true); }}>🔒 Securely chat with {pet.status === 'lost' ? 'owner' : 'finder'}</button>
      </div>
    </article>
  );
}

function Detail({ pet, startChat, onClose }) {
  const [msgs, setMsgs] = useState(() => chatThread(pet.id));
  const [text, setText] = useState('');
  const [chatOpen, setChatOpen] = useState(startChat);
  const me = myId();
  const end = useRef();
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, chatOpen]);
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  const send = (e) => { e.preventDefault(); if (!text.trim()) return; setMsgs(sendChat(pet.id, text.trim())); setText(''); };
  const mine = pet.ownerId && pet.ownerId === me;
  return (
    <div className="sheet-bg" onClick={onClose}>
      <aside className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Pet details">
        <button className="sheet-x" onClick={onClose} aria-label="Close">×</button>
        {pet.photo ? <img className="sheet-photo" src={src(pet.photo)} alt="" /> : <div className="sheet-photo ph">{pet.type === 'Dog' ? '🐕' : '🐈'}</div>}
        <div className="sheet-body">
          <span className={`tag inline ${pet.status}`}>{pet.status === 'lost' ? 'LOST' : 'FOUND'}</span>
          {pet.status === 'lost' && pet.reward > 0 && <span className="tag inline reward">Reward offered: {pet.reward} AED</span>}
          <h2>{pet.name || pet.breed || pet.type}</h2>
          <p className="meta">{pet.type} · {pet.breed} · {(pet.colors || []).join(', ')}</p>
          <p className="meta">📍 {pet.area ? pet.area + ', ' : ''}{pet.emirate} · {timeAgo(pet.date)}</p>
          {pet.description && <p className="desc">{redact(pet.description)}</p>}
          {pet.lat && <Suspense fallback={<div className="pinmap-map" style={{ height: 200 }} />}><PinMap value={{ lat: pet.lat, lng: pet.lng }} readOnly height={200} /></Suspense>}
          <p className="hint">Location is approximate (about 100 m) to protect everyone’s privacy.</p>

          {mine ? <p className="mine">This is your listing. Messages from people who saw your pet appear here.</p> : null}
          {!chatOpen ? (
            <button className="btn btn-primary btn-block" onClick={() => setChatOpen(true)}>🔒 Securely chat with {pet.status === 'lost' ? 'owner' : 'finder'}</button>
          ) : (
            <div className="chat">
              <div className="chat-head">🔒 Private chat · no names, phone numbers or emails are shared until you both decide.</div>
              <div className="chat-log">
                {msgs.length === 0 && <p className="hint">Say where and when you saw the pet. Phone numbers and emails you type are hidden automatically.</p>}
                {msgs.map((m, i) => <div key={i} className={`bubble ${m.from === me ? 'me' : ''}`}>{redact(m.text)}<small>{timeAgo(m.at)}</small></div>)}
                <div ref={end} />
              </div>
              <form className="chat-form" onSubmit={send}>
                <input className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message…" aria-label="Message" />
                <button className="btn btn-primary">Send</button>
              </form>
              {storageMode === 'device' && <p className="hint">Preview mode: chat is stored on this device. Connect Firebase for live two-way chat.</p>}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

export default function Board() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const status = params.get('type') === 'found' ? 'found' : 'lost';
  const [pets, setPets] = useState(null);
  const [f, setF] = useState({ emirate: 'All', type: 'All', breed: '', colour: 'All', since: 'All' });
  const [open, setOpen] = useState(null);

  useEffect(() => { listPets().then(setPets).catch(() => setPets([])); }, []);

  const shown = useMemo(() => (pets || []).filter((p) => {
    if (p.status !== status) return false;
    if (f.emirate !== 'All' && p.emirate !== f.emirate) return false;
    if (f.type !== 'All' && p.type !== f.type) return false;
    if (f.breed && !String(p.breed || '').toLowerCase().includes(f.breed.toLowerCase())) return false;
    if (f.colour !== 'All' && !(p.colors || []).includes(f.colour)) return false;
    if (f.since !== 'All' && Date.now() - p.date > Number(f.since) * 86400000) return false;
    return true;
  }), [pets, status, f]);

  const count = (s) => (pets || []).filter((p) => p.status === s).length;
  const setFilter = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const active = Object.entries(f).some(([k, v]) => (k === 'breed' ? v : v !== 'All'));

  return (
    <div className="page wide">
      <header className="page-head">
        <p className="eyebrow">Lost &amp; Found board</p>
        <h1>{status === 'lost' ? 'Pets waiting to come home' : 'Pets found by kind people'}</h1>
        <div className="toggle" role="tablist">
          <button role="tab" aria-selected={status === 'lost'} className={status === 'lost' ? 'on' : ''} onClick={() => setParams({ type: 'lost' })}>😿 Lost pets <b>{count('lost')}</b></button>
          <button role="tab" aria-selected={status === 'found'} className={status === 'found' ? 'on' : ''} onClick={() => setParams({ type: 'found' })}>😺 Found pets <b>{count('found')}</b></button>
        </div>
      </header>

      <div className="filters panel">
        <label>Emirate<select className="field" value={f.emirate} onChange={setFilter('emirate')}><option>All</option>{EMIRATES.map((e) => <option key={e}>{e}</option>)}</select></label>
        <label>Animal<select className="field" value={f.type} onChange={setFilter('type')}><option>All</option>{ANIMALS.map((a) => <option key={a}>{a}</option>)}</select></label>
        <label>Breed<input className="field" value={f.breed} onChange={setFilter('breed')} placeholder="Any breed" /></label>
        <label>Colour<select className="field" value={f.colour} onChange={setFilter('colour')}><option>All</option>{COLOURS.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label>Date<select className="field" value={f.since} onChange={setFilter('since')}><option value="All">Any time</option><option value="1">Last 24 h</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select></label>
        {active && <button className="btn btn-ghost" onClick={() => setF({ emirate: 'All', type: 'All', breed: '', colour: 'All', since: 'All' })}>Reset</button>}
      </div>

      <div className="board-bar">
        <span>{pets === null ? 'Loading…' : `${shown.length} ${status} pet${shown.length === 1 ? '' : 's'}`}</span>
        <button className="btn btn-primary" onClick={() => navigate(`/report?type=${status}`)}>{status === 'lost' ? 'REPORT A LOST PET' : 'REPORT A FOUND PET'}</button>
      </div>

      {pets !== null && shown.length === 0 && (
        <div className="empty panel"><span>🐾</span><p>No {status} pets match these filters yet.</p>
          {active && <button className="btn btn-soft" onClick={() => setF({ emirate: 'All', type: 'All', breed: '', colour: 'All', since: 'All' })}>Clear filters</button>}</div>
      )}
      <div className="pet-grid">{shown.map((p) => <Card key={p.id} pet={p} onOpen={(pet, chat) => setOpen({ pet, chat: !!chat })} />)}</div>

      {open && <Detail pet={open.pet} startChat={open.chat} onClose={() => setOpen(null)} />}
    </div>
  );
}
