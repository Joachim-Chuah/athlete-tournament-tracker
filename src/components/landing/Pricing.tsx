import { Check } from "lucide-react";

const tiers = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    desc: "For trying it out on a couple of events.",
    features: ["2 tournaments / month", "Basic P&L tracking", "Single currency", "Mobile + web"],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Pro",
    price: "$15",
    cadence: "per month",
    desc: "Everything you need for a full season on tour.",
    features: [
      "Unlimited tournaments",
      "Multi-currency, live FX",
      "Scenario modeling per round",
      "Subsidy & sponsor tracking",
      "PDF export for federations",
    ],
    cta: "Start 14-day trial",
    featured: true,
  },
  {
    name: "Coach",
    price: "$49",
    cadence: "per month",
    desc: "Manage finances for a stable of athletes.",
    features: ["Up to 10 athletes", "Team dashboard", "Per-athlete P&L", "Roll-up reporting"],
    cta: "Talk to us",
    featured: false,
  },
];

const Pricing = () => {
  return (
    <section id="pricing" className="border-b border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Pricing
          </div>
          <h2 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">
            One smart booking decision{" "}
            <span className="italic text-muted-foreground">pays for the year.</span>
          </h2>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`relative flex flex-col rounded-2xl border p-7 ${
                t.featured
                  ? "border-primary bg-card shadow-[0_24px_48px_-24px_rgba(0,0,0,0.15)]"
                  : "border-border bg-card"
              }`}
            >
              {t.featured && (
                <span className="absolute -top-2.5 left-7 rounded-full bg-primary px-3 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-primary-foreground">
                  Most popular
                </span>
              )}
              <div>
                <h3 className="text-base font-semibold tracking-tight">{t.name}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{t.desc}</p>
              </div>

              <div className="mt-6 flex items-baseline gap-2">
                <span className="font-serif text-5xl tracking-tight">{t.price}</span>
                <span className="text-sm text-muted-foreground">{t.cadence}</span>
              </div>

              <ul className="mt-7 flex-1 space-y-3">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-profit" strokeWidth={2.5} />
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href="#cta"
                className={`mt-8 inline-flex h-11 items-center justify-center rounded-full text-sm font-medium transition-opacity ${
                  t.featured
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "border border-border bg-background text-foreground hover:bg-secondary"
                }`}
              >
                {t.cta}
              </a>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Academy and federation plans available.{" "}
          <a href="#cta" className="underline underline-offset-2 hover:text-foreground">
            Get in touch.
          </a>
        </p>
      </div>
    </section>
  );
};

export default Pricing;
