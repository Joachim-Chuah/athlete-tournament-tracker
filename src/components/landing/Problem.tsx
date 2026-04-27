const Problem = () => {
  const stats = [
    { label: "Avg. cost per tournament week", value: "$3,200+", note: "flights, hotel, food, physio" },
    { label: "Athletes who lose money on tour", value: "61%", note: "outside the top 200" },
    { label: "Tools built for athlete finances", value: "0", note: "until now" },
  ];

  return (
    <section id="problem" className="border-b border-border/60 bg-secondary/30">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="grid gap-16 md:grid-cols-2 md:gap-24">
          <div>
            <div className="mb-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              The problem
            </div>
            <h2 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">
              Spreadsheets. Gut feeling.{" "}
              <span className="italic text-muted-foreground">Hoping you break even.</span>
            </h2>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground md:text-lg">
              Athletes deal with inconsistent prize money, unpredictable travel costs across multiple currencies,
              and subsidies that need to be factored in. There has never been a financial tool built specifically
              for this lifestyle.
            </p>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
              Until now, the answer to{" "}
              <em className="font-serif text-foreground">"will this tournament make me money?"</em> was
              a Notion doc and a prayer.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border">
            {stats.map((s) => (
              <div key={s.label} className="bg-card p-6">
                <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  {s.label}
                </div>
                <div className="mt-3 flex items-baseline gap-3">
                  <span className="font-serif text-5xl tracking-tight">{s.value}</span>
                  <span className="text-sm text-muted-foreground">{s.note}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Problem;
