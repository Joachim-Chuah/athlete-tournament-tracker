import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { searchTournaments } from "@/data/seed-tournaments";

const PSA_API = "https://www.psasquashtour.com/wp-json/wp/v2/tournament";

const LEVEL_TIERS: Record<number, string> = {
  101: "Finals", 117: "Platinum", 97: "Platinum",
  100: "Platinum", 99: "Platinum", 116: "Gold",
  108: "Silver", 110: "Silver", 107: "Bronze",
  109: "Challenger", 104: "Challenger", 106: "Qualifying", 98: "Challenger",
};

function estimatePrizeRounds(prizeTotal: number, drawSize: number, tier: string) {
  if (!prizeTotal || prizeTotal <= 0) return {};
  const p = (pct: number) => Math.round(prizeTotal * pct);
  if (drawSize >= 64 || tier === "Platinum" || tier === "Finals")
    return { r1: p(0.008), r2: p(0.015), r3: p(0.028), qf: p(0.055), sf: p(0.105), f: p(0.20), w: p(0.35) };
  if (drawSize >= 32 || tier === "Gold")
    return { r1: p(0.015), r2: p(0.03), qf: p(0.065), sf: p(0.115), f: p(0.22), w: p(0.40) };
  if (drawSize >= 16 || tier === "Silver")
    return { r1: p(0.03), qf: p(0.075), sf: p(0.13), f: p(0.25), w: p(0.44) };
  return { qf: p(0.05), sf: p(0.15), f: p(0.27), w: p(0.50) };
}

function parsePsaDate(s: string) {
  if (!s || s.length < 8) return null;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

function parseLocation(loc: string) {
  const parts = loc?.split(", ") ?? [];
  const code = parts[parts.length - 1]?.trim() ?? "";
  const city = parts.slice(0, -1).join(", ").trim();
  return { city: city || loc, country: code };
}

type PsaComp = { level_id?: number; prize_total?: number; draws?: { size?: number }[] };
type PsaRaw = { id: number; title?: { rendered?: string }; meta?: { location?: string; start_date?: string; end_date?: string; competitions?: string | PsaComp[] } };

function psaTournamentToResult(raw: PsaRaw) {
  const meta = raw.meta ?? {};
  const name = raw.title?.rendered ?? "Unknown";
  const { city, country } = parseLocation(meta.location ?? "");
  const startDate = parsePsaDate(meta.start_date ?? "");
  const endDate = parsePsaDate(meta.end_date ?? "");

  let competitions: PsaComp[] = [];
  try {
    competitions = typeof meta.competitions === "string"
      ? JSON.parse(meta.competitions) : (meta.competitions ?? []);
  } catch { /* skip */ }

  const comp = competitions[0];
  const levelId = comp?.level_id ?? undefined;
  const tier = (levelId !== undefined ? LEVEL_TIERS[levelId] : undefined) ?? "Open";
  const prizeTotal: number = comp?.prize_total ?? 0;
  const drawSize: number = comp?.draws?.[0]?.size ?? 32;

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  const durationDays = start && end
    ? Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000))
    : 7;

  return {
    id: `psa-live-${raw.id}`,
    name,
    sport: "squash",
    tier,
    location: city,
    country,
    currency: "USD",
    typical_month: start ? start.getMonth() + 1 : 6,
    duration_days: durationDays,
    prize_rounds: estimatePrizeRounds(prizeTotal, drawSize, tier),
    start_date: startDate,
    end_date: endDate,
  };
}

async function searchFromDB(q: string, sport?: string) {
  const where: Record<string, unknown> = {};
  if (sport) where.sport = sport;
  if (q.trim()) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
      { country: { contains: q, mode: "insensitive" } },
      { tier: { contains: q, mode: "insensitive" } },
    ];
  }
  const results = await db.knownTournament.findMany({
    where,
    orderBy: [{ prize_total: "desc" }, { start_date: "asc" }],
    take: 12,
  });
  return results.map((t) => ({
    id: t.psa_id,
    name: t.name,
    sport: t.sport,
    tier: t.tier,
    location: t.location,
    country: t.country,
    currency: t.currency,
    typical_month: t.start_date ? new Date(t.start_date).getMonth() + 1 : 6,
    duration_days: t.duration_days,
    prize_rounds: t.prize_rounds as Record<string, number>,
    start_date: t.start_date?.toISOString().split("T")[0] ?? null,
    end_date: t.end_date?.toISOString().split("T")[0] ?? null,
  }));
}

async function searchFromPsaApi(q: string) {
  try {
    const url = `${PSA_API}?search=${encodeURIComponent(q)}&per_page=8&_fields=id,slug,title,meta`;
    const res = await fetch(url, {
      headers: { "User-Agent": "AthleteTracker/1.0" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map(psaTournamentToResult);
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const sport = req.nextUrl.searchParams.get("sport") ?? undefined;

  // 1. Try DB (fast, pre-scraped)
  let dbResults: ReturnType<typeof psaTournamentToResult>[] = [];
  try {
    dbResults = await searchFromDB(q, sport);
  } catch { /* DB unavailable */ }

  // 2. If squash and DB returned few results, also hit PSA API live
  const isSquash = !sport || sport === "squash";
  const needsLive = isSquash && q.trim().length > 1 && dbResults.length < 4;

  if (needsLive) {
    const liveResults = await searchFromPsaApi(q);
    const dbIds = new Set(dbResults.map((r) => r.name.toLowerCase()));
    const fresh = liveResults.filter((r) => !dbIds.has(r.name.toLowerCase()));
    const merged = [...dbResults, ...fresh].slice(0, 12);
    if (merged.length > 0) return NextResponse.json(merged);
  }

  if (dbResults.length > 0) return NextResponse.json(dbResults);

  // 3. Fall back to static seed
  return NextResponse.json(searchTournaments(q, sport));
}
