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
import { TrendingUp, TrendingDown, Plus, AlertTriangle, Loader2, ChevronRight, MapPin, Calendar } from "lucide-react";

function StatCard({ label, value, sub, color = "white" }: { label: string; value: string; sub?: string; color?: string }) {
  const colorClass = color === "green" ? "text-emerald-400" : color === "red" ? "text-red-400" : "text-white";
  return (
    <Card className="flex flex-col gap-1">
      <CardTitle>{label}</CardTitle>
      <CardValue className={`mt-2 ${colorClass}`}>{value}</CardValue>
      {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
    </Card>
  );
}

function RunwayBanner({ savings, avgSpend, currency }: { savings: number; avgSpend: number; currency: string }) {
  const runway = avgSpend > 0 ? Math.floor(savings / avgSpend) : null;

  if (runway === null) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-emerald-300">Profitable on average</p>
          <p className="text-xs text-zinc-500 mt-0.5">Your tournaments are generating positive returns.</p>
        </div>
      </div>
    );
  }

  const warn = runway <= 3;
  const Icon = warn ? AlertTriangle : TrendingDown;
  const borderColor = warn ? "border-amber-500/20 bg-amber-500/5" : "border-zinc-700/60 bg-zinc-900/40";
  const iconBg = warn ? "bg-amber-500/15" : "bg-zinc-800";
  const iconColor = warn ? "text-amber-400" : "text-zinc-400";
  const textColor = warn ? "text-amber-300" : "text-zinc-200";

  return (
    <div className={`flex items-center gap-3 rounded-xl border p-4 ${borderColor}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${textColor}`}>
          Savings runway: <strong>{runway} tournament{runway !== 1 ? "s" : ""}</strong>
        </p>
        <p className="text-xs text-zinc-500 mt-0.5">
          Avg. loss of {formatMoney(avgSpend, currency)}/tournament · {formatMoney(savings, currency)} remaining
        </p>
      </div>
    </div>
  );
}

function ScenarioBar({ worst, realistic, best, currency }: { worst: number; realistic: number; best: number; currency: string }) {
  const max = Math.max(Math.abs(worst), Math.abs(best), 1);
  const toWidth = (v: number) => Math.min(100, (Math.abs(v) / max) * 100);

  return (
    <div className="mt-3 space-y-2">
      {[
        { label: "Worst", value: worst },
        { label: "Realistic", value: realistic },
        { label: "Best", value: best },
      ].map(({ label, value }) => {
        const positive = value >= 0;
        return (
          <div key={label} className="flex items-center gap-3">
            <span className="w-14 text-right text-xs text-zinc-500 shrink-0">{label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-zinc-800 relative overflow-hidden">
              <div
                className={`absolute top-0 h-full rounded-full ${positive ? "bg-emerald-500 left-0" : "bg-red-500 right-0"}`}
                style={{ width: `${toWidth(value)}%` }}
              />
            </div>
            <span className={`w-20 text-right text-xs font-medium tabular-nums shrink-0 ${positive ? "text-emerald-400" : "text-red-400"}`}>
              {positive ? "+" : ""}{formatMoney(value, currency)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TournamentCard({ t, homeCurrency }: { t: TournamentWithPnL; homeCurrency: string }) {
  const { scenarios, break_even_round } = t.pnl;
  const worst = scenarios.find((s) => s.scenario === "worst");
  const realistic = scenarios.find((s) => s.scenario === "realistic");
  const best = scenarios.find((s) => s.scenario === "best");
  const profitable = realistic ? realistic.net_result >= 0 : false;

  return (
    <Link href={`/tournaments/${t.id}`}>
      <Card className="group cursor-pointer transition-all duration-200 hover:border-zinc-600/60 hover:bg-zinc-900/60">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white truncate">{t.name}</h3>
              <Badge variant={profitable ? "profit" : "loss"}>
                {realistic ? `${realistic.net_result >= 0 ? "+" : ""}${formatMoney(realistic.net_result, homeCurrency)}` : "—"}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-xs text-zinc-500">
                <MapPin className="h-3 w-3" />{t.location}
              </span>
              <span className="flex items-center gap-1 text-xs text-zinc-500">
                <Calendar className="h-3 w-3" />{formatDate(t.start_date)}
              </span>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600 group-hover:text-zinc-400 transition-colors mt-0.5" />
        </div>

        <ScenarioBar
          worst={worst?.net_result ?? 0}
          realistic={realistic?.net_result ?? 0}
          best={best?.net_result ?? 0}
          currency={homeCurrency}
        />

        {break_even_round && (
          <p className="mt-3 text-xs text-zinc-600">
            Break-even at <span className="font-medium uppercase text-zinc-400">{break_even_round}</span>
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
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500/50" />
        </div>
      </AppShell>
    );
  }

  const currentYear = new Date().getFullYear();
  const currency = user.home_currency;

  const ytd = tournaments.filter((t) => new Date(t.start_date).getFullYear() === currentYear);
  const ytd_earnings = ytd.reduce((sum, t) => {
    const r = t.pnl.scenarios.find((s) => s.scenario === "realistic");
    return sum + (r?.prize_money ?? 0) + t.sponsorship_allocated;
  }, 0);
  const ytd_expenses = ytd.reduce((sum, t) => sum + t.pnl.total_expenses, 0);
  const ytd_net = ytd_earnings - ytd_expenses;

  const losses = tournaments.map((t) => {
    const r = t.pnl.scenarios.find((s) => s.scenario === "realistic");
    return r ? -Math.min(0, r.net_result) : 0;
  }).filter((v) => v > 0);
  const avg_net_spend = losses.length ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500">Welcome back</p>
            <h1 className="mt-1 text-2xl font-bold text-white">{user.name}</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{currentYear} Season Overview</p>
          </div>
          <Link href="/tournaments/new">
            <Button size="sm">
              <Plus className="h-3.5 w-3.5" /> New Tournament
            </Button>
          </Link>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="YTD Earnings" value={formatMoney(ytd_earnings, currency)} color="green" />
          <StatCard label="YTD Expenses" value={formatMoney(ytd_expenses, currency)} color="red" />
          <StatCard
            label="Net Result"
            value={`${ytd_net >= 0 ? "+" : ""}${formatMoney(ytd_net, currency)}`}
            color={ytd_net >= 0 ? "green" : "red"}
            sub={ytd_net >= 0 ? "Profitable season" : "In the red"}
          />
          <StatCard
            label="Tournaments"
            value={String(tournaments.length)}
            sub={`${ytd.length} this year`}
          />
        </div>

        {/* Runway */}
        <RunwayBanner savings={user.savings_balance} avgSpend={avg_net_spend} currency={currency} />

        {/* Tournament list */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">All Tournaments</h2>
            <span className="text-xs text-zinc-600">{tournaments.length} total</span>
          </div>

          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-500/50" />
            </div>
          ) : tournaments.length === 0 ? (
            <Card className="py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800 mx-auto mb-4">
                <Plus className="h-5 w-5 text-zinc-500" />
              </div>
              <p className="text-sm font-medium text-zinc-300">No tournaments yet</p>
              <p className="text-xs text-zinc-600 mt-1 mb-4">Add your first tournament to see your P&L projection.</p>
              <Link href="/tournaments/new">
                <Button size="sm">Add Tournament</Button>
              </Link>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
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
