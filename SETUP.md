# Running this store as your own site

This code was cloned from another live store. Everything that used to point at
that store's Firebase project has been removed — **all configuration now comes
from environment variables**, so a fresh deployment starts with an empty,
independent backend and can never read or write the original store's data.

Until you supply your own values the app runs in **local-only mode**: data lives
in the browser's `localStorage`, no Firebase request is made, and admin edits
stay on your machine.

---

## 1. Create your own Firebase project

1. <https://console.firebase.google.com> → **Add project** (any name, e.g. `myshop`).
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable**.
3. **Build → Firestore Database → Create database** (production mode is fine).
4. **Project settings → General → Your apps → Web app (`</>`)** → register the app and
   copy the `firebaseConfig` values.
5. **Firestore Database → Rules** → paste the contents of [`firestore.rules`](./firestore.rules)
   → **Publish**.
6. **Bootstrap the first admin** (one time, by hand):
   - Register/sign up on your site once.
   - Firebase console → **Authentication → Users** → copy that user's **UID**.
   - **Firestore → Data → `users` → `<UID>`** → add field `role` (string) = `admin`.
   - Then use **Admin → Staff** in the app for everyone else.

## 2. Razorpay

Razorpay Dashboard → **Settings → API Keys** → generate a key pair.

- `RAZORPAY_KEY_ID` / `VITE_RAZORPAY_KEY_ID` — the public `rzp_live_…` or `rzp_test_…` id.
- `RAZORPAY_KEY_SECRET` — **secret**, server-side only, never prefixed with `VITE_`.

Payments stay disabled (the checkout reports "gateway is not configured") until both
are set.

## 3. Environment variables

Local dev: copy [`.env.example`](./.env.example) to `.env` and fill it in.

Vercel: **Project → Settings → Environment Variables**, add the same names.

| Scope | Variables |
| --- | --- |
| Browser (`VITE_`) | `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID`, `VITE_RAZORPAY_KEY_ID`, `VITE_APP_ORIGIN`, `VITE_STORE_NAME` |
| Server | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `FIREBASE_PROJECT_ID`, `FIREBASE_WEB_API_KEY`, `APP_ORIGIN`, `STORE_NAME` |
| Optional | `RESEND_API_KEY`, `MAIL_FROM`, `MERCHANT_EMAIL`, `WHATSAPP_*`, `TWILIO_*`, `DELHIVERY_*` |

Notes:

- `VITE_*` values are **inlined at build time** — after changing them, redeploy.
- Anything without the `VITE_` prefix stays server-side and never reaches the browser.
- `APP_ORIGIN` is your public site URL (e.g. `https://myshop.vercel.app`). When omitted,
  Vercel's own `VERCEL_URL` is used automatically.

## 4. Optional services

| Service | Variables | Effect when unset |
| --- | --- | --- |
| Resend (order e-mails) | `RESEND_API_KEY`, `MAIL_FROM`, `MERCHANT_EMAIL` | e-mails are skipped |
| WhatsApp Cloud API | `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` | notifications skipped |
| WhatsApp via Twilio | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` | notifications skipped |
| Delhivery (shipping/tracking) | `DELHIVERY_API_TOKEN`, `DELHIVERY_PICKUP_NAME`, `DELHIVERY_WEBHOOK_SECRET` | manual AWB entry |
| Razorpay refund webhook | `RAZORPAY_WEBHOOK_SECRET` | refunds must be issued manually |

## 5. Run locally

```bash
npm install
npm run dev      # storefront on http://localhost:3000
npm run server   # payment API on http://localhost:5000 (optional)
```

## 6. Deploy

Import the repository into Vercel, add the environment variables above, deploy.
`vercel.json` already builds with `npm run build` and serves `dist`.

---

## Why admin edits no longer reach the original store

Data sync is opt-in and project-scoped:

- `src/config.js` reads `VITE_FIREBASE_*`; `src/firebase.js` only calls
  `initializeApp()` when those variables exist.
- `src/db.js` writes to Firestore only when Firebase is initialised, and every
  write goes to the **project named by `VITE_FIREBASE_PROJECT_ID`**.
- The cloned credentials (`AIza…`, `rzp_test_…`, the Razorpay secret) are gone from
  the source and from the built bundle.

Since your deployment has its own project id, `store/products`, `store/orders`,
`users/{uid}` and friends are separate documents in a separate database.