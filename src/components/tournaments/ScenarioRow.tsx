import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { ScenarioResult } from "@/types";

const scenarioLabels: Record<ScenarioResult["scenario"], string> = {
  worst: "Worst Case",
  realistic: "Realistic",
  best: "Best Case",
};

export function ScenarioRow({
  s,
  currency,
  homeCurrency,
  isBreakEven,
  convertedCurrency,
  conversionRate,
  conversionLoading,
}: {
  s: ScenarioResult;
  currency: string;
  homeCurrency: string;
  isBreakEven: boolean;
  convertedCurrency?: string;
  conversionRate?: number | null;
  conversionLoading?: boolean;
}) {
  const Icon = s.profitable ? TrendingUp : s.net_result === 0 ? Minus : TrendingDown;
  const showConverted = Boolean(convertedCurrency && convertedCurrency !== currency);
  const convertedGrossPrize = showConverted && conversionRate ? s.prize_money * conversionRate : null;
  const convertedAfterTaxPrize = showConverted && conversionRate ? s.prize_money_after_tax * conversionRate : null;
  const convertedNet = showConverted && conversionRate ? s.net_result * conversionRate : null;
  const signedNet = `${s.net_result >= 0 ? "+" : ""}${formatMoney(s.net_result, homeCurrency)}`;

  return (
    <div className={`rounded-xl p-4 border ${s.profitable ? "border-profit/20 bg-profit-soft" : "border-loss/20 bg-loss-soft"}`}>
      <div className="flex items-center justify-between mb-2 gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className={`h-4 w-4 shrink-0 ${s.profitable ? "text-profit" : "text-loss"}`} />
          <span className="truncate text-sm font-medium text-foreground">{scenarioLabels[s.scenario]}</span>
          {isBreakEven && <Badge variant="warning">Break-even</Badge>}
        </div>
        <span className="shrink-0 font-mono text-xs uppercase text-muted-foreground">{s.round}</span>
      </div>
      <div className="flex items-end justify-between gap-3 mt-1">
        <div>
          <p className="text-xs text-muted-foreground">Gross prize ({currency})</p>
          <p className="text-sm text-foreground">{formatMoney(s.prize_money, currency)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            After tax: <span className="text-foreground">{formatMoney(s.prize_money_after_tax, currency)}</span>
          </p>
          {showConverted && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {conversionLoading
                ? "FX..."
                : convertedGrossPrize !== null && convertedAfterTaxPrize !== null
                  ? `≈ ${formatMoney(convertedGrossPrize, convertedCurrency ?? currency)} gross · ${formatMoney(convertedAfterTaxPrize, convertedCurrency ?? currency)} after tax`
                  : "FX unavailable"}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Net ({homeCurrency})</p>
          <p className={`font-mono text-xl font-bold tabular ${s.profitable ? "text-profit" : "text-loss"}`}>
            {signedNet}
          </p>
          {showConverted && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {conversionLoading
                ? "FX..."
                : convertedNet !== null
                  ? `≈ ${convertedNet >= 0 ? "+" : ""}${formatMoney(convertedNet, convertedCurrency ?? currency)}`
                  : "FX unavailable"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
