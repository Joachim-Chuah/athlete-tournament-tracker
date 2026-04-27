import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

const Nav = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <span className="font-mono text-sm font-bold text-primary-foreground">A</span>
          </div>
          <span className="text-base font-semibold tracking-tight">AthleteTracker</span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          <a href="#problem" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Why
          </a>
          <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Features
          </a>
          <a href="#calculator" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Calculator
          </a>
          <a href="#pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Pricing
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block">
            Sign in
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Start free
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Nav;
