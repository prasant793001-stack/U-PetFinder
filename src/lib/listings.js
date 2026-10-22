// Listings + private chat storage.
// - With Firebase configured (.env.local): Firestore + Storage in the UAE region.
// - Without it (preview mode): everything is stored in this browser (localStorage) so every feature still works.
import { isFirebaseReady } from '../firebaseFlag';

const LS_PETS = 'upf.pets.v1', LS_CHAT = 'upf.chat.v1', LS_ME = 'upf.me.v1';
const DAY = 86400000;

export const EMIRATES = ['Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah', 'Al Ain'];
export const ANIMALS = ['Cat', 'Dog', 'Other'];
export const COLOURS = ['Black', 'White', 'Grey', 'Orange / Ginger', 'Brown', 'Cream', 'Tabby', 'Calico', 'Tortoiseshell', 'Golden'];

const SAMPLE = [
  { id: 's1', status: 'lost', type: 'Cat', name: 'Snowy', breed: 'Persian', colors: ['White'], emirate: 'Dubai', area: 'JLT, Cluster D', reward: 1000, description: 'Very shy, blue collar with a bell. Indoor cat - probably hiding nearby.', date: Date.now() - 2 * DAY, lat: 25.069, lng: 55.141, photo: 'media/hero-cat-window-sm.webp', sample: true },
  { id: 's2', status: 'lost', type: 'Dog', name: 'Max', breed: 'Golden Retriever', colors: ['Golden'], emirate: 'Abu Dhabi', area: 'Khalifa City A', reward: 2500, description: 'Friendly, microchipped, answers to Max. Red harness.', date: Date.now() - 1 * DAY, lat: 24.42, lng: 54.578, photo: '', sample: true },
  { id: 's3', status: 'found', type: 'Cat', name: '', breed: 'Domestic Shorthair', colors: ['Orange / Ginger'], emirate: 'Sharjah', area: 'Al Majaz 2', reward: 0, description: 'Found near the waterfront park, very calm and well fed. Safe with me now.', date: Date.now() - 6 * 3600000, lat: 25.326, lng: 55.383, photo: 'media/family-sofa-sm.webp', sample: true },
  { id: 's4', status: 'found', type: 'Other', name: '', breed: 'Rabbit', colors: ['Grey'], emirate: 'Ajman', area: 'Al Nuaimiya', reward: 0, description: 'Grey rabbit found in a building parking lot.', date: Date.now() - 3 * DAY, lat: 25.395, lng: 55.45, photo: '', sample: true },
  { id: 's5', status: 'lost', type: 'Cat', name: 'Luna', breed: 'British Shorthair', colors: ['Grey'], emirate: 'Dubai', area: 'Al Barsha 1', reward: 500, description: 'Slipped out when the door was open. Very friendly.', date: Date.now() - 4 * DAY, lat: 25.113, lng: 55.199, photo: 'media/reunion-sm.webp', sample: true },
];

const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

export function myId() {
  let id = read(LS_ME, null);
  if (!id) { id = 'u' + Math.random().toString(36).slice(2, 10); write(LS_ME, id); }
  return id;
}

export const storageMode = isFirebaseReady ? 'cloud' : 'device';

export async function listPets() {
  if (isFirebaseReady) {
    try {
      const { db } = await import('../firebase');
      const { collection, query, orderBy, limit, getDocs } = await import('firebase/firestore');
      const snap = await getDocs(query(collection(db, 'pets'), orderBy('date', 'desc'), limit(200)));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e) { console.warn('Firestore unavailable, showing local listings', e); }
  }
  const mine = read(LS_PETS, []);
  return [...mine, ...SAMPLE].sort((a, b) => b.date - a.date);
}

export async function createPets(pets) {
  const owner = myId();
  if (isFirebaseReady) {
    const { db, storage } = await import('../firebase');
    const { collection, addDoc } = await import('firebase/firestore');
    const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
    const ids = [];
    for (const p of pets) {
      let photo = '';
      if (p.photoBlob) {
        const r = ref(storage, `pets/${owner}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
        await uploadBytes(r, p.photoBlob, { contentType: 'image/jpeg' });
        photo = await getDownloadURL(r);
      }
      const { photoBlob, photoPreview, ...rest } = p;
      const doc = await addDoc(collection(db, 'pets'), { ...rest, description: redact(rest.description || ''), name: redact(rest.name || ''), photo, ownerId: owner, date: Date.now() });
      ids.push(doc.id);
    }
    return ids;
  }
  const mine = read(LS_PETS, []);
  const created = pets.map((p) => {
    const { photoBlob, photoPreview, ...rest } = p;
    return { ...rest, description: redact(rest.description || ''), name: redact(rest.name || ''), photo: photoPreview || '', id: 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ownerId: owner, date: Date.now() };
  });
  if (!write(LS_PETS, [...created, ...mine])) {
    // photos can exceed the browser quota - keep the listing, drop the photo
    write(LS_PETS, [...created.map((c) => ({ ...c, photo: '' })), ...mine]);
  }
  return created.map((c) => c.id);
}

export function deleteMyPet(id) {
  write(LS_PETS, read(LS_PETS, []).filter((p) => p.id !== id));
}

// ---- private chat (identity-free: participants are random device ids, never names/phones) ----
export function chatThread(petId) {
  return read(LS_CHAT, {})[petId] || [];
}
export function sendChat(petId, text) {
  const all = read(LS_CHAT, {});
  const msg = { from: myId(), text: String(text).slice(0, 1000), at: Date.now() };
  all[petId] = [...(all[petId] || []), msg];
  write(LS_CHAT, all);
  return all[petId];
}
// contact details typed into the chat are hidden until the user reveals them
export function redact(text) {
  return String(text)
    .replace(/(?:\+?971[\s-]?|0)?5\d[\s-]?\d{3}[\s-]?\d{4}\b/g, '•••• phone hidden ••••')
    .replace(/\b(?:\+?\d[\s-]?){9,14}\b/g, '•••• phone hidden ••••')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '•••• email hidden ••••');
}

export function timeAgo(ts) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 60) return `${Math.max(1, m)} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}
