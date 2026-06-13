# 🌾 HarvestLink

Direct farmer-to-buyer harvest contracts with **0% platform commission**.
Negotiate, agree on a fair price (backed by an AI market estimate), sign a
digital agreement, and lock the deal with a 15% advance.

**Stack:** Next.js 14 (App Router, TS) · Tailwind · Supabase (`@supabase/ssr`) ·
Razorpay (test) · Twilio WhatsApp · Google Gemini · pdf-lib · Leaflet ·
deployed on Vercel. One repo holds both the UI and the backend (Route Handlers).

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

| Key | Where to get it |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` for dev |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` key (**secret**) |
| `GEMINI_API_KEY` | Google AI Studio → Get API key |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay → Settings → API Keys (**Test Mode**) → Key Id |
| `RAZORPAY_KEY_SECRET` | Razorpay → same screen → Key Secret |
| `TWILIO_ACCOUNT_SID` | Twilio Console → Account Info |
| `TWILIO_AUTH_TOKEN` | Twilio Console → Account Info |
| `TWILIO_WHATSAPP_FROM` | Twilio WhatsApp sender, sandbox: `whatsapp:+14155238886` |
| `DATA_GOV_IN_API_KEY` | https://data.gov.in → My Account → API key |

> Only `NEXT_PUBLIC_*` vars reach the browser. `SUPABASE_SERVICE_ROLE_KEY`,
> `RAZORPAY_KEY_SECRET`, and the Twilio/Gemini keys are **server-only** and must
> never be exposed client-side.

## 3. Set up the database

In the Supabase dashboard → **SQL Editor**, paste and run
[`supabase/schema.sql`](supabase/schema.sql). It creates all tables, RLS
policies, the `haversine_km()` function, the profile-on-signup trigger, and the
public `agreements` Storage bucket.

Enable **Email** auth: Supabase → Authentication → Providers → Email (magic link
is on by default — no paid SMS needed). Phone OTP is wired but commented out in
[`app/login/page.tsx`](app/login/page.tsx); enabling it requires a paid SMS
provider.

## 4. Run

```bash
npm run dev        # http://localhost:3000
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint
```

---

## What to put in `.env.local` (quick copy)

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=...
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
DATA_GOV_IN_API_KEY=...
```

---

## Architecture

```
app/
  page.tsx                 Landing (0% commission hero)
  login/                   Email magic-link auth (phone OTP commented)
  auth/callback/           Supabase code → session exchange
  onboarding/              Force role select + name + geolocation
  farmer/                  Role-gated dashboard (middleware)
  buyer/                   Role-gated dashboard (middleware)
  api/                     Route Handlers (zod + auth on every one)
lib/
  supabase/{client,server,admin,middleware}.ts
  ai.ts        Gemini market estimate + fair_deal_score (0–100)
  geo.ts       haversineKm() — mirrors SQL haversine_km()
  pdf.ts       pdf-lib digital agreement
  razorpay.ts  test order + signature verify
  twilio.ts    WhatsApp receipt
  validation.ts  all zod schemas
  api.ts       auth guards + JSON helpers
middleware.ts  protects /farmer/* and /buyer/* by role
supabase/schema.sql  tables, RLS, haversine_km(), storage bucket
```

### Fairness / legal layer (the differentiator)

- **0% commission everywhere.** There is no fee math in the codebase.
- **Digital agreement PDF** generated with `pdf-lib` on deal creation, stored in
  Supabase Storage, URL saved to `deals.agreement_pdf_url`, with an e-sign
  checkbox record for both parties.
- **`fair_deal_score` (0–100)** = how close the price is to the Gemini market
  estimate (100 = exactly fair; ±50% deviation = 0). Exposed in every listing
  response.

> The 15% advance is the **buyer's deposit toward their own total** — not a
> platform fee. HarvestLink takes ₹0.

### API surface

| Method & path | Auth | Purpose |
| --- | --- | --- |
| `POST /api/listings` | farmer | create harvest contract |
| `GET  /api/listings` | public | search/filter (crop, distance, price, organic, verified…) |
| `GET  /api/listings/[id]` | public | single contract + fair-deal score |
| `POST /api/offers` | buyer | make/counter an offer |
| `POST /api/offers/[id]/respond` | farmer | accept / reject / counter |
| `POST /api/deals` | party | create deal (total + 15% advance) + PDF |
| `POST /api/payments/order` | buyer | Razorpay TEST order for advance |
| `POST /api/payments/verify` | buyer | verify signature → WhatsApp receipt |
| `POST /api/messages` | party | chat message (realtime via Supabase channel) |
| `POST /api/reviews` | party | review after a fulfilled deal |
| `GET  /api/leaderboard` | public | top farmers, top buyers, most-bought crops |

## Deploy to Vercel

1. Push to GitHub, import the repo in Vercel.
2. Add every var from `.env.example` in Vercel → Project → Settings →
   Environment Variables.
3. Set `NEXT_PUBLIC_SITE_URL` to your Vercel URL and add
   `https://<your-app>.vercel.app/auth/callback` to Supabase → Authentication →
   URL Configuration → Redirect URLs.
