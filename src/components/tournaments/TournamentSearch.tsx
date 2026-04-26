"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, Zap, MapPin, Calendar, Trophy } from "lucide-react";
import { cn, formatMoney } from "@/lib/utils";
import type { SeedTournament } from "@/data/seed-tournaments";

type Props = {
  onSelect: (t: SeedTournament) => void;
  sport?: string;
};

const TOUR_LEVEL_STYLES: Record<string, string> = {
  "World Tour":     "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
  "Challenger Tour":"text-cyan-400 bg-cyan-500/10 border-cyan-500/25",
  "Qualifying":     "text-zinc-400 bg-zinc-700/40 border-zinc-700",
};

const TIER_STYLES: Record<string, string> = {
  "Finals":     "text-yellow-300",
  "Platinum":   "text-yellow-400",
  "Gold":       "text-amber-400",
  "Silver":     "text-zinc-300",
  "Bronze":     "text-orange-400",
  "Challenger": "text-sky-400",
  "Qualifying": "text-zinc-500",
  "Open":       "text-zinc-500",
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
  const tierStyle = TIER_STYLES[t.tier] ?? "text-zinc-400";
  const tourStyle = TOUR_LEVEL_STYLES[tourLevel] ?? TOUR_LEVEL_STYLES["Qualifying"];
  const winnerPrize = t.prize_rounds?.w ?? 0;
  const dateRange = formatDateRange(t.start_date, t.end_date);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full px-4 py-3 text-left transition-colors hover:bg-zinc-800/60 border-b border-zinc-800/60 last:border-0 group"
    >
      {/* Name + tour level badge */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-white leading-tight truncate">{t.name}</p>
        <span className={cn("shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium mt-0.5", tourStyle)}>
          {tourLevel}
        </span>
      </div>

      {/* Tier + prize + dates */}
      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
        <span className={cn("text-xs font-medium", tierStyle)}>
          {t.tier}
        </span>

        {winnerPrize > 0 && (
          <span className="flex items-center gap-1 text-xs text-zinc-400">
            <Trophy className="h-3 w-3 text-zinc-500" />
            {formatMoney(winnerPrize, t.currency)}
          </span>
        )}

        {t.location && (
          <span className="flex items-center gap-1 text-xs text-zinc-500">
            <MapPin className="h-3 w-3" />
            {t.location}
          </span>
        )}

        {dateRange && (
          <span className="flex items-center gap-1 text-xs text-zinc-500">
            <Calendar className="h-3 w-3" />
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
        const params = new URLSearchParams({ q: query });
        if (sport) params.set("sport", sport);
        const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
        const res = await fetch(`${base}/api/tournaments/search?${params}`);
        const data = await res.json();
        setResults(data);
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
        <Zap className="h-3.5 w-3.5 text-emerald-400" />
        <span className="text-xs uppercase tracking-widest text-emerald-500 font-medium">Quick Fill</span>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search by name, city, country, or tier…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          className={cn(
            "w-full rounded-xl border bg-zinc-900/60 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 backdrop-blur-sm transition-all duration-150 focus:outline-none",
            selected
              ? "border-emerald-500/40 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20"
              : "border-zinc-700/60 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20"
          )}
        />
        {loading && (
          <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-zinc-500" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-zinc-700/60 bg-zinc-900/95 shadow-2xl backdrop-blur-xl overflow-hidden">
          {results.map((t) => (
            <ResultCard key={t.id} t={t} onSelect={() => handleSelect(t)} />
          ))}
        </div>
      )}

      {open && !loading && results.length === 0 && query.length > 1 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-zinc-700/60 bg-zinc-900/95 px-4 py-5 text-center backdrop-blur-xl">
          <p className="text-sm text-zinc-500">No tournaments found for &quot;{query}&quot;</p>
          <p className="text-xs text-zinc-600 mt-1">Fill in the details manually below.</p>
        </div>
      )}

      {selected && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-500">
          <Zap className="h-3 w-3" />
          Form auto-filled — review and adjust any values before continuing.
        </p>
      )}
    </div>
  );
}
