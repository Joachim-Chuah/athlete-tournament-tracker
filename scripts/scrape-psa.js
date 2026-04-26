#!/usr/bin/env node
/**
 * PSA World Tour scraper — fetches from the PSA public WordPress REST API.
 * No headless browser needed. Run directly: node scripts/scrape-psa.js
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env.local") });

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const PSA_API = "https://www.psasquashtour.com/wp-json/wp/v2/tournament";
const PER_PAGE = 100;
const FIELDS = "id,slug,title,meta";

// Level ID → tier name (derived from prize amounts and known events)
const LEVEL_TIERS = {
  101: "Finals",
  117: "Platinum",
  97:  "Platinum",
  100: "Platinum",
  99:  "Platinum",
  116: "Gold",
  108: "Silver",
  110: "Silver",
  107: "Bronze",
  109: "Challenger",
  104: "Challenger",
  106: "Qualifying",
  98:  "Challenger",
};

// ISO country code → full name
const COUNTRY_NAMES = {
  US: "United States", GB: "United Kingdom", UK: "United Kingdom",
  BR: "Brazil", EG: "Egypt", QA: "Qatar", MY: "Malaysia",
  HK: "Hong Kong", FR: "France", DE: "Germany", AU: "Australia",
  NL: "Netherlands", BE: "Belgium", CH: "Switzerland", AT: "Austria",
  SA: "Saudi Arabia", AE: "United Arab Emirates", KW: "Kuwait",
  OM: "Oman", PK: "Pakistan", IN: "India", CN: "China",
  JP: "Japan", KR: "South Korea", MX: "Mexico", CO: "Colombia",
  AR: "Argentina", GH: "Ghana", NG: "Nigeria", ZA: "South Africa",
  KE: "Kenya", MA: "Morocco", TN: "Tunisia", CA: "Canada",
  NZ: "New Zealand", SG: "Singapore", PH: "Philippines", TH: "Thailand",
  ZW: "Zimbabwe", ES: "Spain", IT: "Italy", PT: "Portugal",
  SE: "Sweden", NO: "Norway", DK: "Denmark", FI: "Finland",
  CZ: "Czech Republic", PL: "Poland", RO: "Romania", HU: "Hungary",
  GR: "Greece", IE: "Ireland", TR: "Turkey", GY: "Guyana",
  TT: "Trinidad and Tobago", JM: "Jamaica", LK: "Sri Lanka",
};

/**
 * Estimate prize money per round from total prize pool and draw size.
 * PSA doesn't expose per-round breakdown via API, so we use standard
 * distribution percentages by tier.
 */
function estimatePrizeRounds(prizeTotal, drawSize, tier) {
  if (!prizeTotal || prizeTotal <= 0) return {};

  const p = (pct) => Math.round(prizeTotal * pct);

  if (drawSize >= 64 || tier === "Platinum" || tier === "Finals") {
    return {
      r1: p(0.008), r2: p(0.015), r3: p(0.028),
      qf: p(0.055), sf: p(0.105), f: p(0.20), w: p(0.35),
    };
  }
  if (drawSize >= 32 || tier === "Gold") {
    return {
      r1: p(0.015), r2: p(0.03),
      qf: p(0.065), sf: p(0.115), f: p(0.22), w: p(0.40),
    };
  }
  if (drawSize >= 16 || tier === "Silver") {
    return {
      r1: p(0.03),
      qf: p(0.075), sf: p(0.13), f: p(0.25), w: p(0.44),
    };
  }
  // Bronze / Challenger
  return { qf: p(0.05), sf: p(0.15), f: p(0.27), w: p(0.50) };
}

function parseLocation(locationStr) {
  if (!locationStr) return { city: "Unknown", countryCode: "??", country: "Unknown" };
  const parts = locationStr.split(", ");
  const countryCode = parts[parts.length - 1]?.trim().toUpperCase() ?? "??";
  const city = parts.slice(0, -1).join(", ").trim();
  const country = COUNTRY_NAMES[countryCode] ?? countryCode;
  return { city, countryCode, country };
}

