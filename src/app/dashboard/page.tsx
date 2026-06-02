"use client";

import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardTitle, CardValue } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney, formatDate } from "@/lib/utils";
import { api, type TournamentWithPnL } from "@/lib/api";
import { useUser } from "@/context/user";
import Link from "next/link";
import { TrendingUp, TrendingDown, Plus, AlertTriangle, Loader2, ChevronRight, MapPin, Calendar } from "lucide-react";

function StatCard({ label, value, sub, color = "default" }: { label: string; value: string; sub?: string; color?: string }) {
  const colorClass = color === "green" ? "text-profit" : color === "red" ? "text-loss" : "text-foreground";
  return (
    <Card className="flex flex-col gap-1">
      <CardTitle>{label}</CardTitle>
      <CardValue className={`mt-2 ${colorClass}`}>{value}</CardValue>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </Card>
  );
}

function RunwayBanner({ savings, avgSpend, currency }: { savings: number; avgSpend: number; currency: string }) {
  const runway = avgSpend > 0 ? Math.floor(savings / avgSpend) : null;

  if (runway === null) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-profit/20 bg-profit-soft p-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-profit/15">
          <TrendingUp className="size-4 text-profit" />
        </div>
        <div>
          <p className="text-sm font-medium text-profit">Profitable on average</p>
          <p className="text-xs text-muted-foreground mt-0.5">Your tournaments are generating positive returns.</p>
        </div>
      </div>
    );
  }

  const warn = runway <= 3;
  const Icon = warn ? AlertTriangle : TrendingDown;

  return (
    <div className={`flex items-center gap-3 rounded-xl border p-4 ${warn ? "border-warning/20 bg-warning/5" : "border-border bg-secondary/50"}`}>
      <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${warn ? "bg-warning/15" : "bg-secondary"}`}>
        <Icon className={`size-4 ${warn ? "text-warning" : "text-muted-foreground"}`} />
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${warn ? "text-warning" : "text-foreground"}`}>
          Savings runway: <strong>{runway} tournament{runway !== 1 ? "s" : ""}</strong>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
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
            <span className="w-14 text-right text-xs text-muted-foreground shrink-0">{label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-secondary relative overflow-hidden">
              <div
                className={`absolute top-0 h-full rounded-full ${positive ? "bg-profit left-0" : "bg-loss right-0"}`}
                style={{ width: `${toWidth(value)}%` }}
              />
            </div>
            <span className={`w-20 text-right text-xs font-medium tabular shrink-0 ${positive ? "text-profit" : "text-loss"}`}>
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
      <Card className="group cursor-pointer transition-colors hover:bg-secondary/40">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">{t.name}</h3>
              <Badge variant={profitable ? "profit" : "loss"}>
                {realistic ? `${realistic.net_result >= 0 ? "+" : ""}${formatMoney(realistic.net_result, homeCurrency)}` : "—"}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" />{t.location}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="size-3" />{formatDate(t.start_date)}
              </span>
            </div>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors mt-0.5" />
        </div>

        <ScenarioBar
          worst={worst?.net_result ?? 0}
          realistic={realistic?.net_result ?? 0}
          best={best?.net_result ?? 0}
          currency={homeCurrency}
        />

        {break_even_round && (
          <p className="mt-3 text-xs text-muted-foreground">
            Break-even at <span className="font-medium uppercase text-foreground">{break_even_round}</span>
          </p>
        )}
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useUser();

  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ["tournaments", user?.id],
    queryFn: () => api.tournaments.list(user!.id),
    enabled: !!user,
  });

  if (!user) {
    return (
      <AppShell>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
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
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Welcome back</p>
            <h1 className="mt-1 font-serif text-2xl font-bold text-foreground">{user.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{currentYear} Season Overview</p>
          </div>
          <Link href="/tournaments/new">
            <Button size="sm">
              <Plus className="size-3.5" /> New Tournament
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
            <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">All Tournaments</h2>
            <span className="text-xs text-muted-foreground">{tournaments.length} total</span>
          </div>

          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : tournaments.length === 0 ? (
            <Card className="py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-secondary mx-auto mb-4">
                <Plus className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No tournaments yet</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Add your first tournament to see your P&L projection.</p>
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
