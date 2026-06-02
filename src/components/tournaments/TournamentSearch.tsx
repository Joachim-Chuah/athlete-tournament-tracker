"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, Zap, MapPin, Calendar, Trophy } from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatMoney } from "@/lib/utils";
import type { SeedTournament } from "@/data/seed-tournaments";

type Props = {
  onSelect: (t: SeedTournament) => void;
  sport?: string;
};

const TOUR_LEVEL_STYLES: Record<string, string> = {
  "World Tour":      "text-profit bg-profit-soft border-profit/20",
  "Challenger Tour": "text-foreground bg-secondary border-border",
  "Qualifying":      "text-muted-foreground bg-secondary border-border",
};

const TIER_STYLES: Record<string, string> = {
  "Finals":     "text-warning",
  "Platinum":   "text-warning",
  "Gold":       "text-warning",
  "Silver":     "text-muted-foreground",
  "Bronze":     "text-muted-foreground",
  "Challenger": "text-foreground",
  "Qualifying": "text-muted-foreground",
  "Open":       "text-muted-foreground",
};

function formatDateRange(start?: string | null, end?: string | null): string {
  if (!start) return "";
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  const month = s.toLocaleDateString("en-US", { month: "short" });
  const startDay = s.getDate();
  const endDay = e ? e.getDate() : null;
  const year = s.getFullYear();
  if (endDay && endDay !== startDay) return `${month} ${startDay}–${endDay}, ${year}`;
  return `${month} ${startDay}, ${year}`;
}

function ResultCard({ t, onSelect }: { t: SeedTournament; onSelect: () => void }) {
  const tourLevel = t.tour_level ?? "World Tour";
  const tierStyle = TIER_STYLES[t.tier] ?? "text-muted-foreground";
  const tourStyle = TOUR_LEVEL_STYLES[tourLevel] ?? TOUR_LEVEL_STYLES["Qualifying"];
  // Show total prize purse (matches what PSA website displays), not estimated winner share
  const purse = t.prize_total ?? t.prize_rounds?.w ?? 0;
  const dateRange = formatDateRange(t.start_date, t.end_date);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full px-4 py-3 text-left transition-colors hover:bg-secondary border-b border-border last:border-0"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-foreground leading-tight truncate">{t.name}</p>
        <span className={cn("shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium mt-0.5", tourStyle)}>
          {tourLevel}
        </span>
      </div>

      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
        <span className={cn("text-xs font-medium", tierStyle)}>
          {t.tier}
        </span>

        {purse > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Trophy className="size-3" />
            {formatMoney(purse, t.currency)} purse
          </span>
        )}

        {t.location && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3" />
            {t.location}
          </span>
        )}

        {dateRange && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="size-3" />
            {dateRange}
          </span>
        )}
      </div>
    </button>
  );
}

export function TournamentSearch({ onSelect, sport }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SeedTournament[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        setSearchError(null);
        setResults(await api.tournaments.search(query, sport));
        setOpen(true);
      } catch {
        setSearchError("Search is unavailable right now. Try again in a moment.");
        setResults([]);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 250);
  }, [query, sport]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (t: SeedTournament) => {
    setSelected(t.id);
    setQuery(t.name);
    setOpen(false);
    onSelect(t);
  };

  return (
    <div ref={containerRef} className="relative mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="size-3.5 text-profit" />
        <span className="font-mono text-xs uppercase tracking-widest text-profit font-medium">Quick Fill</span>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name, city, country, or tier…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          className={cn(
            "w-full rounded-xl border bg-background pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-150 focus:outline-none",
            selected
              ? "border-primary/40 focus:border-primary/60 focus:ring-2 focus:ring-primary/10"
              : "border-border focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
          )}
        />
        {loading && (
          <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card shadow-lg overflow-hidden">
          {results.map((t) => (
            <ResultCard key={t.id} t={t} onSelect={() => handleSelect(t)} />
          ))}
        </div>
      )}

      {open && !loading && searchError && query.length > 1 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card px-4 py-5 text-center">
          <p className="text-sm text-muted-foreground">{searchError}</p>
        </div>
      )}

      {open && !loading && !searchError && results.length === 0 && query.length > 1 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card px-4 py-5 text-center">
          <p className="text-sm text-muted-foreground">No tournaments found for &quot;{query}&quot;</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Fill in the details manually below.</p>
        </div>
      )}

      {selected && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-profit">
          <Zap className="size-3" />
          Form auto-filled — review and adjust any values before continuing.
        </p>
      )}
    </div>
  );
}
