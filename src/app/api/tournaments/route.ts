import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { calculatePnL } from "@/server/utils/pnl.js";
import { fetchRates, convert } from "@/server/utils/currency.js";

const PrizeRoundsSchema = z.object({
  r1: z.number().optional(),
  r2: z.number().optional(),
  r3: z.number().optional(),
  qf: z.number().optional(),
  sf: z.number().optional(),
  f: z.number().optional(),
  w: z.number().optional(),
});

const TournamentSchema = z.object({
  user_id: z.string(),
  name: z.string().min(1),
  location: z.string().min(1),
  country: z.string().min(1),
  currency: z.string().length(3),
  start_date: z.string(),
  end_date: z.string(),
  duration_days: z.number().int().min(1),
  entry_fee: z.number().min(0).default(0),
  flight_cost: z.number().min(0).default(0),
  accommodation_total: z.number().min(0).default(0),
  daily_spending_cap: z.number().min(0).default(0),
  coaching_cost: z.number().min(0).default(0),
  misc_cost: z.number().min(0).default(0),
  subsidy_by: z.string().nullable().default(null),
  subsidy_amount: z.number().min(0).default(0),
  subsidy_covers: z.enum(["flights", "accommodation", "full_expenses", "flat_stipend"]).nullable().default(null),
  sponsorship_allocated: z.number().min(0).default(0),
  prize_rounds: PrizeRoundsSchema,
});

async function toHomeCurrency(tournament: z.infer<typeof TournamentSchema>, home_currency: string) {
  if (tournament.currency === home_currency) return tournament;

  const rates = await fetchRates("USD");
  const from = tournament.currency;
  const to = home_currency;

  const convertField = (val: number) => convert(val, from, to, rates) ?? val;

  const convertedPrizeRounds: Record<string, number> = {};
  for (const [round, value] of Object.entries(tournament.prize_rounds)) {
    if (value !== undefined) convertedPrizeRounds[round] = convertField(value);
  }

  return {
    ...tournament,
    entry_fee: convertField(tournament.entry_fee),
    flight_cost: convertField(tournament.flight_cost),
    accommodation_total: convertField(tournament.accommodation_total),
    daily_spending_cap: convertField(tournament.daily_spending_cap),
    coaching_cost: convertField(tournament.coaching_cost),
    misc_cost: convertField(tournament.misc_cost),
    subsidy_amount: convertField(tournament.subsidy_amount),
    sponsorship_allocated: convertField(tournament.sponsorship_allocated),
    prize_rounds: convertedPrizeRounds,
  };
}

export async function GET(req: NextRequest) {
  const user_id = req.nextUrl.searchParams.get("user_id");
  if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  const tournaments = await db.tournament.findMany({
    where: { user_id },
    orderBy: { start_date: "asc" },
  });

  const user = await db.user.findUnique({ where: { id: user_id } });
  const home_currency = user?.home_currency ?? "USD";

  const withPnL = tournaments.map((t) => {
    const pnl = calculatePnL(t as Parameters<typeof calculatePnL>[0]);
    return { ...t, pnl, home_currency };
  });

  return NextResponse.json(withPnL);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = TournamentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const user = await db.user.findUnique({ where: { id: parsed.data.user_id } });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const converted = await toHomeCurrency(parsed.data, user.home_currency);

  const tournament = await db.tournament.create({
    data: {
      ...converted,
      start_date: new Date(converted.start_date),
      end_date: new Date(converted.end_date),
    },
  });

  const pnl = calculatePnL(tournament as Parameters<typeof calculatePnL>[0]);
  return NextResponse.json({ ...tournament, pnl }, { status: 201 });
}
