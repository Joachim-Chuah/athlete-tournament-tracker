import { ArrowUpRight, ArrowDown, ArrowUp } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-profit opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-profit" />
            </span>
            Built by an athlete, for athletes
          </div>

          <h1 className="text-balance font-bold text-5xl leading-[1.05] tracking-tight md:text-7xl">
            Know before you go.{" "}
            <span className="italic text-muted-foreground">Profit from every tournament.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-balance text-base text-muted-foreground md:text-lg">
            The financial planner built for professional athletes. Model prize money scenarios, net subsidies,
            and see your true P&amp;L in your home currency — before you book the flight.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#cta"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Try the calculator
              <ArrowUpRight className="h-4 w-4" />
            </a>
            <a
              href="#features"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-background px-6 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              See how it works
            </a>
          </div>

          <p className="mt-5 text-xs text-muted-foreground">
            Free for 2 tournaments per month · No credit card required
          </p>
        </div>

        {/* Hero P&L preview card */}
        <div className="relative mx-auto mt-20 max-w-4xl">
          <div className="absolute -inset-x-8 -top-8 -bottom-8 rounded-3xl bg-gradient-to-b from-primary/5 to-transparent blur-2xl" />
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_48px_-24px_rgba(0,0,0,0.12)]">
            {/* Window chrome */}
            <div className="flex items-center justify-between border-b border-border bg-secondary/50 px-5 py-3">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-border" />
                <div className="h-2.5 w-2.5 rounded-full bg-border" />
                <div className="h-2.5 w-2.5 rounded-full bg-border" />
              </div>
              <div className="rounded-md border border-border bg-background px-3 py-0.5 font-mono text-[11px] text-muted-foreground">
                roland-garros · jun 2026
              </div>
              <div className="w-12" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3">
              {/* Worst */}
              <div className="border-b border-border p-6 md:border-b-0 md:border-r">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Worst case
                  </span>
                  <span className="rounded-md bg-loss-soft px-1.5 py-0.5 font-mono text-[10px] font-medium text-loss">
                    R1 LOSS
                  </span>
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <ArrowDown className="h-5 w-5 text-loss" />
                  <span className="font-mono text-3xl font-semibold tabular text-loss">−$4,820</span>
                </div>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground">−€4,510 EUR</div>
              </div>

              {/* Realistic */}
              <div className="relative border-b border-border bg-secondary/30 p-6 md:border-b-0 md:border-r">
                <div className="absolute inset-x-0 top-0 h-px bg-primary" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-foreground">
                    Realistic
                  </span>
                  <span className="rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
                    QF
                  </span>
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <ArrowUp className="h-5 w-5 text-profit" />
                  <span className="font-mono text-3xl font-semibold tabular text-profit">+$118,400</span>
                </div>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground">+€110,712 EUR</div>
              </div>

              {/* Best */}
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Best case
                  </span>
                  <span className="rounded-md bg-profit-soft px-1.5 py-0.5 font-mono text-[10px] font-medium text-profit">
                    TITLE
                  </span>
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <ArrowUp className="h-5 w-5 text-profit" />
                  <span className="font-mono text-3xl font-semibold tabular text-profit">+$2,194,180</span>
                </div>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground">+€2,051,300 EUR</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-secondary/30 px-6 py-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                Break-even round
                <span className="font-mono font-medium text-foreground">R2</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                Daily cap to hit target
                <span className="font-mono font-medium text-foreground">€185 / day</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                Subsidy applied
                <span className="font-mono font-medium text-foreground">−€2,400</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
