import { NextRequest, NextResponse } from "next/server";
import { searchTournaments } from "@/data/seed-tournaments";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const sport = req.nextUrl.searchParams.get("sport") ?? undefined;

  const results = searchTournaments(q, sport);
  return NextResponse.json(results);
}