function parseDate(dateStr) {
  if (!dateStr || dateStr.length < 8) return null;
  const y = dateStr.slice(0, 4);
  const m = dateStr.slice(4, 6);
  const d = dateStr.slice(6, 8);
  const dt = new Date(`${y}-${m}-${d}T00:00:00Z`);
  return isNaN(dt.getTime()) ? null : dt;
}

async function fetchPage(page) {
  const url = `${PSA_API}?per_page=${PER_PAGE}&page=${page}&_fields=${FIELDS}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "AthleteTracker/1.0 (tournament data aggregation)" },
  });
  if (!res.ok) throw new Error(`PSA API error: ${res.status} on page ${page}`);
  const total = parseInt(res.headers.get("x-wp-totalpages") ?? "1", 10);
  const data = await res.json();
  return { data, totalPages: total };
}

async function scrape(db) {
  console.log("Fetching PSA tournament data...");

  const { data: firstPage, totalPages } = await fetchPage(1);
  console.log(`Total pages: ${totalPages}`);

  const allTournaments = [...firstPage];

  // Fetch remaining pages
  for (let page = 2; page <= Math.min(totalPages, 50); page++) {
    const { data } = await fetchPage(page);
    allTournaments.push(...data);
    if (page % 10 === 0) console.log(`  Fetched page ${page}/${Math.min(totalPages, 50)}`);
    await new Promise((r) => setTimeout(r, 150)); // polite delay
  }

  console.log(`Processing ${allTournaments.length} tournaments...`);

  const cutoff = new Date("2025-01-01");
  let upserted = 0;
  let skipped = 0;

  for (const raw of allTournaments) {
    if (!raw || typeof raw !== "object") continue;

    const meta = raw.meta ?? {};
    const startDate = parseDate(meta.start_date);
    const endDate = parseDate(meta.end_date);

    // Only keep tournaments from 2025 onwards
    if (!startDate || startDate < cutoff) { skipped++; continue; }

    const { city, countryCode, country } = parseLocation(meta.location);

    let competitions = [];
    try {
      competitions = typeof meta.competitions === "string"
        ? JSON.parse(meta.competitions)
        : (meta.competitions ?? []);
    } catch { /* skip malformed */ }

    // Create one record per gender competition (Men/Women)
    for (const comp of competitions) {
      if (!comp || typeof comp !== "object") continue;

      const levelId = comp.level_id ?? null;
      const tier = LEVEL_TIERS[levelId] ?? "Open";
      const prizeTotal = comp.prize_total ?? 0;
      const drawSize = comp.draws?.[0]?.size ?? 32;
      const gender = comp.name ?? "Open";
      const durationDays = startDate && endDate
        ? Math.max(1, Math.round((endDate - startDate) / 86400000))
        : 7;

      const prizeRounds = estimatePrizeRounds(prizeTotal, drawSize, tier);
      const psaId = `psa-${raw.id}-${comp.competition_id}`;
      const name = gender === "Open"
        ? raw.title.rendered
        : `${raw.title.rendered} (${gender})`;

      await db.knownTournament.upsert({
        where: { psa_id: psaId },
        update: {
          name,
          tier,
          level_id: levelId,
          location: city,
          country,
          country_code: countryCode,
          start_date: startDate,
          end_date: endDate,
          duration_days: durationDays,
          prize_total: prizeTotal,
          prize_rounds: prizeRounds,
          draw_size: drawSize,
          gender,
          updated_at: new Date(),
        },
        create: {
          psa_id: psaId,
          name,
          sport: "squash",
          tier,
          level_id: levelId,
          location: city,
          country,
          country_code: countryCode,
          currency: "USD",
          start_date: startDate,
          end_date: endDate,
          duration_days: durationDays,
          prize_total: prizeTotal,
          prize_rounds: prizeRounds,
          draw_size: drawSize,
          gender,
          source: "psa",
        },
      });

      upserted++;
    }
  }

  console.log(`Done. Upserted: ${upserted}, Skipped (pre-2025): ${skipped}`);
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({ adapter });

  try {
    await scrape(db);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
