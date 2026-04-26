# Athlete Tournament Financial Tracker

> *Know before you go. Profit from every tournament.*

A tournament profitability calculator for professional athletes. Answers one question: **will attending this tournament make or lose me money — and by how much?**

Models prize money across worst/realistic/best-case round scenarios, factors in multi-currency conversion, subsidies, sponsorships, and per-tournament spending caps. Outputs a clean P&L projection before you book anything.

---

## Quickstart

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier works)
- An [Open Exchange Rates](https://openexchangerates.org) account (free tier: 1,000 req/month)

### 1. Clone and install

```bash
git clone https://github.com/joachimchuah/athlete-tournament-tracker.git
cd athlete-tournament-tracker
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local` — see the [Environment Variables](#environment-variables) section below for where to get each value.

### 3. Set up the database

```bash
npx prisma generate
npx prisma db push
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Create `.env.local` at the project root. All values are required for the app to run.

```env
# Database — from your Supabase project
DATABASE_URL=

# Open Exchange Rates — for live FX conversion
OPEN_EXCHANGE_RATES_KEY=

# Supabase — for auth and client-side queries
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### Where to get each value

| Variable | Where to find it |
|---|---|
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string → choose **Transaction** mode |
| `OPEN_EXCHANGE_RATES_KEY` | openexchangerates.org → Sign up → Dashboard → App ID |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` key — never expose this to the client |

---

## Project Structure

```
athlete-tournament-tracker/
├── src/
│   ├── app/                        # Next.js App Router pages
│   │   ├── page.tsx                # Redirects → /dashboard
│   │   ├── layout.tsx              # Root layout (fonts, global styles)
│   │   ├── globals.css
│   │   ├── dashboard/
│   │   │   └── page.tsx            # YTD stats, runway indicator, tournament cards
│   │   ├── profile/
│   │   │   └── page.tsx            # Athlete profile setup
│   │   └── tournaments/
│   │       ├── new/
│   │       │   └── page.tsx        # 5-step new tournament wizard
│   │       └── [id]/
│   │           └── page.tsx        # Tournament P&L detail view
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   └── AppShell.tsx        # Top bar + bottom nav shell
│   │   └── ui/                     # Primitive UI components
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       └── input.tsx
│   │
│   ├── server/
│   │   └── utils/
│   │       ├── pnl.js              # P&L formula — single source of truth
│   │       └── currency.js         # FX conversion, 1hr cache, formatMoney
│   │
│   ├── lib/
│   │   └── utils.ts                # cn(), formatMoney (client-side), formatDate
│   │
│   └── types/
│       └── index.ts                # Shared TypeScript types
│
├── prisma/
│   └── schema.prisma               # Database schema (User, Tournament)
│
├── tests/
│   ├── unit/
│   │   ├── pnl.test.js             # P&L calculation unit tests
│   │   └── currency.test.js        # Currency conversion edge case tests
│   └── integration/                # API route integration tests (coming soon)
│
├── .github/
│   └── workflows/
│       └── ci.yml                  # CI: lint → test → coverage → build
│
├── CLAUDE.md                       # Domain rules and conventions for AI-assisted dev
├── vitest.config.js
└── .env.example
```

### Key conventions

- **P&L formula** lives exclusively in `src/server/utils/pnl.js` — never duplicate this logic elsewhere.
- **Monetary values** are stored in the athlete's home currency in the database. FX conversion happens at display time.
- **FX rates** are always fetched server-side. The API key is never exposed to the client.
- **Every monetary display** must include the currency code — e.g. `$4,800 USD`, never just `$4,800`.
- **Mobile-first** — all layouts target 375px width first.

---

## Scripts

```bash
npm run dev            # Start dev server
npm run build          # Production build
npm run test           # Run unit tests once
npm run test:watch     # Watch mode
npm run test:coverage  # Tests + coverage report
npm run lint           # ESLint
```

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Database | PostgreSQL via Supabase |
| ORM | Prisma |
| Auth | Supabase Auth (coming soon) |
| FX Rates | Open Exchange Rates |
| Testing | Vitest |
| Deployment | Vercel |
