import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const ProfileSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  home_country: z.string().min(1),
  home_currency: z.string().length(3),
  sport: z.enum(["tennis", "athletics", "combat", "golf", "other"]),
  monthly_income: z.number().min(0),
  savings_balance: z.number().min(0),
  monthly_sponsorship: z.number().min(0),
});

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const user = await db.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json(null, { status: 200 });
  return NextResponse.json(user);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = ProfileSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const user = await db.user.upsert({
    where: { email: parsed.data.email },
    update: parsed.data,
    create: parsed.data,
  });

  return NextResponse.json(user, { status: 201 });
}
