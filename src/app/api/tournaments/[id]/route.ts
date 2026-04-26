import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { calculatePnL } from "@/server/utils/pnl.js";

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  currency: z.string().length(3).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  duration_days: z.number().int().min(1).optional(),
  entry_fee: z.number().min(0).optional(),
  flight_cost: z.number().min(0).optional(),
  accommodation_total: z.number().min(0).optional(),
  daily_spending_cap: z.number().min(0).optional(),
  coaching_cost: z.number().min(0).optional(),
  misc_cost: z.number().min(0).optional(),
  subsidy_by: z.string().nullable().optional(),
  subsidy_amount: z.number().min(0).optional(),
  subsidy_covers: z.enum(["flights", "accommodation", "full_expenses", "flat_stipend"]).nullable().optional(),
  sponsorship_allocated: z.number().min(0).optional(),
  prize_rounds: z.record(z.string(), z.number()).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const tournament = await db.tournament.findUnique({ where: { id } });
  if (!tournament) return NextResponse.json({ error: "not found" }, { status: 404 });

  const pnl = calculatePnL(tournament as Parameters<typeof calculatePnL>[0]);
  return NextResponse.json({ ...tournament, pnl });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const existing = await db.tournament.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.start_date) data.start_date = new Date(parsed.data.start_date);
  if (parsed.data.end_date) data.end_date = new Date(parsed.data.end_date);

  const tournament = await db.tournament.update({ where: { id }, data });
  const pnl = calculatePnL(tournament as Parameters<typeof calculatePnL>[0]);
  return NextResponse.json({ ...tournament, pnl });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await db.tournament.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
