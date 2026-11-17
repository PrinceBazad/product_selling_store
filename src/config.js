// ─────────────────────────────────────────────────────────────
// src/config.js — Every front-end value that used to be hardcoded
// now comes from Vercel Environment Variables (Settings → Environment
// Variables). Only names prefixed with VITE_ are exposed to the
// browser — anything else would have to stay server-side.
//
// NOTE: Vite inlines these at BUILD time, so a change requires a
// redeploy. Nothing here is a secret: the Firebase web API key and
// the Razorpay Key ID are public identifiers by design. The Razorpay
// key SECRET and every other credential live only in api/*.js and
// shared/*.mjs and never reach the client.
// ─────────────────────────────────────────────────────────────

const env = import.meta.env || {};

const str = (value) => String(value == null ? '' : value).trim();

export const firebaseConfig = {
  apiKey: str(env.VITE_FIREBASE_API_KEY),
  authDomain: str(env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: str(env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: str(env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: str(env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: str(env.VITE_FIREBASE_APP_ID),
  measurementId: str(env.VITE_FIREBASE_MEASUREMENT_ID),
};

/** True when the minimum Firebase fields needed by this app are present. */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

/** Public Razorpay Key ID used to open the checkout popup. */
export const razorpayKeyId = str(env.VITE_RAZORPAY_KEY_ID);

/** Public origin of the deployed store (used in links + share text). */
export const appOrigin = str(env.VITE_APP_ORIGIN) || (typeof window !== 'undefined' ? window.location.origin : '');

/** Store display name. */
export const storeName = str(env.VITE_STORE_NAME) || 'My Store';

/** Public contact e-mail shown on policy pages and used in mailto links. */
export const storeEmail = str(env.VITE_STORE_EMAIL) || 'support@example.com';

/** Public contact phone / address (blank until you set them). */
export const contactPhone = str(env.VITE_CONTACT_PHONE);
export const contactAddress = str(env.VITE_CONTACT_ADDRESS);

/** Instagram profile URL — the footer link is hidden when this is empty. */
export const instagramUrl = str(env.VITE_INSTAGRAM_URL);