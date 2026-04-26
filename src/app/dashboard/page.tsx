"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardValue } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney, formatDate } from "@/lib/utils";
import { api, type TournamentWithPnL } from "@/lib/api";
import { useUser } from "@/context/user";
import Link from "next/link";
import { TrendingUp, TrendingDown, Plus, AlertTriangle, Loader2 } from "lucide-react";

function RunwayBanner({ savings, avgSpend, currency }: { savings: number; avgSpend: number; currency: string }) {
  const runway = avgSpend > 0 ? Math.floor(savings / avgSpend) : null;

  if (runway === null) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
        <TrendingUp className="h-5 w-5 shrink-0 text-emerald-400" />
        <p className="text-sm text-emerald-300">You&apos;re profitable on average — keep going.</p>
      </div>
    );
  }

  const warn = runway <= 3;
  const Icon = warn ? AlertTriangle : TrendingDown;

  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${warn ? "border-amber-500/30 bg-amber-500/10" : "border-zinc-700 bg-zinc-900"}`}>
      <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${warn ? "text-amber-400" : "text-zinc-400"}`} />
      <div>
        <p className={`text-sm font-medium ${warn ? "text-amber-300" : "text-zinc-200"}`}>
          Savings runway: <strong>{runway} tournaments</strong>
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          At avg. loss of {formatMoney(avgSpend, currency)}/tournament from {formatMoney(savings, currency)} savings
        </p>
      </div>
    </div>
  );
}

function TournamentCard({ t, homeCurrency }: { t: TournamentWithPnL; homeCurrency: string }) {
  const { scenarios, break_even_round } = t.pnl;
  const worst = scenarios.find((s) => s.scenario === "worst");
  const realistic = scenarios.find((s) => s.scenario === "realistic");
  const best = scenarios.find((s) => s.scenario === "best");

  return (
    <Link href={`/tournaments/${t.id}`}>
      <Card className="transition-colors hover:border-zinc-700 cursor-pointer">
        <CardHeader>
          <div>
            <p className="font-semibold text-white">{t.name}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{t.location} · {formatDate(t.start_date)}</p>
          </div>
          {realistic && (
            <Badge variant={realistic.net_result >= 0 ? "profit" : "loss"}>
              {realistic.net_result >= 0 ? "+" : ""}{formatMoney(realistic.net_result, homeCurrency)}
            </Badge>
          )}
        </CardHeader>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Worst", s: worst },
            { label: "Realistic", s: realistic },
            { label: "Best", s: best },
          ].map(({ label, s }) => (
            <div key={label} className="rounded-lg bg-zinc-800/60 py-2 px-1">
              <p className="text-xs text-zinc-500">{label}</p>
              <p className={`mt-0.5 text-sm font-semibold ${!s || s.net_result < 0 ? "text-red-400" : "text-emerald-400"}`}>
                {s ? `${s.net_result >= 0 ? "+" : ""}${formatMoney(s.net_result, homeCurrency)}` : "—"}
              </p>
            </div>
          ))}
        </div>

        {break_even_round && (
          <p className="mt-3 text-xs text-zinc-500">
            Break-even: reach <span className="font-medium text-zinc-300 uppercase">{break_even_round}</span> to cover costs
          </p>
        )}
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/profile");
  }, [loading, user, router]);

  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ["tournaments", user?.id],
    queryFn: () => api.tournaments.list(user!.id),
    enabled: !!user,
  });

  if (loading || !user) {
    return (
      <AppShell>
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      </AppShell>
    );
  }

  const currentYear = new Date().getFullYear();
  const yearTournaments = tournaments.filter(
    (t) => new Date(t.start_date).getFullYear() === currentYear
  );

  const ytd_earnings = yearTournaments.reduce((sum, t) => {
    const realistic = t.pnl.scenarios.find((s) => s.scenario === "realistic");
    return sum + (realistic?.prize_money ?? 0) + t.sponsorship_allocated;
  }, 0);

  const ytd_expenses = yearTournaments.reduce(
    (sum, t) => sum + t.pnl.total_expenses,
    0
  );
  const ytd_net = ytd_earnings - ytd_expenses;

  const completedLosses = tournaments
    .map((t) => {
      const realistic = t.pnl.scenarios.find((s) => s.scenario === "realistic");
      return realistic ? -Math.min(0, realistic.net_result) : 0;
    })
    .filter((v) => v > 0);

  const avg_net_spend =
    completedLosses.length > 0
      ? completedLosses.reduce((a, b) => a + b, 0) / completedLosses.length
      : 0;

  const currency = user.home_currency;

  return (
    <AppShell>
      <div className="space-y-6">
        <section>
          <h1 className="mb-4 text-lg font-semibold text-white">{currentYear} Season</h1>
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardTitle>YTD Earnings</CardTitle>
              <CardValue className="mt-1 text-emerald-400">{formatMoney(ytd_earnings, currency)}</CardValue>
            </Card>
            <Card>
              <CardTitle>YTD Expenses</CardTitle>
              <CardValue className="mt-1 text-red-400">{formatMoney(ytd_expenses, currency)}</CardValue>
            </Card>
          </div>
          <Card className="mt-3">
            <CardHeader>
              <CardTitle>Net Result</CardTitle>
              <Badge variant={ytd_net >= 0 ? "profit" : "loss"}>
                {ytd_net >= 0 ? "Profitable" : "In the red"}
              </Badge>
            </CardHeader>
            <CardValue className={ytd_net >= 0 ? "text-emerald-400" : "text-red-400"}>
              {ytd_net >= 0 ? "+" : ""}{formatMoney(ytd_net, currency)}
            </CardValue>
          </Card>
        </section>

        <RunwayBanner savings={user.savings_balance} avgSpend={avg_net_spend} currency={currency} />

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-white">Tournaments</h2>
            <Link href="/tournaments/new">
              <Button size="sm" variant="secondary">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
            </div>
          ) : tournaments.length === 0 ? (
            <Card className="text-center py-10">
              <p className="text-zinc-500 text-sm">No tournaments yet.</p>
              <Link href="/tournaments/new">
                <Button className="mt-4" size="sm">Add your first tournament</Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {tournaments.map((t) => (
                <TournamentCard key={t.id} t={t} homeCurrency={currency} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
