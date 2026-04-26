import { NextRequest, NextResponse } from "next/server";
import { fetchRates, convert } from "@/server/utils/currency.js";

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from")?.toUpperCase();
  const to = req.nextUrl.searchParams.get("to")?.toUpperCase();
  const amount = parseFloat(req.nextUrl.searchParams.get("amount") ?? "1");

  if (!from || !to) {
    return NextResponse.json({ error: "from and to currency codes required" }, { status: 400 });
  }

  const rates = await fetchRates("USD");
  const converted = convert(amount, from, to, rates);

  if (converted === null) {
    return NextResponse.json({ error: `Unknown currency: ${from} or ${to}` }, { status: 400 });
  }

  return NextResponse.json({ from, to, amount, converted, rate: converted / amount });
}
