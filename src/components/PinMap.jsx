// Interactive UAE map (Leaflet + OpenStreetMap, free, no API key).
// Click / tap to drop the pin, search a community, or share location after a clear consent notice.
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const UAE = [24.45, 54.6];
const round = (n) => Math.round(n * 1000) / 1000; // ~100 m - enough to search, not enough to find a home

const pinIcon = L.divIcon({ className: 'upf-pin', html: '<span></span>', iconSize: [34, 44], iconAnchor: [17, 42] });

export default function PinMap({ value, onChange, readOnly = false, height = 320, onArea }) {
  const box = useRef(), map = useRef(), marker = useRef();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState(false);
  const [msg, setMsg] = useState('');

  const place = (lat, lng, zoom) => {
    const p = { lat: round(lat), lng: round(lng) };
    if (!marker.current) marker.current = L.marker([p.lat, p.lng], { icon: pinIcon, draggable: !readOnly }).addTo(map.current)
      .on('dragend', (e) => { const ll = e.target.getLatLng(); onChange?.({ lat: round(ll.lat), lng: round(ll.lng) }); });
    else marker.current.setLatLng([p.lat, p.lng]);
    if (zoom) map.current.setView([p.lat, p.lng], zoom);
    onChange?.(p);
  };

  useEffect(() => {
    map.current = L.map(box.current, { zoomControl: true, scrollWheelZoom: !readOnly, attributionControl: true })
      .setView(value ? [value.lat, value.lng] : UAE, value ? 14 : 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map.current);
    if (value) marker.current = L.marker([value.lat, value.lng], { icon: pinIcon, draggable: !readOnly }).addTo(map.current)
      .on('dragend', (e) => { const ll = e.target.getLatLng(); onChange?.({ lat: round(ll.lat), lng: round(ll.lng) }); });
    if (!readOnly) map.current.on('click', (e) => place(e.latlng.lat, e.latlng.lng));
    const t = setTimeout(() => map.current?.invalidateSize(), 250);
    return () => { clearTimeout(t); map.current?.remove(); map.current = null; marker.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const search = async (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true); setMsg('');
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=ae&limit=1&q=${encodeURIComponent(q)}`, { headers: { 'Accept-Language': 'en' } });
      const [hit] = await r.json();
      if (!hit) setMsg('No match - try a nearby landmark or community name.');
      else { place(Number(hit.lat), Number(hit.lon), 15); onArea?.(q.trim()); }
    } catch { setMsg('Search is unavailable right now - tap the map instead.'); }
    setBusy(false);
  };

  const share = () => {
    setAsk(false);
    if (!navigator.geolocation) { setMsg('Your browser cannot share location - tap the map instead.'); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { place(p.coords.latitude, p.coords.longitude, 16); setBusy(false); setMsg('Pin placed (rounded to about 100 m). Drag it to the exact sighting spot.'); },
      () => { setBusy(false); setMsg('Location not shared - no problem, tap the map to place the pin.'); },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

  return (
    <div className="pinmap">
      {!readOnly && (
        <div className="pinmap-tools">
          <form onSubmit={search} className="pinmap-search">
            <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a community, e.g. JLT Cluster D, Al Majaz" aria-label="Search a place in the UAE" />
            <button className="btn btn-soft" disabled={busy}>{busy ? '…' : 'Search'}</button>
          </form>
          <button type="button" className="btn btn-ghost" onClick={() => setAsk(true)}>📍 Use my location</button>
        </div>
      )}
      <div ref={box} className="pinmap-map" style={{ height }} />
      {!readOnly && <p className="hint">{msg || 'Tap the map where the pet was last seen. You can drag the pin.'}</p>}
      {ask && (
        <div className="consent-sheet" role="dialog" aria-modal="true" aria-label="Location request">
          <div className="consent-card">
            <h4>U-PetFinder is asking for your location</h4>
            <p><b>Who:</b> this website only (U-PetFinder, AAKRITI network).<br />
              <b>Why:</b> to place the pin where the pet was seen.<br />
              <b>How:</b> one-time, rounded to ~100 m, never shown with your name. You can move the pin afterwards.</p>
            <div className="row">
              <button type="button" className="btn btn-primary" onClick={share}>Share my location once</button>
              <button type="button" className="btn btn-ghost" onClick={() => setAsk(false)}>Continue without sharing</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
