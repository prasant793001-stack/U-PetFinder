import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PinMap from '../components/PinMap';
import { stripImage } from '../lib/privacyImage';
import { ANIMALS, COLOURS, EMIRATES, createPets, storageMode } from '../lib/listings';
import './pages.css';

const EMPTY = { name: '', type: 'Cat', breed: '', colors: [], description: '', reward: '', photoBlob: null, photoPreview: '', photoInfo: null };
const CONSENT = 'I explicitly consent to the collection and secure processing of my contact and localized event location data solely for matching lost and found animals, adhering strictly to UAE Federal Decree-Law No. 45 of 2021.';

export default function ReportPet() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const status = params.get('type') === 'found' ? 'found' : params.get('type') === 'lost' ? 'lost' : '';
  const [step, setStep] = useState(status ? 1 : 0);
  const [pet, setPet] = useState(EMPTY);
  const [batch, setBatch] = useState([]);
  const [where, setWhere] = useState({ emirate: 'Dubai', area: '', pin: null, when: new Date().toISOString().slice(0, 10) });
  const [photoBusy, setPhotoBusy] = useState(false);
  const [err, setErr] = useState('');
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => { if (status && step === 0) setStep(1); if (!status) setStep(0); }, [status]); // eslint-disable-line
  useEffect(() => { window.scrollTo({ top: 0 }); setErr(''); }, [step]);

  const isLost = status === 'lost';
  const set = (k) => (e) => setPet((p) => ({ ...p, [k]: e.target.value }));
  const toggleColour = (c) => setPet((p) => ({ ...p, colors: p.colors.includes(c) ? p.colors.filter((x) => x !== c) : [...p.colors, c] }));

  const choose = (t) => { setParams({ type: t }); setStep(1); };

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoBusy(true); setErr('');
    try {
      const r = await stripImage(file);
      setPet((p) => ({ ...p, photoBlob: r.blob, photoPreview: r.dataUrl, photoInfo: r }));
    } catch (x) { setErr(x.message); }
    setPhotoBusy(false);
  };

  const nextFromPet = () => {
    if (!pet.colors.length) return setErr('Pick at least one colour - it is the first thing people search by.');
    if (!pet.breed.trim() && !pet.description.trim()) return setErr('Add a breed (or "Mixed / not sure") or a short description.');
    setStep(2);
  };
  const nextFromWhere = () => {
    if (!where.pin) return setErr('Drop a pin on the map where the pet was ' + (isLost ? 'last seen.' : 'found.'));
    setBatch((b) => [...b, { ...pet, status, ...where, lat: where.pin.lat, lng: where.pin.lng, reward: isLost ? Number(pet.reward) || 0 : 0, sightingDate: where.when }]);
    setPet(EMPTY);
    setStep(3);
  };
  const addAnother = () => { setStep(1); };
  const editLast = () => { // take the last pet out of the batch and reopen it, so nothing is duplicated
    const last = batch[batch.length - 1];
    if (!last) return setStep(1);
    const { status: _s, emirate, area, pin, lat, lng, sightingDate, ...rest } = last;
    setPet({ ...EMPTY, ...rest, reward: rest.reward || '' });
    setBatch((b) => b.slice(0, -1));
    setStep(2);
  };
  const removeFromBatch = (i) => setBatch((b) => b.filter((_, j) => j !== i));

  const submit = async () => {
    if (!consent) return setErr('Please tick the consent box - it is required by UAE data-protection law.');
    if (!batch.length) return setErr('There is nothing to post yet.');
    setSaving(true); setErr('');
    try {
      const ids = await createPets(batch.map(({ pin, ...p }) => p));
      setDone({ count: ids.length });
      setBatch([]);
    } catch (x) { setErr('Could not post: ' + x.message); }
    setSaving(false);
  };

  const steps = useMemo(() => ['Pet details', 'Where & when', 'Review & post'], []);

  if (done) {
    return (
      <div className="page"><div className="panel success">
        <div className="success-badge">✓</div>
        <h1>{done.count === 1 ? 'Your listing is live!' : `${done.count} listings are live!`}</h1>
        <p>{storageMode === 'device'
          ? 'Preview mode: it is saved on this device and visible on the board right away. Connect Firebase to share it with everyone.'
          : 'People across the UAE can now see it. You will get private chat messages - no phone number needed.'}</p>
        <div className="row center">
          <button className="btn btn-primary" onClick={() => navigate(`/board?type=${status || 'lost'}`)}>See it on the board</button>
          <button className="btn btn-ghost" onClick={() => { setDone(null); setParams({}); setStep(0); }}>Report another pet</button>
        </div>
      </div></div>
    );
  }

  if (step === 0) {
    return (
      <div className="page">
        <header className="page-head">
          <p className="eyebrow">Report a pet</p>
          <h1>What happened?</h1>
          <p className="sub">Choose one - you can add several pets in the same report.</p>
        </header>
        <div className="choice-grid">
          <button className="choice lost" onClick={() => choose('lost')}>
            <span className="choice-emoji">😿</span>
            <strong>REPORT A LOST PET</strong>
            <span>My pet is missing - alert people nearby, add an optional reward.</span>
          </button>
          <button className="choice found" onClick={() => choose('found')}>
            <span className="choice-emoji">😺</span>
            <strong>REPORT A FOUND PET</strong>
            <span>I found or saw a pet - help it get back home.</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">{isLost ? 'Report a lost pet' : 'Report a found pet'} · <button className="linkish" onClick={() => { setParams({}); setStep(0); }}>change</button></p>
        <h1>{isLost ? 'Let’s bring them home.' : 'Thank you for helping.'}</h1>
      </header>

      <ol className="stepper" aria-label="Progress">
        {steps.map((s, i) => <li key={s} className={step === i + 1 ? 'on' : step > i + 1 ? 'done' : ''}><span>{step > i + 1 ? '✓' : i + 1}</span>{s}</li>)}
      </ol>

      {err && <div className="alert" role="alert">{err}</div>}

      {step === 1 && (
        <section className="panel">
          <div className="grid2">
            <label className="fl">Animal
              <div className="seg">{ANIMALS.map((a) => <button type="button" key={a} className={pet.type === a ? 'on' : ''} onClick={() => setPet((p) => ({ ...p, type: a }))}>{a === 'Cat' ? '🐈 ' : a === 'Dog' ? '🐕 ' : '🐾 '}{a}</button>)}</div>
            </label>
            {isLost && <label className="fl">Pet’s name <small>(optional)</small><input className="field" value={pet.name} onChange={set('name')} placeholder="e.g. Coco" /></label>}
            <label className="fl">Breed<input className="field" value={pet.breed} onChange={set('breed')} placeholder="e.g. Persian, Labrador, Mixed / not sure" list="breeds" /></label>
            <datalist id="breeds">{['Mixed / not sure', 'Domestic Shorthair', 'Persian', 'British Shorthair', 'Siamese', 'Maine Coon', 'Bengal', 'Ragdoll', 'Golden Retriever', 'Labrador', 'German Shepherd', 'Husky', 'Saluki', 'Pomeranian', 'Shih Tzu'].map((b) => <option key={b} value={b} />)}</datalist>
            {isLost && <label className="fl">Reward <small>(AED, optional)</small><input className="field" type="number" min="0" value={pet.reward} onChange={set('reward')} placeholder="e.g. 500" /></label>}
          </div>
          <div className="fl">Colours <small>(tap all that apply)</small>
            <div className="chips">{COLOURS.map((c) => <button type="button" key={c} className={`chip ${pet.colors.includes(c) ? 'on' : ''}`} onClick={() => toggleColour(c)}>{c}</button>)}</div>
          </div>
          <label className="fl">Description<textarea className="field" rows={3} value={pet.description} onChange={set('description')} placeholder="Collar, marks, behaviour, microchip… (no phone numbers - you will chat privately)" />
            <small className="hint">Phone numbers and emails are hidden automatically on the public listing.</small></label>

          <div className="fl">Photo
            <label className={`drop ${pet.photoPreview ? 'has' : ''}`}>
              <input type="file" accept="image/*" onChange={onPhoto} hidden />
              {pet.photoPreview ? <img src={pet.photoPreview} alt="Pet preview" /> : <span>{photoBusy ? 'Cleaning photo…' : '📷 Tap to add a photo'}</span>}
            </label>
            {pet.photoInfo && (
              <p className="privacy-ok">🛡️ {pet.photoInfo.removedMetadata ? 'Location & camera data REMOVED' : 'Checked - no location data inside'} · {Math.round(pet.photoInfo.bytes / 1024)} KB · processed on your device
                <button type="button" className="linkish" onClick={() => setPet((p) => ({ ...p, photoBlob: null, photoPreview: '', photoInfo: null }))}>remove</button></p>
            )}
          </div>

          <div className="row end">
            <Link className="btn btn-ghost" to="/">Cancel</Link>
            <button className="btn btn-primary" onClick={nextFromPet}>Next: where &amp; when →</button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="panel">
          <div className="grid2">
            <label className="fl">Emirate<select className="field" value={where.emirate} onChange={(e) => setWhere((w) => ({ ...w, emirate: e.target.value }))}>{EMIRATES.map((em) => <option key={em}>{em}</option>)}</select></label>
            <label className="fl">Community / area<input className="field" value={where.area} onChange={(e) => setWhere((w) => ({ ...w, area: e.target.value }))} placeholder="e.g. JLT Cluster D" /></label>
            <label className="fl">{isLost ? 'Last seen on' : 'Found on'}<input className="field" type="date" max={new Date().toISOString().slice(0, 10)} value={where.when} onChange={(e) => setWhere((w) => ({ ...w, when: e.target.value }))} /></label>
          </div>
          <PinMap value={where.pin} onChange={(pin) => setWhere((w) => ({ ...w, pin }))} onArea={(a) => setWhere((w) => ({ ...w, area: w.area || a }))} />
          <div className="row end">
            <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
            <button className="btn btn-primary" onClick={nextFromWhere}>Next: review →</button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="panel">
          <h2 className="panel-title">Review {batch.length > 1 ? `${batch.length} pets` : 'your listing'}</h2>
          <div className="review">
            {batch.map((p, i) => (
              <article key={i} className="review-item">
                {p.photoPreview ? <img src={p.photoPreview} alt="" /> : <div className="ph">{p.type === 'Dog' ? '🐕' : p.type === 'Cat' ? '🐈' : '🐾'}</div>}
                <div>
                  <strong>{p.name || p.breed || p.type}</strong>
                  <span>{p.type} · {p.colors.join(', ')} · {p.area ? p.area + ', ' : ''}{p.emirate}</span>
                  {p.reward > 0 && <span className="reward">Reward {p.reward} AED</span>}
                </div>
                <button className="linkish" onClick={() => removeFromBatch(i)}>remove</button>
              </article>
            ))}
          </div>
          <button className="btn btn-soft" onClick={addAnother}>＋ Add another pet to this report</button>
          <label className="consent"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> <span>{CONSENT}</span></label>
          <p className="hint">Public listings never show your name, phone or email. People contact you through private chat.</p>
          <div className="row end">
            <button className="btn btn-ghost" onClick={editLast}>← Edit last pet</button>
            <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Posting…' : `Post ${batch.length > 1 ? batch.length + ' listings' : 'listing'}`}</button>
          </div>
        </section>
      )}
    </div>
  );
}
