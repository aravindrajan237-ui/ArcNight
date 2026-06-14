# 🌾 HarvestLink

Direct farmer-to-buyer harvest contracts with **0% platform commission**.
Farmers list a harvest (by voice if they like), buyers negotiate a fair price
backed by an AI market estimate, both e-sign a digital agreement, and the deal is
locked with a **15% advance** and settled with the **85% balance** — with live
order tracking the whole way.

**Stack:** Next.js 14 (App Router, TypeScript) · Tailwind CSS · Supabase
(`@supabase/ssr`, Postgres + RLS + Realtime + Storage) · Razorpay (test) · Google
Gemini · pdf-lib · Leaflet · deployed on Vercel. One repo holds both the UI and
the backend (Route Handlers).

---

## Highlights

- **0% commission.** There is no fee math anywhere in the codebase.
- **Voice-first listing** — farmers describe a harvest out loud in **English,
  हिन्दी, or தமிழ்**; the form is pre-filled (Gemini, with a built-in offline
  keyword parser as fallback).
- **AI fair pricing** — an explainable pricing engine (7-day moving average +
  least-squares trend, with a data.gov.in mandi fallback) plus a `fair_deal_score`
  (0–100) on every listing.
- **Negotiation chat** — realtime, with an AI fairness mediator and **automatic
  cross-language translation** (a Hindi buyer and a Tamil farmer each read the
  thread in their own language). Supports text **and voice messages**.
- **Partial purchases** — buying part of a listing leaves the rest on the market;
  the cart shows **“Out of stock”** / **“Only N kg left”** live.
- **Two-stage payment** — 15% advance to lock the deal, then the 85% balance,
  with an **order-tracking timeline** (agreement → advance → balance → complete).
- **Digital e-signed agreement PDF** (pdf-lib) stored in Supabase Storage.
- **Trust & reputation** — trust scores, award badges, a public leaderboard, and
  scam/abuse reports.
- **Polish** — username/password auth (no SMS/email needed), i18n (en/hi/ta),
  dark mode, geolocation + Leaflet map, and a mobile-first responsive UI.

---

## 1. Install

```bash
npm install
```

## 2. Configure environment

```bash
cp .env.example .env.local
```

Then fill in `.env.local`:

| Key | Required | Where to get it |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | ✅ | `http://localhost:3000` for dev; your Vercel URL in prod |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase → Project Settings → API → `anon` public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase → Project Settings → API → `service_role` key (**secret**) |
| `GEMINI_API_KEY` | ✅ | Google AI Studio → Get API key (powers voice parse, mediator, translation, price basis) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | ✅ | Razorpay → Settings → API Keys (**Test Mode**) → Key Id |
| `RAZORPAY_KEY_SECRET` | ✅ | Razorpay → same screen → Key Secret |
| `DATA_GOV_IN_API_KEY` | optional | https://data.gov.in → My Account → API key (pricing falls back to local history without it) |
| `NEXT_PUBLIC_DEMO_MODE` / `DEMO_FARMER_ID` / `DEMO_BUYER_ID` | optional | one-tap demo role picker for UI testing (keep `false` in prod) |

> Only `NEXT_PUBLIC_*` vars reach the browser. `SUPABASE_SERVICE_ROLE_KEY`,
> `RAZORPAY_KEY_SECRET`, and `GEMINI_API_KEY` are **server-only** and must never
> be exposed client-side.

## 3. Set up the database

In the Supabase dashboard → **SQL Editor**, run the migrations **in order**:

1. [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) —
   core tables (`profiles`, `harvest_listings`, `offers`, `deals`, `payments`,
   `messages`, …), RLS policies, the `haversine_km()` function, and the
   profile-on-signup trigger.
2. [`supabase/migrations/0002_features.sql`](supabase/migrations/0002_features.sql)
   — scam reports, voice-message + location columns, the `voice-messages` /
   `avatars` / `crop-photos` Storage buckets, and Realtime on the `messages`
   table.

The public `agreements` bucket (for the PDF contracts) is created automatically
the first time a deal is signed, so no manual step is needed. Optionally run
[`supabase/seed.sql`](supabase/seed.sql) for sample data.

Auth is **username + password** — no email or SMS provider is required. Sign-up
creates the account server-side ([`/api/auth/signup`](app/api/auth/signup/route.ts))
using a synthetic email (`username@harvestlink.app`) with confirmation pre-set, so
no emails are ever sent.

## 4. Run

```bash
npm run dev        # http://localhost:3000
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint
```

