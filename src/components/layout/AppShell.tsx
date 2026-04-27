"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/theme";
import { useAuth } from "@/context/auth";
import { useUser } from "@/context/user";
import { LayoutDashboard, User, Plus, Sun, Moon, LogOut, Loader2 } from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tournaments/new", label: "New Tournament", icon: Plus },
  { href: "/profile", label: "Profile", icon: User },
];

function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  const pathname = usePathname();
  const active = pathname === href || (pathname.startsWith(href + "/") && href !== "/dashboard");

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-secondary text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")} />
      <span className="hidden md:block">{label}</span>
    </Link>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, loading: authLoading, signOut, supabaseUser } = useAuth();
  const { user, setUser } = useUser();

  // Central auth guard — runs on every protected page
  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    // Session exists but no profile yet → finish setup
    if (!user) router.replace("/profile");
  }, [session, user, authLoading, router]);

  const handleSignOut = async () => {
    setUser(null);
    await signOut();
    router.replace("/login");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const userEmail = supabaseUser?.email ?? user?.email ?? "";
  const avatarLetter = (user?.name ?? userEmail)?.[0]?.toUpperCase() ?? "A";

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0 border-r border-border bg-background">
        <div className="flex h-16 items-center gap-2.5 px-4 border-b border-border">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <span className="font-mono text-sm font-bold text-primary-foreground">A</span>
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">AthleteTracker</p>
            <p className="text-xs text-muted-foreground mt-0.5">P&L Dashboard</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3 pt-4">
          {nav.map((item) => <NavLink key={item.href} {...item} />)}
        </nav>

        <div className="p-3 border-t border-border space-y-2">
          {/* User email */}
          <div className="flex items-center gap-2.5 px-2 py-1">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
              {avatarLetter}
            </div>
            <span className="text-xs text-muted-foreground truncate">{userEmail}</span>
          </div>
          <div className="flex items-center justify-between px-1">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
            <span className="font-mono text-xs font-bold text-primary-foreground">A</span>
          </div>
          <span className="text-sm font-semibold">AthleteTracker</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 md:ml-56 min-h-screen">
        <div className="mx-auto max-w-5xl px-4 pt-20 pb-28 md:px-8 md:pt-10 md:pb-10">
          {children}
        </div>
      </main>

      {/* Bottom nav — mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/90 backdrop-blur-md">
        <div className="flex items-center justify-around">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (pathname.startsWith(href + "/") && href !== "/dashboard");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
