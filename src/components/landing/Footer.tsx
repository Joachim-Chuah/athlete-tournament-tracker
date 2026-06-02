import Link from "next/link";

const Footer = () => {
  return (
    <footer className="bg-background">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary">
              <span className="font-mono text-sm font-bold text-primary-foreground">A</span>
            </div>
            <span className="text-base font-semibold tracking-tight">AthleteTracker</span>
          </div>

          <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted-foreground">
            <a href="#problem" className="hover:text-foreground">Why</a>
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#calculator" className="hover:text-foreground">Calculator</a>
            <a href="#pricing" className="hover:text-foreground">Pricing</a>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
          </nav>

          <div className="font-mono text-xs text-muted-foreground">
            © 2026 AthleteTracker. Built courtside.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
