# Athlete Tournament Financial Tracker

> *Know before you go. Profit from every tournament.*

A tournament profitability calculator for professional athletes. Answers one question: **will attending this tournament make or lose me money — and by how much?**

Models prize money across worst/realistic/best-case round scenarios, factors in multi-currency conversion, subsidies, sponsorships, and per-tournament spending caps. Outputs a clean P&L projection before you book anything.

---

## Quickstart

### Prerequisites

- Node.js 20+
- Python 3.12+
- A [Supabase](https://supabase.com) project (free tier works)
- An [Open Exchange Rates](https://openexchangerates.org) account (free tier: 1,000 req/month)

### 1. Clone and install

```bash
git clone https://github.com/Joachim-Chuah/athlete-tournament-tracker.git
cd athlete-tournament-tracker
pnpm install
```

### 2. Set up the Python backend

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local` — see the [Environment Variables](#environment-variables) section below for where to get each value.

### 4. Set up the database

The active schema is defined by `backend/models.py`. Existing deployments must
use a database with that schema; see `backend/EXTRACTION.md` for the safe
SQLAlchemy/Alembic baseline plan.

### 5. Seed PSA tournament data (optional but recommended)

```bash
pnpm scrape:psa
```

This pulls ~600 squash tournaments from the PSA API into your database so the Quick Fill search works out of the box.

### 6. Run the app

You need **two terminals** running simultaneously:

**Terminal 1 — Flask API:**
```bash
.venv/bin/python -m backend.app
```

**Terminal 2 — Next.js frontend:**
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Flask runs on port 5000, Next.js on port 3000.

---

## Environment Variables

Create `.env.local` at the project root. Both the Flask backend and Next.js frontend read from this file.

```env
# Flask API base URL
NEXT_PUBLIC_API_URL=http://localhost:5000

# Database — from your Supabase project
DATABASE_URL=

# Open Exchange Rates — for live FX conversion
OPEN_EXCHANGE_RATES_KEY=

# Supabase — frontend (sign-in)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Supabase — backend (JWT verification)
# Used by Flask to verify access tokens. The JWKS endpoint is derived as
# ${SUPABASE_URL}/auth/v1/.well-known/jwks.json — set SUPABASE_JWKS_URL only to override.
SUPABASE_URL=
# SUPABASE_JWKS_URL=
```

### Where to get each value

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000` for local dev — update to your Railway URL when deploying |
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string → **Transaction** mode |
| `OPEN_EXCHANGE_RATES_KEY` | openexchangerates.org → Sign up → Dashboard → App ID |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon public` key |
| `SUPABASE_URL` | Same Project URL — backend uses it to fetch JWKS public keys and verify tokens |
| `SUPABASE_JWKS_URL` | Optional — only set to override the derived `…/auth/v1/.well-known/jwks.json` endpoint |

### Supabase Auth

The app signs in with Google OAuth through Supabase. In your Supabase project:

1. Enable **Authentication → Sign In / Providers → Google**.
2. Add the Google OAuth client ID and secret from Google Cloud.
3. Set **Authentication → URL Configuration → Site URL** to `http://localhost:3000` for local development.
4. Add `http://localhost:3000/auth/callback` to the allowed redirect URLs.

If you deploy the frontend, add the deployed `/auth/callback` URL there too.

The Flask backend verifies the Supabase access token on every route (except `/health`) via JWKS, so requests must send an `Authorization: Bearer <token>` header — this requires `SUPABASE_URL` to be set.

---

## Project Structure

```
athlete-tournament-tracker/
├── backend/                        # Python Flask API
│   ├── app.py                      # Flask entry point + CORS
│   ├── database.py                 # SQLAlchemy engine + session
│   ├── models.py                   # SQLAlchemy models (User, Tournament, KnownTournament)
│   ├── routes/
│   │   ├── profile.py              # GET/POST /api/profile (includes runway_tournaments)
│   │   ├── tournaments.py          # CRUD /api/tournaments + POST /api/tournaments/pnl-preview
│   │   ├── fx.py                   # GET /api/fx
│   │   └── search.py               # GET /api/tournaments/search
│   ├── utils/
│   │   ├── pnl.py                  # P&L formula — single source of truth
│   │   └── currency.py             # FX conversion, 1hr cache
│   └── tests/
│       ├── conftest.py                 # Shared Flask test client + mock fixtures
│       ├── test_pnl.py                 # P&L formula + runway calculator
│       ├── test_currency.py            # convert() + format_money()
│       ├── test_currency_fetch.py      # fetch_rates() with mocked HTTP
│       ├── test_auth.py                # JWT verification
│       ├── test_database.py            # URL normalisation
│       ├── test_tournaments.py         # Field coercion utilities
│       ├── test_routes_fx.py           # GET /api/fx (HTTP)
│       ├── test_routes_profile_http.py # GET/POST /api/profile (HTTP)
│       ├── test_routes_tournaments_http.py # Tournaments CRUD (HTTP)
│       └── test_routes_search.py       # Search helpers + GET /api/tournaments/search
│
├── src/                            # Next.js frontend
│   ├── app/                        # App Router pages
│   │   ├── dashboard/page.tsx      # YTD stats, runway, tournament cards
│   │   ├── profile/page.tsx        # Athlete profile setup
│   │   └── tournaments/
│   │       ├── new/page.tsx        # 5-step new tournament wizard
│   │       └── [id]/page.tsx       # Tournament P&L detail view
│   ├── components/
│   │   ├── layout/AppShell.tsx     # Sidebar (desktop) + bottom nav (mobile)
│   │   ├── tournaments/
│   │   │   └── TournamentSearch.tsx # Quick Fill search combobox
│   │   └── ui/                     # badge, button, card, input
│   ├── context/user.tsx            # localStorage-backed user session
│   ├── lib/
│   │   ├── api.ts                  # Typed API client → Flask
│   │   └── utils.ts                # cn(), formatMoney, formatDate
│   └── types/index.ts              # Shared TypeScript types
│
├── scripts/
│   └── scrape_psa.py                # PSA tournament data scraper
│
├── tests/unit/                     # JS unit tests (pnl + currency)
├── .github/workflows/
│   ├── ci.yml                      # Frontend lint/build + Python tests
│   └── scrape.yml                  # Weekly PSA scraper (Monday 3am UTC)
├── Procfile                        # Railway deployment
├── requirements.txt                # Python dependencies
└── .env.example
```

### Key conventions

- **P&L formula** lives exclusively in `backend/utils/pnl.py` — never duplicate this logic elsewhere.
- **Monetary values** are stored in the athlete's home currency in the database. FX conversion happens on write.
- **FX rates** are always fetched server-side (Flask). The API key is never exposed to the client.
- **Every monetary display** must include the currency code — e.g. `$4,800 USD`, never just `$4,800`.
- **Mobile-first** — all layouts target 375px width first.

---

## Scripts

### Frontend (Node)
```bash
pnpm dev            # Start Next.js on localhost:3000
pnpm build          # Production build
pnpm lint           # ESLint
pnpm scrape:psa     # Pull latest PSA tournament data into DB
```

### Backend (Python)
```bash
.venv/bin/python -m backend.app          # Start Flask on localhost:5000
.venv/bin/pytest backend/tests/ -v       # Python unit tests
SUPABASE_JWKS_URL=https://placeholder.supabase.co/auth/v1/.well-known/jwks.json \
.venv/bin/pytest backend/tests/ \
  --cov=backend/utils --cov=backend/routes \
  --cov-report=term-missing              # Python tests + coverage
```

### Versioned API contract

`backend/api_schemas.py` is the schema source for the checked-in OpenAPI 3.1
contract. Generate and verify it deterministically with:

```bash
.venv/bin/python -m backend.openapi --write
.venv/bin/python -m backend.openapi --check
```

CI runs the check command and fails when `backend/openapi.json` does not match
the schema source. See `backend/API_COMPATIBILITY.md` for the legacy and v1
compatibility policy.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router) + Tailwind CSS |
| Backend | Python Flask |
| Database | PostgreSQL via Supabase |
| ORM | SQLAlchemy + psycopg 3 |
| FX Rates | Open Exchange Rates |
| Tournament Data | PSA World Tour API (scraped weekly) |
| JS Testing | Vitest |
| Python Testing | pytest |
| Deployment | Next.js → Vercel · Flask → Railway |
