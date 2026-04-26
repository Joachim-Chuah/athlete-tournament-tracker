import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardValue } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney, formatDate } from "@/lib/utils";
import Link from "next/link";
import { TrendingUp, TrendingDown, Plus, AlertTriangle } from "lucide-react";

// Placeholder data — will be replaced with real DB calls
const MOCK_STATS = {
  ytd_earnings: 18400,
  ytd_expenses: 23100,
  ytd_net: -4700,
  savings_balance: 34000,
  avg_net_spend: 1567,
  currency: "USD",
};

const MOCK_TOURNAMENTS = [
  {
    id: "1",
    name: "Rome Open",
    location: "Rome, Italy",
    start_date: "2026-05-05",
    currency: "EUR",
    worst_net: -3200,
    realistic_net: 1800,
    best_net: 9400,
    break_even_round: "QF",
  },
  {
    id: "2",
    name: "Madrid Masters",
    location: "Madrid, Spain",
    start_date: "2026-04-28",
    currency: "EUR",
    worst_net: -4100,
    realistic_net: -800,
    best_net: 12000,
    break_even_round: "SF",
  },
];

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

  const variant = runway <= 3 ? "warning" : "neutral";
  const Icon = runway <= 3 ? AlertTriangle : TrendingDown;

  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${runway <= 3 ? "border-amber-500/30 bg-amber-500/10" : "border-zinc-700 bg-zinc-900"}`}>
      <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${runway <= 3 ? "text-amber-400" : "text-zinc-400"}`} />
      <div>
        <p className={`text-sm font-medium ${runway <= 3 ? "text-amber-300" : "text-zinc-200"}`}>
          Savings runway: <strong>{runway} tournaments</strong>
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          At avg. loss of {formatMoney(avgSpend, currency)}/tournament from {formatMoney(savings, currency)} savings
        </p>
      </div>
    </div>
  );
}

function TournamentCard({ t }: { t: typeof MOCK_TOURNAMENTS[0] }) {
  const realisticVariant = t.realistic_net >= 0 ? "profit" : "loss";
  return (
    <Link href={`/tournaments/${t.id}`}>
      <Card className="transition-colors hover:border-zinc-700 cursor-pointer">
        <CardHeader>
          <div>
            <p className="font-semibold text-white">{t.name}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{t.location} · {formatDate(t.start_date)}</p>
          </div>
          <Badge variant={realisticVariant}>
            {t.realistic_net >= 0 ? "+" : ""}{formatMoney(t.realistic_net, "USD")}
          </Badge>
        </CardHeader>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Worst", value: t.worst_net },
            { label: "Realistic", value: t.realistic_net },
            { label: "Best", value: t.best_net },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg bg-zinc-800/60 py-2 px-1">
              <p className="text-xs text-zinc-500">{label}</p>
              <p className={`mt-0.5 text-sm font-semibold ${value >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {value >= 0 ? "+" : ""}{formatMoney(value, "USD")}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-3 text-xs text-zinc-500">
          Break-even: reach <span className="font-medium text-zinc-300">{t.break_even_round}</span> to cover costs
        </p>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const { ytd_earnings, ytd_expenses, ytd_net, savings_balance, avg_net_spend, currency } = MOCK_STATS;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* YTD Stats */}
        <section>
          <h1 className="mb-4 text-lg font-semibold text-white">2026 Season</h1>
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

        {/* Runway */}
        <RunwayBanner savings={savings_balance} avgSpend={avg_net_spend} currency={currency} />

        {/* Upcoming Tournaments */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-white">Upcoming</h2>
            <Link href="/tournaments/new">
              <Button size="sm" variant="secondary">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {MOCK_TOURNAMENTS.map((t) => (
              <TournamentCard key={t.id} t={t} />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
