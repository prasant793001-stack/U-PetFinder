import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Values come from .env.local (VITE_FIREBASE_*). See .env.example.
// Without them the site runs in DEMO MODE (sample listings, no uploads) instead of crashing.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

import { isFirebaseReady } from './firebaseFlag';
export { isFirebaseReady };

let app = null, auth = null, db = null, storage = null;
if (isFirebaseReady) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (err) {
    console.warn('[U-PetFinder] Firebase failed to start - running in demo mode.', err);
  }
}
export { app, auth, db, storage };
