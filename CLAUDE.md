# Athlete Tournament Financial Tracker

A web app for athletes to track tournament expenses, model prize money scenarios, and calculate net profit or loss per event — factoring in multi-currency conversion, subsidies, sponsorships, and individualized spending thresholds.

---

## Core Domain Logic

### P&L Formula
The central calculation that powers the app. Always compute it in `backend/utils/pnl.py`:

```
Net Result =
  Prize Money (by round scenario)
  + Subsidy amount
  + Sponsorship income (allocated to tournament)
  - Flights & transport
  - Accommodation (nightly rate × nights)
  - Daily spending cap × days
  - Coaching / physio costs
  - Entry fee
```

Run this calculation for three scenarios per tournament: **worst case** (R1 exit), **realistic** (user-defined), **best case** (win title).

### Currency Conversion
- Always store monetary values in the user's **home currency** in the database
- Convert on the fly for display using live FX rates from Open Exchange Rates
- Cache FX rates for 1 hour to avoid unnecessary API calls
- Always show amounts in **both home currency and tournament currency** side by side

### Subsidy Logic
- Subsidy can cover: flights only / accommodation only / full expenses / flat stipend
- Net the subsidy against the relevant expense line, not total expenses
- If subsidy covers flights, reduce the flights line; if flat stipend, add as income

### Spending Threshold
- Each tournament has its own daily spending cap (not global)
- App should warn if planned daily spend exceeds the cap
- Auto-suggest a cap based on destination cost-of-living data (use Numbeo API or a static table as fallback)

---

## Data Models

### User / Athlete Profile
```
id, name, home_country, home_currency, sport, monthly_income,
savings_balance, monthly_sponsorship, created_at
```

### Tournament
```
id, user_id, name, location, country, currency, start_date, end_date,
duration_days, entry_fee, flight_cost, accommodation_total,
daily_spending_cap, coaching_cost, misc_cost,
subsidy_by, subsidy_amount, subsidy_covers,
sponsorship_allocated, prize_rounds (JSONB), created_at
```

### prize_rounds (JSONB structure)
```json
{
  "r1": 500,
  "r2": 900,
  "r3": 2000,
  "qf": 4800,
  "sf": 9000,
  "f": 15000,
  "w": 25000
}
```

---

## Key Features & Rules

1. **Scenario modeling is non-negotiable** — every tournament must show worst / realistic / best case P&L. Never show a single number.
2. **Break-even round** — always calculate and display the minimum round the athlete must reach to not lose money.
3. **Runway calculator** — on the dashboard, always show how many more tournaments the athlete can afford at their current average net spend before savings run dry.
4. **Currency display** — never show a monetary value without its currency code (e.g. `$4,800 USD` or `₦7,200,000 NGN`).
5. **Subsidy toggle** — in the tournament form, subsidy fields should only appear when "I am subsidized" is toggled on.
6. **Mobile-first** — athletes will primarily use this on their phones. All layouts must work at 375px width first.

---

## Workflows

### Adding a new tournament (user flow)
1. Tournament details (name, location, dates, entry fee)
2. Prize money per round
3. Travel & accommodation costs
4. Subsidy & sponsorship inputs
5. Spending plan (daily cap, extra costs)
6. → Generate P&L projection across all scenarios

### Editing a tournament
- All fields editable post-creation
- P&L recalculates automatically on any field change (debounced, 300ms)

### Explore → Plan → Code → Commit
When building new features: read the relevant model and route files first, plan the change, implement, then run tests before committing.

---

## Testing & CI Requirements

Every new feature and code change must include:

- Python unit tests for any new backend logic — no exceptions
- Unit tests for all P&L calculation logic in `backend/utils/pnl.py`
- Unit tests for currency conversion edge cases (null rates, same currency)
- Test coverage must not drop below 80% on `backend/utils/` — check before every commit
- Run tests with: `.venv/bin/pytest backend/tests/ -v`

### GitHub Actions
- **CI on every PR** — runs frontend lint/build and Python tests; fails if any test fails or coverage drops below 80%
- **Coverage report** — posts a Python coverage summary as a PR comment
- **Lint check** — ESLint on the frontend
- **Build check** — Next.js production build

---

## Commit Convention

```
feat: add break-even round calculation
fix: correct subsidy netting for flat stipend type
chore: update exchange rate cache TTL
```

---

## Important Notes

- This app handles real financial data — validate all monetary inputs in Flask, never trust client-only math
- FX rates must always be fetched server-side (Flask); never expose the API key to the client
- When in doubt about the P&L formula, refer to `backend/utils/pnl.py` as the single source of truth
- Backend is Python Flask. Frontend is Next.js. They are separate processes communicating via HTTP.
