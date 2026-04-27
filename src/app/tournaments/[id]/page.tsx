"use client";

import { use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney, formatDate } from "@/lib/utils";
import { useUser } from "@/context/user";
import { api } from "@/lib/api";
import { TrendingUp, TrendingDown, Minus, Loader2, Trash2 } from "lucide-react";
import type { ScenarioResult } from "@/types";

function ScenarioRow({
  s,
  currency,
  homeCurrency,
  isBreakEven,
}: {
  s: ScenarioResult;
  currency: string;
  homeCurrency: string;
  isBreakEven: boolean;
}) {
  const Icon = s.profitable ? TrendingUp : s.net_result === 0 ? Minus : TrendingDown;
  const labels: Record<string, string> = { worst: "Worst Case", realistic: "Realistic", best: "Best Case" };

  return (
    <div className={`rounded-xl p-4 border ${s.profitable ? "border-profit/20 bg-profit-soft" : "border-loss/20 bg-loss-soft"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${s.profitable ? "text-profit" : "text-loss"}`} />
          <span className="text-sm font-medium text-foreground">{labels[s.scenario]}</span>
          {isBreakEven && <Badge variant="warning">Break-even</Badge>}
        </div>
        <span className="font-mono text-xs uppercase text-muted-foreground">{s.round}</span>
      </div>
      <div className="flex items-end justify-between mt-1">
        <div>
          <p className="text-xs text-muted-foreground">Prize ({currency})</p>
          <p className="text-sm text-foreground">{formatMoney(s.prize_money, currency)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Net ({homeCurrency})</p>
          <p className={`font-mono text-xl font-bold tabular ${s.profitable ? "text-profit" : "text-loss"}`}>
            {s.net_result >= 0 ? "+" : ""}{formatMoney(s.net_result, homeCurrency)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: tournament, isLoading } = useQuery({
    queryKey: ["tournament", id],
    queryFn: () => api.tournaments.get(id),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.tournaments.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      router.push("/dashboard");
    },
  });

  if (isLoading || !tournament) {
    return (
      <AppShell>
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  const { pnl } = tournament;
  const homeCurrency = user?.home_currency ?? tournament.home_currency ?? "USD";

  const expenses = [
    { label: "Flights & Transport", value: tournament.flight_cost },
    { label: "Accommodation", value: tournament.accommodation_total },
    {
      label: `Daily (${formatMoney(tournament.daily_spending_cap, homeCurrency)}/day × ${tournament.duration_days}d)`,
      value: tournament.daily_spending_cap * tournament.duration_days,
    },
    { label: "Coaching / Physio", value: tournament.coaching_cost },
    { label: "Entry Fee", value: tournament.entry_fee },
    { label: "Misc", value: tournament.misc_cost },
  ];

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <h1 className="font-serif text-xl font-semibold text-foreground">{tournament.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {tournament.location} · {formatDate(tournament.start_date)} – {formatDate(tournament.end_date)}
          </p>
        </div>

        <section>
          <h2 className="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground">P&L Scenarios</h2>
          {pnl.scenarios.length === 0 ? (
            <Card className="text-center py-8">
              <p className="text-sm text-muted-foreground">No prize rounds entered — edit the tournament to add them.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {pnl.scenarios.map((s) => (
                <ScenarioRow
                  key={s.scenario}
                  s={s}
                  currency={tournament.currency}
                  homeCurrency={homeCurrency}
                  isBreakEven={s.round === pnl.break_even_round}
                />
              ))}
            </div>
          )}
          {pnl.break_even_round && (
            <p className="mt-3 text-xs text-muted-foreground">
              Break-even: reach <span className="font-medium uppercase text-foreground">{pnl.break_even_round}</span> to cover all costs
            </p>
          )}
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
            <span className="font-mono text-sm font-semibold text-foreground tabular">{formatMoney(pnl.total_expenses, homeCurrency)}</span>
          </CardHeader>
          <div className="space-y-2">
            {expenses.map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono text-foreground tabular">{formatMoney(value, homeCurrency)}</span>
              </div>
            ))}
            {tournament.sponsorship_allocated > 0 && (
              <div className="flex items-center justify-between text-sm border-t border-border pt-2 mt-2">
                <span className="text-profit">Sponsorship income</span>
                <span className="font-mono text-profit tabular">+{formatMoney(tournament.sponsorship_allocated, homeCurrency)}</span>
              </div>
            )}
            {tournament.subsidy_amount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-profit">Subsidy ({tournament.subsidy_covers?.replace("_", " ")})</span>
                <span className="font-mono text-profit tabular">+{formatMoney(tournament.subsidy_amount, homeCurrency)}</span>
              </div>
            )}
          </div>
        </Card>

        <div className="flex gap-3">
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => {
              if (confirm("Delete this tournament?")) deleteMutation.mutate();
            }}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
