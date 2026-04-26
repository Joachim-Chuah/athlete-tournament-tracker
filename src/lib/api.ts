import type { AthleteProfile, Tournament, PnLResult } from "@/types";

export type TournamentWithPnL = Tournament & { pnl: PnLResult; home_currency: string };

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
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
    get: (id: string) =>
      request<TournamentWithPnL>(`/api/tournaments/${id}`),
    create: (data: Omit<Tournament, "id" | "created_at">) =>
      request<TournamentWithPnL>("/api/tournaments", { method: "POST", body: JSON.stringify(data) }),
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
