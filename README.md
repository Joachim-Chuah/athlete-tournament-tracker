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
npm install
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

```bash
npx prisma db push
npx prisma generate
```

### 5. Seed PSA tournament data (optional but recommended)

```bash
node scripts/scrape-psa.js
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
npm run dev
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

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### Where to get each value

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000` for local dev — update to your Railway URL when deploying |
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string → **Transaction** mode |
| `OPEN_EXCHANGE_RATES_KEY` | openexchangerates.org → Sign up → Dashboard → App ID |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon public` key |

---

## Project Structure

```
athlete-tournament-tracker/
├── backend/                        # Python Flask API
│   ├── app.py                      # Flask entry point + CORS
│   ├── database.py                 # SQLAlchemy engine + session
│   ├── models.py                   # SQLAlchemy models (User, Tournament, KnownTournament)
│   ├── routes/
│   │   ├── profile.py              # GET/POST /api/profile
│   │   ├── tournaments.py          # CRUD /api/tournaments
│   │   ├── fx.py                   # GET /api/fx
│   │   └── search.py               # GET /api/tournaments/search
│   ├── utils/
│   │   ├── pnl.py                  # P&L formula — single source of truth
│   │   └── currency.py             # FX conversion, 1hr cache
│   └── tests/
│       ├── test_pnl.py
│       └── test_currency.py
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
├── prisma/
│   └── schema.prisma               # Database schema
│
├── scripts/
│   └── scrape-psa.js               # PSA tournament data scraper
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
npm run dev            # Start Next.js on localhost:3000
npm run build          # Production build
npm run lint           # ESLint
npm run test           # JS unit tests
npm run test:coverage  # JS tests + coverage report
npm run scrape:psa     # Pull latest PSA tournament data into DB
```

### Backend (Python)
```bash
.venv/bin/python -m backend.app          # Start Flask on localhost:5000
.venv/bin/pytest backend/tests/ -v       # Python unit tests
.venv/bin/pytest backend/tests/ --cov    # Python tests + coverage
```

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Backend | Python Flask |
| Database | PostgreSQL via Supabase |
| ORM | SQLAlchemy + psycopg2 |
| FX Rates | Open Exchange Rates |
| Tournament Data | PSA World Tour API (scraped weekly) |
| JS Testing | Vitest |
| Python Testing | pytest |
| Deployment | Next.js → Vercel · Flask → Railway |
