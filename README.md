# 🌱 SproutStream

**Private family video streaming. No ads. No algorithms. No strangers.**

> Your family's private streaming space — parents upload videos, kids watch safely, grandparents stay close.

---

## 🚀 Deploy in 15 Minutes

### Step 1 — Push to GitHub

1. Go to [github.com](https://github.com) → **New repository** → name it `sproutstream-app` → **Private**
2. Drag this entire folder into the repo (or use GitHub Desktop)
3. Commit and push

### Step 2 — Deploy to Cloudflare Pages

1. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
2. **Create a project** → Connect GitHub → select `sproutstream-app`
3. Build settings:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Click **Save and Deploy** — live in under 5 minutes
5. Add custom domain: **sproutstream.org** → follow Cloudflare's DNS instructions

### Step 3 — Add Environment Variables

In Cloudflare Pages → your project → **Settings → Environment Variables**, add:

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe → Developers → API keys |
| `VITE_CLOUDFLARE_ACCOUNT_ID` | Cloudflare → right sidebar |
| `VITE_CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN` | Cloudflare Stream → Overview |

Redeploy after adding variables. The app switches from Demo Mode to live instantly.

---

## 🗄️ Set Up the Database (Supabase)

1. Go to [supabase.com](https://supabase.com) → your project → **SQL Editor**
2. Click **New Query**
3. Paste the contents of `supabase/migrations/001_initial_schema.sql`
4. Click **Run**

That's it. All tables, policies, and triggers are created automatically.

---

## ⚡ Deploy Edge Functions (Supabase)

Install the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_ID
```

Set secrets (these stay server-side — never in `.env`):

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_MONTHLY_PRICE_ID=price_...
supabase secrets set STRIPE_ANNUAL_PRICE_ID=price_...
supabase secrets set CLOUDFLARE_ACCOUNT_ID=...
supabase secrets set CLOUDFLARE_STREAM_API_TOKEN=...
supabase secrets set SITE_URL=https://sproutstream.org
```

Deploy all three functions:

```bash
supabase functions deploy create-checkout-session
supabase functions deploy get-upload-url
supabase functions deploy stripe-webhook
```

---

## 💳 Set Up Stripe

1. Go to [stripe.com](https://stripe.com) → **Products** → **Add Product**
2. Create **"SproutStream Family Plan"**:
   - Monthly price: **$9.99/month** → copy Price ID → set as `STRIPE_MONTHLY_PRICE_ID`
   - Annual price: **$89/year** → copy Price ID → set as `STRIPE_ANNUAL_PRICE_ID`
3. Go to **Webhooks** → **Add endpoint**:
   - URL: `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook`
   - Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
   - Copy **Signing secret** → set as `STRIPE_WEBHOOK_SECRET`

---

## 🎬 Set Up Cloudflare Stream

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Stream**
2. **Enable Stream** if not already enabled
3. Copy your **Account ID** (right sidebar on any Cloudflare page)
4. Go to **My Profile → API Tokens** → **Create Token** → use "Edit Cloudflare Stream" template
5. Copy the token → set as `CLOUDFLARE_STREAM_API_TOKEN` in Supabase secrets
6. In Stream → **Overview** → find your **Customer Subdomain** → set as `VITE_CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN`

---

## 📁 Project Structure

```
sproutstream/
├── index.html                    # App entry point (PWA-enabled)
├── vite.config.js                # Vite build config
├── package.json                  # Dependencies
├── .env.example                  # → copy to .env, fill in keys
├── _redirects                    # Cloudflare Pages SPA routing
│
├── public/
│   ├── landing.html              # sproutstream.org landing page
│   ├── privacy.html              # Privacy Policy (/privacy)
│   ├── terms.html                # Terms of Service (/terms)
│   ├── partner-kit.html          # Printable affiliate one-pager
│   ├── manifest.json             # PWA manifest
│   ├── sw.js                     # Service worker
│   └── icons/                    # Add icon-192.png + icon-512.png here
│
├── src/
│   ├── main.jsx                  # React root + PWA registration
│   ├── SproutStream.jsx          # Full app (auth, parent, kid mode)
│   └── lib/
│       ├── supabase.js           # Auth + DB helpers
│       ├── stripe.js             # Checkout redirect
│       └── cloudflareStream.js  # Upload + playback
│
└── supabase/
    ├── migrations/
    │   └── 001_initial_schema.sql  # All DB tables + RLS policies
    └── functions/
        ├── create-checkout-session/ # Stripe checkout (server-side)
        ├── get-upload-url/          # Cloudflare Stream upload URL
        └── stripe-webhook/          # Subscription status sync
```

---

## 🔑 Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Phase 1 | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Phase 1 | Supabase public anon key |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Phase 1 | Stripe publishable key (safe to expose) |
| `VITE_CLOUDFLARE_ACCOUNT_ID` | Phase 1 | Cloudflare account ID |
| `VITE_CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN` | Phase 1 | Cloudflare Stream subdomain |

**Server-side only (Supabase Edge Function secrets — never in `.env`):**

| Secret | Description |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_MONTHLY_PRICE_ID` | Stripe price ID for $9.99/month |
| `STRIPE_ANNUAL_PRICE_ID` | Stripe price ID for $89/year |
| `CLOUDFLARE_STREAM_API_TOKEN` | Cloudflare Stream API token |

---

## 🧪 Local Development

```bash
# Install dependencies
npm install

# Copy and fill in your keys
cp .env.example .env

# Start dev server
npm run dev
# → http://localhost:5173

# Build for production
npm run build
```

The app runs in **Demo Mode** without Supabase keys (simulated auth, seed data). Add keys to `.env` to enable real auth and storage.

---

## 📋 Phase Checklist

- [x] **Phase 4** — Full React app with auth, PIN, kid mode, video upload UI
- [ ] **Phase 1** — Add Supabase/Stripe/Cloudflare keys → live backend
- [ ] **Phase 1** — Deploy to Cloudflare Pages + sproutstream.org domain
- [ ] **Phase 2** — Invite 10–20 beta families, collect feedback
- [ ] **Phase 3** — Launch publicly, enable Stripe billing, activate referral program

---

## 📞 Support

- Email: support@sproutstream.org
- Business: hello@sproutstream.org

Built with React + Vite + Supabase + Cloudflare Stream + Stripe.
