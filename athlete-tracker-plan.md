# Athlete Tournament Financial Tracker — SaaS Business Plan

> *"Know before you go. Profit from every tournament."*

---

## The Core Idea

A tournament profitability calculator and financial planner built specifically for athletes. Not a generic expense tracker — a tool that answers one critical question:

> *"If I go to this tournament, will I come out ahead or behind — and by how much?"*

Born from a real personal pain point, built for a massively underserved market.

---

## The Problem Being Solved

Athletes — especially those on the professional circuit — deal with:
- Inconsistent income (prize money varies wildly by round reached)
- High, unpredictable travel costs across multiple currencies
- Subsidies and sponsorships that need to be factored in
- No financial tooling built specifically for their lifestyle

The typical athlete today manages this with:
> Spreadsheets → gut feeling → hoping they break even

**There is no dedicated, sport-aware financial planning tool for athletes. That's the gap.**

---

## Target Audience

### Primary (Personal Use → Early Adopters)
- **Tennis players** — massive travel circuit, huge prize money variance by round
- **Track & field athletes** — Diamond League circuit, often entirely self-funded
- **Combat sports athletes** — irregular fight paydays, high training costs
- **Golfers on minor tours** — notoriously tight margins, heavy travel

### Secondary (SaaS Expansion)
- **Coaches & managers** — tracking finances for multiple athletes
- **Sports academies** — managing financial planning for their roster
- **National federations** — offering the tool as a benefit to their athletes

---

## Core Features

### 🌍 1. Player Financial Profile
- Home country + home currency
- Average monthly salary / savings balance
- Active sponsorship deals (monthly or per-tournament value)
- Historical tournament P&L for reference
- **Runway calculator** — how many tournaments can they afford at current spending before savings run dry?

---

### 🏆 2. Tournament Setup
- Tournament name, location, and duration
- Sport type and format (affects prize structure)
- Entry fees (if applicable)
- Expected travel costs (flights, visas, ground transport)
- Auto cost-of-living data for destination city

---

### 💱 3. Multi-Currency Tracking
- Home currency vs. tournament currency auto-conversion
- Live exchange rate pulls
- All figures shown in both currencies simultaneously
- Currency volatility flag for long-duration trips

---

### 💰 4. Prize Money Scenario Modeling
Input prize money per round, then model three scenarios:

| Scenario | Example (Tennis) | Net Result |
|---|---|---|
| **Worst case** | Lose R1 | Prize - All Expenses |
| **Realistic** | Reach QF | Prize - All Expenses |
| **Best case** | Win title | Prize - All Expenses |

Each scenario outputs a clear **profit or loss figure** in home currency.

---

### 🤝 5. Subsidy & Sponsorship Input
- Is a federation, sponsor, or academy covering costs?
- What's covered: flights only / accommodation / full expenses / flat stipend?
- Subsidy automatically netted against total expenses in the P&L calculation

---

### 🏨 6. Stay & Spending Plan
- Number of nights (tournament duration + travel days)
- Individualized daily spending threshold (set per tournament)
- Auto-suggested daily budget based on destination cost-of-living data
- Expense categories: accommodation, food, transport, physio, equipment, misc

---

### 🧮 7. The Profit Calculator (Hero Feature)

The full P&L formula:

```
Prize Money (by round scenario)
+ Subsidies received
+ Sponsorship income allocated to tournament
- Flight & transport costs
- Accommodation costs
- Daily expenses × number of days
- Entry fees
- Equipment / gear costs
- Coaching / physio costs on-site
─────────────────────────────────
= NET PROFIT / LOSS (per scenario)
```

Displayed as a clear dashboard with:
- Green / red profit indicator per scenario
- Break-even round (what round must I reach to not lose money?)
- Recommended daily spending cap to hit profit target

---

## What Makes This Different From a Regular Expense App

| Generic Expense App | Athlete Tournament Tracker |
|---|---|
| Tracks past spending | Predicts future profitability |
| Single currency | Multi-currency with live rates |
| No income modeling | Full prize money scenario modeling |
| Generic categories | Sport-specific expense categories |
| No profitability view | Full P&L per tournament per round |
| No subsidy logic | Subsidy & sponsorship netting built in |

---

## UI Flow (Screen by Screen)

