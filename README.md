# Laxmi Cloth House — Store

A complete e-commerce storefront for a clothing brand: React + Vite storefront,
Firestore-backed catalogue, admin panel, Razorpay payments, order e-mails,
WhatsApp notifications and Delhivery shipping.

The repository is a **clean template** — every API key and store identity comes
from environment variables, so you can deploy it as your own store without
touching any other deployment.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React 18, React Router, Vite |
| Styling | Hand-written CSS |
| Database | Firebase Firestore (with localStorage fallback) |
| Auth | Firebase Authentication (email + password) |
| Payments | Razorpay (server-created orders + signature verification) |
| E-mail | Resend |
| WhatsApp | Meta Cloud API (Twilio fallback) |
| Shipping | Delhivery |
| Hosting | Vercel (static build + serverless functions in `api/`) |

---

## Quick start (local)

```bash
npm install
npm run dev      # storefront on http://localhost:3000
npm run server   # payment API on http://localhost:5000 (optional)
```

With no environment variables set the app runs **local-only**: data stays in the
browser's `localStorage` and no Firebase request is made. Add your own
Firebase/Razorpay values to `.env` (copy from `.env.example`) to switch on
cloud sync.

---

## Go live

### 1. Create your own Firebase project (free)

1. <https://console.firebase.google.com> → **Add project**.
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable**.
3. **Build → Firestore Database → Create database** (production mode).
4. **Project settings → General → Your apps → `</>` Web app** → register → copy the config.
5. **Firestore Database → Rules** → paste [`firestore.rules`](./firestore.rules) → **Publish**.

You need these 7 values: `apiKey`, `authDomain`, `projectId`, `storageBucket`,
`messagingSenderId`, `appId`, `measurementId`.

### 2. Razorpay account

1. Sign up at <https://razorpay.com> and complete KYC (required before live payments).
2. **Settings → API Keys → Generate Key** in **Test Mode** first.
3. Copy the `rzp_test_…` key id and the key secret.

### 3. Make it your store

After your first admin login, open **Admin → Settings** and set the store name,
logo, tagline, contact phone/e-mail/address, announcement banner, free-shipping
threshold and delivery window. Social links live in
[`src/components/Footer.jsx`](./src/components/Footer.jsx).

### 4. Deploy to Vercel (free Hobby plan)

1. <https://vercel.com> → **Add New → Project → Import** this repository.
2. Framework preset **Vite**; build `npm run build`; output `dist`
   (already configured in [`vercel.json`](./vercel.json)).
3. In **Settings → Environment Variables** add (Production, and Preview if wanted):

| Scope | Variables |
| --- | --- |
| Browser (`VITE_`) | `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID`, `VITE_RAZORPAY_KEY_ID`, `VITE_APP_ORIGIN`, `VITE_STORE_NAME` |
| Server | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `FIREBASE_PROJECT_ID`, `FIREBASE_WEB_API_KEY`, `APP_ORIGIN`, `STORE_NAME` |

Set `APP_ORIGIN` to your Vercel URL (e.g. `https://myshop.vercel.app`).

> `VITE_*` values are **inlined at build time** — after changing one, redeploy.
> Anything without the `VITE_` prefix stays server-side and never reaches the browser.

### 5. Bootstrap your admin account

1. Open the live site and **sign up**.
2. Firebase → **Authentication → Users** → copy your **UID**.
3. **Firestore → Data → `users` → `<UID>`** → add field `role` (string) = `admin`.
4. Reload — the Admin panel unlocks.

### 6. Webhooks

| Register in | URL | Env var |
| --- | --- | --- |
| Razorpay → Settings → Webhooks | `https://<your-domain>/api/razorpay-webhook` | `RAZORPAY_WEBHOOK_SECRET` |
| Meta → WhatsApp → Configuration | `https://<your-domain>/api/whatsapp-webhook` | `WHATSAPP_VERIFY_TOKEN` |
| Delhivery (if used) | `https://<your-domain>/api/delhivery` | `DELHIVERY_WEBHOOK_SECRET` |

Each signing/verification secret must match the env var exactly. **Redeploy after
changing any env var.**

### 7. Optional services

| Service | Variables | When unset |
| --- | --- | --- |
| Order e-mails (Resend) | `RESEND_API_KEY`, `MAIL_FROM` (on a domain you verify at resend.com/domains), `MERCHANT_EMAIL` | e-mails skipped |
| WhatsApp (Meta) | `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_NAME`, `WHATSAPP_SALE_TEMPLATE_NAME` | notifications skipped |
| WhatsApp (Twilio fallback) | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` | notifications skipped |
| Shipping (Delhivery) | `DELHIVERY_API_TOKEN`, `DELHIVERY_PICKUP_NAME` | manual AWB entry |
| Refund webhook | `RAZORPAY_WEBHOOK_SECRET` | refunds must be issued manually |

### 8. Go live

1. In Razorpay, switch to **Live Mode** and generate live keys.
2. Update `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `VITE_RAZORPAY_KEY_ID`
   with the `rzp_live_…` values, then **redeploy** (the browser key only changes
   on a rebuild).
3. Re-create the Razorpay webhook secret if it changed.
4. Add a custom domain: Vercel → **Settings → Domains**, then set `APP_ORIGIN` and
   `VITE_APP_ORIGIN` to it and redeploy.

### 9. Smoke-test

- `https://<domain>/api/mail-health` → `readyToEmailCustomers: true` once mail is set up.
- Sign up → log in → log out; password-reset e-mail arrives.
- Add a product in Admin → it appears on the storefront in a private window.
- Place a Razorpay test order → payment succeeds, order shows in Admin, customer and
  merchant e-mails arrive.
- Cancel an order → refund it from the Razorpay dashboard → the webhook updates the order.
- Place a COD order → no payment step.
- Check Vercel → **Logs** for `[razorpay]`, `[mail]`, `[firebase]` errors.

---

## How the data stays isolated

- `src/config.js` reads the `VITE_*` values; `src/firebase.js` only calls
  `initializeApp()` when they exist.
- `src/db.js` writes to Firestore only when Firebase is initialised, and every
  write targets the project named by `VITE_FIREBASE_PROJECT_ID`.
- No credentials are baked into the source or the built bundle.

So each deployment reads and writes only its own Firebase project — separate
`store/*` documents, separate `users/{uid}` profiles, separate orders.

---

## Project layout

```
api/            Vercel serverless functions (Razorpay, mail, WhatsApp, Delhivery)
shared/         Code shared by the functions (mail, WhatsApp, Firestore REST, Delhivery)
src/            React storefront (pages, components, context)
src/config.js   All browser-facing env configuration
src/db.js       localStorage persistence + Firestore sync
firestore.rules Security rules to publish in your Firebase project
vercel.json     Build + SPA rewrites + API route aliases
.env.example    Every environment variable, documented
SETUP.md        Detailed setup notes and design rationale
```

## Limits to know

- **Vercel Hobby:** 12 serverless functions. This repo uses 11, so consolidate
  before adding another.
- **Firebase Spark (free):** fine for launch; upgrade only if you exceed the
  Firestore free quota.
- **Razorpay KYC:** live payments stay disabled until KYC is approved.