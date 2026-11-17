import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { firebaseConfig, isFirebaseConfigured } from './config.js';

export { isFirebaseConfigured };

let app = null;
let db = null;
let initialized = false;

/**
 * Initialise Firebase ONLY when the project has been given its own
 * credentials (VITE_FIREBASE_*). With no variables set the store runs
 * entirely from localStorage — it never contacts any Firebase project.
 */
export function initFirebase() {
  if (initialized) return { app, db };
  if (!isFirebaseConfigured) {
    console.warn(
      '[firebase] not configured — running local-only. Set VITE_FIREBASE_API_KEY, ' +
      'VITE_FIREBASE_PROJECT_ID and VITE_FIREBASE_APP_ID (see SETUP.md).'
    );
    return { app, db };
  }
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    initialized = true;
    console.log(`[firebase] connected to project "${firebaseConfig.projectId}"`);
  } catch (err) {
    console.warn('Firebase init failed:', err.message);
  }
  return { app, db };
}

export function isFirebaseReady() {
  return initialized && db !== null;
}

// Firestore helpers
export async function firestoreGet(collection, docId) {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, collection, docId));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.warn('firestoreGet error:', err.message);
    return null;
  }
}

// Recursively strip Firestore-invalid values (undefined → null, NaN → null).
// Firestore accepts null but throws "Unsupported field value: undefined".
function sanitizeForFirestore(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  if (Array.isArray(value)) return value.map(sanitizeForFirestore);
  if (typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) {
      out[k] = sanitizeForFirestore(value[k]);
    }
    return out;
  }
  return value;
}

export async function firestoreSet(collection, docId, data) {
  if (!db) return false;
  try {
    await setDoc(doc(db, collection, docId), sanitizeForFirestore(data), { merge: true });
    return true;
  } catch (err) {
    console.warn('firestoreSet error:', err.message);
    return false;
  }
}

export function firestoreListen(collection, docId, callback) {
  if (!db) return () => {};
  try {
    return onSnapshot(
      doc(db, collection, docId),
      (snap) => {
        if (snap.exists()) {
          callback(snap.data());
        }
      },
      (err) => console.warn('firestoreListen error:', err?.message || err)
    );
  } catch (err) {
    console.warn('firestoreListen error:', err.message);
    return () => {};
  }
}

export { db, app };
