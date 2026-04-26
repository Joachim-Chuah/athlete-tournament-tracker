import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney, formatDate } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// Placeholder — will be replaced with real DB fetch
const MOCK_TOURNAMENT = {
  id: "1",
  name: "Rome Open 2026",
  location: "Rome, Italy",
  start_date: "2026-05-05",
  end_date: "2026-05-11",
  duration_days: 7,
  currency: "EUR",
  home_currency: "USD",
  entry_fee: 250,
  flight_cost: 1200,
  accommodation_total: 1400,
  daily_spending_cap: 150,
  coaching_cost: 600,
  misc_cost: 200,
  subsidy_amount: 0,
  subsidy_covers: null,
  sponsorship_allocated: 500,
  break_even_round: "QF",
  scenarios: [
    { scenario: "worst", round: "R1", prize_money: 500, net_result: -3150, profitable: false },
    { scenario: "realistic", round: "QF", prize_money: 4800, net_result: 1150, profitable: true },
    { scenario: "best", round: "Winner", prize_money: 25000, net_result: 21350, profitable: true },
  ],
  total_expenses: 3650,
};

type ScenarioRowProps = {
  scenario: string;
  round: string;
  prize_money: number;
  net_result: number;
  profitable: boolean;
  currency: string;
  is_break_even?: boolean;
};

function ScenarioRow({ scenario, round, prize_money, net_result, profitable, currency, is_break_even }: ScenarioRowProps) {
  const Icon = profitable ? TrendingUp : net_result === 0 ? Minus : TrendingDown;
  const labels: Record<string, string> = { worst: "Worst Case", realistic: "Realistic", best: "Best Case" };

  return (
    <div className={`rounded-xl p-4 border ${profitable ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${profitable ? "text-emerald-400" : "text-red-400"}`} />
          <span className="text-sm font-medium text-white">{labels[scenario]}</span>
          {is_break_even && <Badge variant="warning">Break-even</Badge>}
        </div>
        <span className="text-xs text-zinc-500">{round}</span>
      </div>
      <div className="flex items-end justify-between mt-1">
        <div>
          <p className="text-xs text-zinc-500">Prize</p>
          <p className="text-sm text-zinc-300">{formatMoney(prize_money, currency)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500">Net result</p>
          <p className={`text-xl font-bold ${profitable ? "text-emerald-400" : "text-red-400"}`}>
            {net_result >= 0 ? "+" : ""}{formatMoney(net_result, "USD")}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TournamentDetailPage() {
  const t = MOCK_TOURNAMENT;

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-white">{t.name}</h1>
          <p className="text-sm text-zinc-500">
            {t.location} · {formatDate(t.start_date)} – {formatDate(t.end_date)}
          </p>
        </div>

        {/* P&L Scenarios — hero section */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-zinc-400">P&L Scenarios</h2>
          <div className="space-y-3">
            {t.scenarios.map((s) => (
              <ScenarioRow
                key={s.scenario}
                {...s}
                currency={t.currency}
                is_break_even={s.round === t.break_even_round}
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Break-even: reach <span className="font-medium text-zinc-300">{t.break_even_round}</span> to cover all costs
          </p>
        </section>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
            <span className="text-sm font-semibold text-white">{formatMoney(t.total_expenses, "USD")}</span>
          </CardHeader>
          <div className="space-y-2">
            {[
              { label: "Flights & Transport", value: t.flight_cost },
              { label: "Accommodation", value: t.accommodation_total },
              { label: `Daily (${formatMoney(t.daily_spending_cap, "USD")}/day × ${t.duration_days}d)`, value: t.daily_spending_cap * t.duration_days },
              { label: "Coaching / Physio", value: t.coaching_cost },
              { label: "Entry Fee", value: t.entry_fee },
              { label: "Misc", value: t.misc_cost },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">{label}</span>
                <span className="text-white">{formatMoney(value, "USD")}</span>
              </div>
            ))}
            {t.sponsorship_allocated > 0 && (
              <div className="flex items-center justify-between text-sm border-t border-zinc-800 pt-2 mt-2">
                <span className="text-emerald-400">Sponsorship income</span>
                <span className="text-emerald-400">+{formatMoney(t.sponsorship_allocated, "USD")}</span>
              </div>
            )}
          </div>
        </Card>

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1">Edit</Button>
          <Button variant="secondary" className="flex-1">Export PDF</Button>
        </div>
      </div>
    </AppShell>
  );
}
