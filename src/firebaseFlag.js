// Tiny module so the app shell can know about Firebase without downloading the Firebase SDK up front.
export const isFirebaseReady = Boolean(import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID);