### Screen 1 — Dashboard
- Total YTD earnings vs. expenses across all tournaments
- Upcoming tournament cards with profit projections
- Savings runway indicator
- Quick-add new tournament button

### Screen 2 — Player Profile Setup
- Home country + currency
- Income inputs: salary, savings, sponsorship deals
- Sport type selection

### Screen 3 — New Tournament
- Tournament name, location, dates
- Prize money per round input
- Entry fee input
- Travel cost estimator

### Screen 4 — Funding & Subsidies
- Toggle: "Am I subsidized for this tournament?"
- If yes: who by, what's covered, exact amount
- Sponsorship income allocated to this event

### Screen 5 — Spending Plan
- Number of days at destination
- Daily spending threshold (editable)
- Expense breakdown by category
- Cost-of-living suggestion for destination

### Screen 6 — Profit Projection
- Three-scenario P&L table (worst / realistic / best)
- Break-even round highlighted
- Currency toggle (home vs. tournament)
- Export as PDF for sponsor/federation reporting

---

## Monetization Strategy

| Tier | Price | Features |
|---|---|---|
| **Free** | $0 | 2 tournaments/month, basic tracking, single currency |
| **Pro** | $12–19/month | Unlimited tournaments, multi-currency, scenario modeling, PDF export |
| **Coach / Manager** | $49/month | Track up to 10 athletes, team dashboard |
| **Academy** | $99/month | Unlimited athletes, federation reporting, custom branding |
| **Federation B2B** | Custom | Bulk licensing, white-label option, API access |

**The federation angle is massive.** One deal with a national tennis or athletics federation onboards hundreds of athletes instantly.

---

## MVP Roadmap

| Phase | Timeline | Focus | Deliverable |
|---|---|---|---|
| **Phase 0** | Week 1–2 | Personal use | Spreadsheet/Notion version for your own tournaments |
| **Phase 1** | Month 1 | Core build | Tournament setup, prize modeling, basic P&L |
| **Phase 2** | Month 2 | Polish | Multi-currency, subsidy logic, spending plan |
| **Phase 3** | Month 3 | Launch | Web app live, free tier open, outreach to athlete communities |
| **Phase 4** | Month 4+ | Expand | Coach tier, federation outreach, sport-specific prize databases |

---

## Validation Plan (Before Writing Code)

1. **Build it for yourself first** — use a spreadsheet that does everything described. Use it for 3–4 tournaments. Note what's annoying, what's missing, what matters.
2. **Share the spreadsheet** with 5–10 fellow athletes. See if they use it.
3. **Post in athlete communities** — tennis forums, athletics Discord servers, combat sports groups. Ask: *"Would you pay $15/month for this?"*
4. **If yes → build the MVP.** The spreadsheet *is* your spec.

---

## Growth Strategy

### Community First
- Share your own story — athlete turned founder solving their own problem
- Post in sport-specific forums and subreddits
- Partner with player associations and athlete unions

### Influencer / Athlete Partnerships
- Give free Pro accounts to well-followed athletes in exchange for honest posts
- One tweet from a recognizable player = massive credibility

### Federation & Academy Outreach
- Cold outreach to national federations with a tailored pitch
- Offer a free 3-month pilot for their athletes
- One federation deal > 100 individual subscriptions

### SEO
- *"How to manage finances as a professional tennis player"*
- *"Tournament expense tracker for athletes"*
- *"How much does it cost to play the ATP Challenger circuit"*

---

## Risks & How to Mitigate Them

| Risk | Mitigation |
|---|---|
| Data entry fatigue | Make tournament setup completable in under 3 minutes |
| Prize money data varies by sport | Start with one sport you know, expand via user contributions |
| Niche audience | Federation B2B deals multiply reach fast |
| Low willingness to pay | Free tier drives adoption; value is obvious once they see the P&L |

---

## Why This Wins

- **You are the customer.** No guessing at the problem — you live it.
- **No competition.** Nothing like this exists for athletes specifically.
- **Emotional resonance.** Athletes who've lost money on a tournament they thought would be profitable will pay immediately.
- **Built-in network.** Athlete communities are tight — one genuine success story spreads fast.

---

## The Bigger Vision

Start as a tournament expense tracker. Become the **financial operating system for professional athletes** — tax planning, contract management, sponsorship valuation, career earnings projection.

The tournament tracker is the wedge. The platform is the destination.

---

*Brainstormed on April 25, 2026*
