import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use | AthleteTracker",
  description: "Terms for using AthleteTracker tournament planning tools.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
          Back to home
        </Link>

        <div className="mt-10 space-y-8">
          <header>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">AthleteTracker</p>
            <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight">Terms of Use</h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              AthleteTracker helps athletes estimate tournament costs, prize outcomes, and runway. The
              projections are planning tools, not financial, legal, tax, or investment advice.
            </p>
          </header>

          <section className="space-y-3">
            <h2 className="text-base font-semibold">Your account</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              You are responsible for keeping your sign-in method secure and for entering accurate tournament
              and profile information.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold">Use of projections</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Calculations depend on the data you provide and may use external exchange-rate information.
              Always verify numbers before making travel, contract, or budget decisions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold">Changes</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              We may update these terms as the product changes. Continued use means you accept the latest
              version posted here.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
