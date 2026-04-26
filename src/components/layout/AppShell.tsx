"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, User, Plus, Trophy } from "lucide-react";

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
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
        active
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300")} />
      <span className="hidden md:block">{label}</span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="relative z-10 flex min-h-screen">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0 border-r border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl">
        <div className="flex h-16 items-center gap-2.5 px-4 border-b border-zinc-800/60">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30">
            <Trophy className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-none">AthleteTracker</p>
            <p className="text-xs text-zinc-500 mt-0.5">P&L Dashboard</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3 pt-4">
          {nav.map((item) => <NavLink key={item.href} {...item} />)}
        </nav>
        <div className="p-3 border-t border-zinc-800/60">
          <p className="text-xs text-zinc-600 px-3">v0.1.0 · MVP</p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-zinc-800/60 bg-zinc-950/80 px-4 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30">
            <Trophy className="h-3 w-3 text-emerald-400" />
          </div>
          <span className="text-sm font-semibold text-white">AthleteTracker</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 md:ml-56 min-h-screen">
        <div className="mx-auto max-w-5xl px-4 pt-20 pb-28 md:px-8 md:pt-10 md:pb-10">
          {children}
        </div>
      </main>

      {/* Bottom nav — mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800/60 bg-zinc-950/90 backdrop-blur-xl">
        <div className="flex items-center justify-around">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (pathname.startsWith(href + "/") && href !== "/dashboard");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors",
                  active ? "text-emerald-400" : "text-zinc-500"
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
