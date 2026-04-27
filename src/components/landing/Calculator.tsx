import { Plus, Minus, Equal } from "lucide-react";

const rows = [
  { label: "Prize money", sub: "Quarterfinal · ATP 1000", value: "+$215,000", positive: true },
  { label: "Sponsorship allocation", sub: "Per-event apparel deal", value: "+$8,000", positive: true },
  { label: "Federation subsidy", sub: "Flights covered", value: "+$2,400", positive: true },
  { label: "Flights", sub: "JFK → CDG · business", value: "−$3,920", positive: false },
  { label: "Accommodation", sub: "12 nights · hotel", value: "−$5,640", positive: false },
  { label: "Daily expenses", sub: "€185/day × 12", value: "−$2,420", positive: false },
  { label: "Coaching & physio on-site", sub: "Coach + physio retainer", value: "−$4,200", positive: false },
  { label: "Entry fee + gear", sub: "Strings, restrings, misc", value: "−$820", positive: false },
];

const Calculator = () => {
  return (
    <section id="calculator" className="border-b border-border/60 bg-secondary/30">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-20">
          <div className="lg:pt-8">
            <div className="mb-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              The hero feature
            </div>
            <h2 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">
              Every dollar in.{" "}
              <span className="italic text-muted-foreground">Every dollar out.</span>{" "}
              One honest number.
            </h2>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground md:text-lg">
              Plug in your tournament details, prize structure, and expenses. AthleteTracker calculates the
              full P&amp;L per scenario in your home currency — instantly.
            </p>

            <ul className="mt-8 space-y-3">
              {[
                "Sport-specific expense categories",
                "Live FX, dual-currency display",
                "Subsidy & sponsor income netted in",
                "Export PDF for federation reporting",
              ].map((t) => (
                <li key={t} className="flex items-center gap-3 text-sm text-foreground">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-profit-soft">
                    <span className="h-1.5 w-1.5 rounded-full bg-profit" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_16px_40px_-20px_rgba(0,0,0,0.10)]">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <div className="text-sm font-semibold tracking-tight">Madrid Open · 2026</div>
                <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">QF scenario · USD / EUR</div>
              </div>
              <span className="rounded-md border border-border bg-background px-2 py-1 font-mono text-[10px] font-medium text-muted-foreground">
                LIVE
              </span>
            </div>

            <div className="divide-y divide-border">
              {rows.map((r) => (
                <div key={r.label} className="flex items-center justify-between px-6 py-3.5">
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1 flex h-4 w-4 items-center justify-center rounded-sm ${
                        r.positive ? "bg-profit-soft" : "bg-loss-soft"
                      }`}
                    >
                      {r.positive ? (
                        <Plus className="h-2.5 w-2.5 text-profit" strokeWidth={3} />
                      ) : (
                        <Minus className="h-2.5 w-2.5 text-loss" strokeWidth={3} />
                      )}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-foreground">{r.label}</div>
                      <div className="text-xs text-muted-foreground">{r.sub}</div>
                    </div>
                  </div>
                  <div
                    className={`font-mono text-sm font-medium tabular ${
                      r.positive ? "text-profit" : "text-foreground"
                    }`}
                  >
                    {r.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-border bg-secondary/40 px-6 py-5">
              <div className="flex items-center gap-2">
                <Equal className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Net result
                </span>
              </div>
              <div className="text-right">
                <div className="font-mono text-2xl font-semibold tabular text-profit">+$208,400</div>
                <div className="font-mono text-[11px] text-muted-foreground">+€194,856 EUR</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Calculator;
