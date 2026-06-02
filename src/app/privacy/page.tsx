import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | AthleteTracker",
  description: "How AthleteTracker handles account and tournament planning data.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
          Back to home
        </Link>

        <div className="mt-10 space-y-8">
          <header>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">AthleteTracker</p>
            <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight">Privacy Policy</h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              We use account, profile, and tournament planning details to provide the P&amp;L dashboard,
              authenticate your account, and improve the product. We do not sell personal data.
            </p>
          </header>

          <section className="space-y-3">
            <h2 className="text-base font-semibold">Data we collect</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              AthleteTracker stores the information you enter, including your profile, home currency,
              tournament costs, prize scenarios, subsidies, and sponsorship allocations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold">How we use it</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              We use this data to calculate tournament projections, save your dashboard state, support
              sign-in, and help you review your financial planning history.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold">Contact</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              For privacy questions or deletion requests, contact the AthleteTracker team from the account
              email tied to your profile.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
