import { Globe, Trophy, Coins, Calendar, Calculator, HandCoins } from "lucide-react";

const features = [
  {
    icon: Trophy,
    title: "Prize scenario modeling",
    desc: "Worst case, realistic, best case. See net profit per round before you commit to the trip.",
  },
  {
    icon: Globe,
    title: "Multi-currency, live rates",
    desc: "Home currency vs. tournament currency, side by side. Volatility flagged on long trips.",
  },
  {
    icon: HandCoins,
    title: "Subsidy & sponsorship netting",
    desc: "Federation covering flights? Sponsor on per-event? Auto-deducted from your true P&L.",
  },
  {
    icon: Calendar,
    title: "Smart spending plan",
    desc: "Daily budget tuned to destination cost-of-living. Stay on track without thinking about it.",
  },
  {
    icon: Calculator,
    title: "Break-even round",
    desc: "Instantly know which round you must reach to walk away with money in your pocket.",
  },
  {
    icon: Coins,
    title: "Runway calculator",
    desc: "How many tournaments can you afford before savings run dry? See it on the dashboard.",
  },
];

const Features = () => {
  return (
    <section id="features" className="border-b border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="max-w-2xl">
          <div className="mb-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Features
          </div>
          <h2 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">
            Everything you need to{" "}
            <span className="italic text-muted-foreground">decide with confidence.</span>
          </h2>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="group bg-card p-7 transition-colors hover:bg-secondary/40">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-secondary/60">
                <f.icon className="h-4 w-4 text-foreground" strokeWidth={1.75} />
              </div>
              <h3 className="mt-5 text-base font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