> **Voice & location** need a *secure context*: use `http://localhost:3000`
> (or HTTPS in prod), not a LAN IP or an embedded preview, or the browser won’t
> prompt for the mic / location.

---

## Architecture

```
app/
  page.tsx                 Landing (0% commission hero)
  login/                   Username + password auth (+ demo role picker)
  onboarding/              Role select + name + geolocation
  farmer/                  Role-gated dashboard, listings, chat, profile
  buyer/                   Role-gated browse, cart, checkout, orders + tracking
  api/                     Route Handlers (zod + auth guards on each)
components/                Design system + feature UI (chat, buyer, farmer…)
lib/
  supabase/{client,server,admin,middleware}.ts
  i18n/                    en / hi / ta dictionaries + reactive locale
  ai.ts          Gemini client + market estimate + fair_deal_score
  pricing.ts     explainable price forecast (MA + least-squares, data.gov.in)
  agreement.ts   builds + uploads the e-signed PDF (pdf.ts = pdf-lib renderer)
  razorpay.ts    advance/final test orders + signature verify
  voice.ts       Web Speech API + offline crop/quantity parser
  realtime.ts    Supabase Realtime chat subscription
  auth-username.ts / session.ts / validation.ts / geo.ts / format.ts …
middleware.ts    protects /farmer/* and /buyer/* by role
supabase/migrations/  0001_init.sql, 0002_features.sql
```

### Fairness layer (the differentiator)

- **0% commission everywhere.** No fee math in the codebase.
- **Digital agreement PDF** generated with `pdf-lib` on deal creation, stored in
  Supabase Storage, URL saved to `deals.agreement_pdf_url`, with an e-sign record
  for both parties.
- **`fair_deal_score` (0–100)** = how close the price is to the market estimate
  (100 = exactly fair; ±50% deviation = 0), exposed on every listing.

> The 15% advance is the **buyer’s deposit toward their own total** — not a
> platform fee. HarvestLink takes ₹0.

### Payment lifecycle

`offer → accept → deal (15% advance computed) → advance paid → balance paid → fulfilled`

Buying decrements the listing’s available quantity at the **advance** stage, so a
50 kg listing with 20 kg sold stays listed with 30 kg; it’s only removed once it
sells out. The **balance (85%)** is a second Razorpay order that moves the deal to
`fulfilled` and credits the farmer a completed deal.

### API surface

| Method & path | Auth | Purpose |
| --- | --- | --- |
| `POST /api/auth/signup` | public | create a username/password account |
| `POST /api/listings` | farmer | create a harvest contract |
| `GET  /api/listings` | public | search/filter (crop, distance, price, organic, photo…) |
| `GET  /api/listings/[id]` | public | single contract + fair-deal score |
| `POST /api/listings/status` | public | live availability for cart items (stock/expiry) |
| `POST /api/offers` | buyer | make/counter an offer (or cart reserve) |
| `POST /api/offers/[id]/respond` | farmer | accept / reject / counter |
| `POST /api/deals` | party | create deal (total + 15% advance) + PDF |
| `POST /api/payments/order` | buyer | Razorpay TEST order (`kind: advance \| final`) |
| `POST /api/payments/verify` | buyer | verify signature → advance_paid / fulfilled |
| `POST /api/negotiate` | party | AI fairness mediator note (localized) |
| `POST /api/translate` | party | translate a chat message to the reader’s language |
| `GET  /api/price-estimate` | public | explainable ~4-week price forecast |
| `POST /api/voice-parse` | farmer | parse a spoken listing into fields |
| `POST /api/verify-crop` | farmer | upload a crop photo |
| `POST /api/profile` | user | edit name + profile picture |
| `POST /api/profile/location` | user | update saved location |
| `POST /api/messages` | party | chat message (realtime via Supabase) |
| `POST /api/reviews` | party | review after a fulfilled deal |
| `POST /api/reports` | user | file a scam/abuse report |
| `GET  /api/leaderboard` | public | top farmers, top buyers, most-bought crops |

## Deploy to Vercel

1. Push to GitHub, import the repo in Vercel.
2. Add **every** variable from `.env.example` under Vercel → Project → Settings →
   **Environment Variables** (Production + Preview). In particular,
   `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `GEMINI_API_KEY` must
   be set or payments / AI features will fail on the deployed site.
3. Set `NEXT_PUBLIC_SITE_URL` to your Vercel URL and keep `NEXT_PUBLIC_DEMO_MODE`
   **off** (`false` or unset).
4. Redeploy — `NEXT_PUBLIC_*` values are inlined at build time, so they only take
   effect on a fresh build.
