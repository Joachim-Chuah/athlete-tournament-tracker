import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { searchTournaments } from "@/data/seed-tournaments";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const sport = req.nextUrl.searchParams.get("sport") ?? undefined;

  // Query live DB first (populated by PSA scraper)
  try {
    const dbResults = await searchFromDB(q, sport);
    if (dbResults.length > 0) {
      return NextResponse.json(dbResults);
    }
  } catch {
    // DB unavailable — fall through to static seed
  }

  // Fall back to static seed data
  const seedResults = searchTournaments(q, sport);
  return NextResponse.json(seedResults);
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
    take: 15,
  });

  // Shape DB results to match SeedTournament format expected by the frontend
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
