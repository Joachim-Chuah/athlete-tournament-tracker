"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SeedTournament } from "@/data/seed-tournaments";

type Props = {
  onSelect: (t: SeedTournament) => void;
  sport?: string;
};

const SPORT_LABELS: Record<string, string> = {
  tennis: "Tennis",
  squash: "Squash",
  pickleball: "Pickleball",
};

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
        const res = await fetch(`/api/tournaments/search?${params}`);
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

  const SPORT_COLORS: Record<string, string> = {
    tennis: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    squash: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    pickleball: "text-purple-400 bg-purple-500/10 border-purple-500/20",
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
          placeholder="Search tournaments to auto-fill…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          className={cn(
            "w-full rounded-xl border bg-zinc-900/60 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 backdrop-blur-sm transition-all duration-150",
            "focus:outline-none",
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
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-zinc-700/60 bg-zinc-900/95 shadow-xl backdrop-blur-xl overflow-hidden">
          {results.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleSelect(t)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-800/60 border-b border-zinc-800/60 last:border-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{t.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{t.location}, {t.country}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", SPORT_COLORS[t.sport] ?? "text-zinc-400 bg-zinc-800 border-zinc-700")}>
                  {SPORT_LABELS[t.sport] ?? t.sport}
                </span>
                <span className="text-xs text-zinc-600">{t.tier}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && !loading && results.length === 0 && query.length > 1 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-zinc-700/60 bg-zinc-900/95 px-4 py-4 text-center backdrop-blur-xl">
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
