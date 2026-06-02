import type { AthleteProfile, Tournament, PnLResult } from "@/types";
import type { SeedTournament } from "@/data/seed-tournaments";
import { supabase } from "@/lib/supabase";

export type TournamentWithPnL = Tournament & { pnl: PnLResult; home_currency: string };

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(await authHeader()),
      ...options?.headers,
    },
  });
  if (res.status === 401) {
    // Token missing/expired — drop the session and bounce to login.
    await supabase.auth.signOut().catch(() => {});
    if (typeof window !== "undefined") window.location.assign("/login");
    throw new Error("Session expired — please sign in again.");
  }
  if (res.status === 503) {
    // Auth key service is unreachable — a transient upstream outage, not a bad
    // session. Keep the user signed in and let them retry.
    throw new Error("Auth service temporarily unavailable — please retry.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json();
}

export const api = {
  profile: {
    get: (email: string) =>
      request<AthleteProfile | null>(`/api/profile?email=${encodeURIComponent(email)}`),
    save: (data: Partial<AthleteProfile> & { email: string }) =>
      request<AthleteProfile>("/api/profile", { method: "POST", body: JSON.stringify(data) }),
  },
  tournaments: {
    list: (user_id: string) =>
      request<TournamentWithPnL[]>(`/api/tournaments?user_id=${user_id}`),
    search: (query: string, sport?: string) => {
      const params = new URLSearchParams({ q: query });
      if (sport) params.set("sport", sport);
      return request<SeedTournament[]>(`/api/tournaments/search?${params}`);
    },
    get: (id: string) =>
      request<TournamentWithPnL>(`/api/tournaments/${id}`),
    create: (data: Omit<Tournament, "id" | "created_at">) =>
      request<TournamentWithPnL>("/api/tournaments", { method: "POST", body: JSON.stringify(data) }),
    previewPnl: (data: Partial<Tournament>) =>
      request<PnLResult>("/api/tournaments/pnl-preview", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Tournament>) =>
      request<TournamentWithPnL>(`/api/tournaments/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/tournaments/${id}`, { method: "DELETE" }),
  },
  fx: {
    convert: (from: string, to: string, amount: number) =>
      request<{ from: string; to: string; amount: number; converted: number; rate: number }>(
        `/api/fx?from=${from}&to=${to}&amount=${amount}`
      ),
  },
};
