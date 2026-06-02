"use client";

import { use, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ScenarioRow } from "@/components/tournaments/ScenarioRow";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup, Input, Label, Select } from "@/components/ui/input";
import { useUser } from "@/context/user";
import { api, type TournamentWithPnL } from "@/lib/api";
import { formatMoney } from "@/lib/utils";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import type { PnLResult, PrizeRounds, SubsidyCovers, Tournament } from "@/types";

type FormState = {
  name: string;
  location: string;
  country: string;
  currency: string;
  start_date: string;
  end_date: string;
  duration_days: string;
  entry_fee: string;
  flight_cost: string;
  accommodation_total: string;
  daily_spending_cap: string;
  coaching_cost: string;
  misc_cost: string;
  subsidized: boolean;
  subsidy_by: string;
  subsidy_covers: string;
  subsidy_amount: string;
  sponsorship_allocated: string;
  prize_r1: string;
  prize_r2: string;
  prize_r3: string;
  prize_qf: string;
  prize_sf: string;
  prize_f: string;
  prize_w: string;
};

type MoneyFieldKey =
  | "entry_fee"
  | "flight_cost"
  | "accommodation_total"
  | "daily_spending_cap"
  | "coaching_cost"
  | "misc_cost"
  | "subsidy_amount"
  | "sponsorship_allocated"
  | "prize_r1"
  | "prize_r2"
  | "prize_r3"
  | "prize_qf"
  | "prize_sf"
  | "prize_f"
  | "prize_w";

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "BRL", "ZAR", "NGN"];

const COST_FIELDS: { key: MoneyFieldKey; label: string }[] = [
  { key: "entry_fee", label: "Entry Fee" },
  { key: "flight_cost", label: "Flights & Transport" },
  { key: "accommodation_total", label: "Accommodation Total" },
  { key: "daily_spending_cap", label: "Daily Spending Cap" },
  { key: "coaching_cost", label: "Coaching / Physio" },
  { key: "misc_cost", label: "Misc" },
];

const ROUND_FIELDS: { key: keyof PrizeRounds; field: MoneyFieldKey; label: string }[] = [
  { key: "r1", field: "prize_r1", label: "Round 1" },
  { key: "r2", field: "prize_r2", label: "Round 2" },
  { key: "r3", field: "prize_r3", label: "Round 3" },
  { key: "qf", field: "prize_qf", label: "Quarter-Final" },
  { key: "sf", field: "prize_sf", label: "Semi-Final" },
  { key: "f", field: "prize_f", label: "Final" },
  { key: "w", field: "prize_w", label: "Winner" },
];

const ALL_MONEY_FIELDS = [
  ...COST_FIELDS.map((field) => field.key),
  "subsidy_amount",
  "sponsorship_allocated",
  ...ROUND_FIELDS.map((round) => round.field),
] satisfies MoneyFieldKey[];

function n(value: string) {
  return Number.parseFloat(value) || 0;
}

function parseDurationDays(value: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return null;
  return parsed;
}

function hasInvalidMoneyValue(form: FormState) {
  return ALL_MONEY_FIELDS.some((field) => {
    const value = form[field].trim();
    if (value === "") return false;
    const parsed = Number(value);
    return !Number.isFinite(parsed) || parsed < 0;
  });
}

function valueString(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

function dateInputValue(value: string) {
  return value ? value.split("T")[0] : "";
}

function tournamentToForm(tournament: Tournament): FormState {
  const prizeRounds = tournament.prize_rounds ?? {};

  return {
    name: tournament.name,
    location: tournament.location,
    country: tournament.country,
    currency: tournament.currency,
    start_date: dateInputValue(tournament.start_date),
    end_date: dateInputValue(tournament.end_date),
    duration_days: valueString(tournament.duration_days),
    entry_fee: valueString(tournament.entry_fee),
    flight_cost: valueString(tournament.flight_cost),
    accommodation_total: valueString(tournament.accommodation_total),
    daily_spending_cap: valueString(tournament.daily_spending_cap),
    coaching_cost: valueString(tournament.coaching_cost),
    misc_cost: valueString(tournament.misc_cost),
    subsidized: Boolean(tournament.subsidy_by || tournament.subsidy_amount || tournament.subsidy_covers),
    subsidy_by: tournament.subsidy_by ?? "",
    subsidy_covers: tournament.subsidy_covers ?? "flights",
    subsidy_amount: valueString(tournament.subsidy_amount),
    sponsorship_allocated: valueString(tournament.sponsorship_allocated),
    prize_r1: valueString(prizeRounds.r1),
    prize_r2: valueString(prizeRounds.r2),
    prize_r3: valueString(prizeRounds.r3),
    prize_qf: valueString(prizeRounds.qf),
    prize_sf: valueString(prizeRounds.sf),
    prize_f: valueString(prizeRounds.f),
    prize_w: valueString(prizeRounds.w),
  };
}

function buildPayload(form: FormState, durationDays: number): Partial<Tournament> {
  const prize_rounds: PrizeRounds = {};
  for (const { key, field } of ROUND_FIELDS) {
    if (form[field] !== "") prize_rounds[key] = n(form[field]);
  }

  return {
    name: form.name,
    location: form.location,
    country: form.country,
    currency: form.currency,
    start_date: form.start_date,
    end_date: form.end_date,
    duration_days: durationDays,
    entry_fee: n(form.entry_fee),
    flight_cost: n(form.flight_cost),
    accommodation_total: n(form.accommodation_total),
    daily_spending_cap: n(form.daily_spending_cap),
    coaching_cost: n(form.coaching_cost),
    misc_cost: n(form.misc_cost),
    subsidy_by: form.subsidized ? form.subsidy_by || null : null,
    subsidy_covers: form.subsidized ? (form.subsidy_covers as SubsidyCovers) : null,
    subsidy_amount: form.subsidized ? n(form.subsidy_amount) : 0,
    sponsorship_allocated: n(form.sponsorship_allocated),
    prize_rounds,
  };
}

function buildValidPayload(form: FormState): Partial<Tournament> | null {
  const durationDays = parseDurationDays(form.duration_days);
  if (durationDays === null || hasInvalidMoneyValue(form)) return null;
  return buildPayload(form, durationDays);
}

function MoneyField({
  label,
  value,
  onChange,
  homeCurrency,
  tournamentCurrency,
  fxRate,
  fxLoading,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  homeCurrency: string;
  tournamentCurrency: string;
  fxRate: number | null;
  fxLoading: boolean;
  required?: boolean;
}) {
  const showEquivalent = tournamentCurrency !== homeCurrency;
  const amount = n(value);

  return (
    <FieldGroup>
      <Label>{label} ({homeCurrency})</Label>
      <div className={showEquivalent ? "grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,13rem)]" : undefined}>
        <Input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder="0"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
        />
        {showEquivalent && (
          <div className="flex min-h-10 items-center justify-between gap-3 rounded-xl border border-border bg-secondary px-3 py-2">
            <span className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">{tournamentCurrency}</span>
            <span className="truncate text-right font-mono text-sm text-foreground tabular">
              {fxLoading ? "FX..." : fxRate ? `≈ ${formatMoney(amount * fxRate, tournamentCurrency)}` : "FX unavailable"}
            </span>
          </div>
        )}
      </div>
    </FieldGroup>
  );
}

function PreviewPanel({
  preview,
  loading,
  error,
  homeCurrency,
  tournamentCurrency,
  fxRate,
  fxLoading,
  blockedMessage,
}: {
  preview: PnLResult | undefined;
  loading: boolean;
  error: Error | null;
  homeCurrency: string;
  tournamentCurrency: string;
  fxRate: number | null;
  fxLoading: boolean;
  blockedMessage: string | null;
}) {
  return (
    <Card className="lg:sticky lg:top-8">
      <CardHeader>
        <CardTitle>Live P&L</CardTitle>
        {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </CardHeader>

      {blockedMessage ? (
        <p className="rounded-xl border border-warning/20 bg-warning/10 px-3 py-3 text-sm text-foreground">{blockedMessage}</p>
      ) : error ? (
        <p className="rounded-xl border border-loss/20 bg-loss-soft px-3 py-2 text-sm text-loss">{error.message}</p>
      ) : preview && preview.scenarios.length > 0 ? (
        <div className="space-y-3">
          {preview.scenarios.map((scenario) => (
            <ScenarioRow
              key={scenario.scenario}
              s={scenario}
              currency={homeCurrency}
              homeCurrency={homeCurrency}
              isBreakEven={scenario.round === preview.break_even_round}
              convertedCurrency={tournamentCurrency}
              conversionRate={fxRate}
              conversionLoading={fxLoading}
            />
          ))}
          {preview.break_even_round && (
            <p className="text-xs text-muted-foreground">
              Break-even: reach <span className="font-medium uppercase text-foreground">{preview.break_even_round}</span> to cover all costs
            </p>
          )}
        </div>
      ) : (
        <p className="rounded-xl border border-border bg-secondary px-3 py-4 text-center text-sm text-muted-foreground">
          No prize rounds entered.
        </p>
      )}
    </Card>
  );
}

export default function EditTournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useUser();

  const { data: tournament, isLoading } = useQuery({
    queryKey: ["tournament", id],
    queryFn: () => api.tournaments.get(id),
  });

  const homeCurrency = user?.home_currency ?? tournament?.home_currency ?? "USD";

  if (isLoading || !tournament) {
    return (
      <AppShell>
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <EditTournamentForm
        key={tournament.id}
        id={id}
        tournament={tournament}
        homeCurrency={homeCurrency}
      />
    </AppShell>
  );
}

function EditTournamentForm({
  id,
  tournament,
  homeCurrency,
}: {
  id: string;
  tournament: TournamentWithPnL;
  homeCurrency: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => tournamentToForm(tournament));
  const [previewPayload, setPreviewPayload] = useState<Partial<Tournament> | null>(() => buildValidPayload(form));
  const [submitError, setSubmitError] = useState<string | null>(null);
  const showFx = form.currency !== homeCurrency;
  const previewBlockedMessage = buildValidPayload(form) === null
    ? "Enter a whole duration of at least 1 day and non-negative money values to preview P&L."
    : null;

  const { data: fx, isFetching: fxLoading } = useQuery({
    queryKey: ["fx-rate", homeCurrency, form.currency],
    queryFn: () => api.fx.convert(homeCurrency, form.currency, 1),
    enabled: showFx,
    staleTime: 60 * 60 * 1000,
  });

  const { data: preview, isFetching: previewLoading, error: previewError } = useQuery({
    queryKey: ["tournament-pnl-preview", id, previewPayload],
    queryFn: () => {
      if (!previewPayload) throw new Error("Missing preview payload");
      return api.tournaments.previewPnl(previewPayload);
    },
    enabled: Boolean(previewPayload),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<Tournament>) => api.tournaments.update(id, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tournament", id] }),
        queryClient.invalidateQueries({ queryKey: ["tournaments"] }),
      ]);
      router.push(`/tournaments/${id}`);
    },
    onError: (error) => {
      setSubmitError(error instanceof Error ? error.message : "Failed to save tournament");
    },
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPreviewPayload(buildValidPayload(form));
    }, 300);

    return () => window.clearTimeout(timer);
  }, [form]);

  const set = (field: keyof FormState, value: string | boolean) => {
    setForm((current) => current ? { ...current, [field]: value } : current);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    const payload = buildValidPayload(form);
    if (!payload) {
      setSubmitError("Enter a whole duration of at least 1 day and non-negative money values before saving.");
      return;
    }
    updateMutation.mutate(payload);
  };

  const fxRate = showFx ? fx?.rate ?? null : null;
  const apiPreviewError = previewError instanceof Error ? previewError : null;

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href={`/tournaments/${id}`}
              className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back
            </Link>
            <h1 className="font-serif text-xl font-semibold text-foreground">Edit Tournament</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{tournament?.name}</p>
          </div>
          <Button type="submit" disabled={updateMutation.isPending} className="w-full sm:w-auto">
            {updateMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save Changes
          </Button>
        </div>

        {submitError && (
          <p className="rounded-xl border border-loss/20 bg-loss-soft px-4 py-3 text-sm text-loss">{submitError}</p>
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.85fr)] lg:items-start">
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Tournament</CardTitle>
              </CardHeader>
              <div className="space-y-4">
                <FieldGroup>
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(event) => set("name", event.target.value)} required />
                </FieldGroup>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FieldGroup>
                    <Label>City</Label>
                    <Input value={form.location} onChange={(event) => set("location", event.target.value)} required />
                  </FieldGroup>
                  <FieldGroup>
                    <Label>Country</Label>
                    <Input value={form.country} onChange={(event) => set("country", event.target.value)} required />
                  </FieldGroup>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FieldGroup>
                    <Label>Tournament Currency</Label>
                    <Select value={form.currency} onChange={(event) => set("currency", event.target.value)}>
                      {CURRENCIES.map((currency) => (
                        <option key={currency} value={currency}>{currency}</option>
                      ))}
                    </Select>
                  </FieldGroup>
                  <FieldGroup>
                    <Label>Duration Days</Label>
                    <Input
                      type="number"
                      min="1"
                      inputMode="numeric"
                      value={form.duration_days}
                      onChange={(event) => set("duration_days", event.target.value)}
                      required
                    />
                  </FieldGroup>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FieldGroup>
                    <Label>Start Date</Label>
                    <Input type="date" value={form.start_date} onChange={(event) => set("start_date", event.target.value)} required />
                  </FieldGroup>
                  <FieldGroup>
                    <Label>End Date</Label>
                    <Input type="date" value={form.end_date} onChange={(event) => set("end_date", event.target.value)} required />
                  </FieldGroup>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Costs</CardTitle>
              </CardHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                {COST_FIELDS.map((field) => (
                  <MoneyField
                    key={field.key}
                    label={field.label}
                    value={form[field.key]}
                    onChange={(value) => set(field.key, value)}
                    homeCurrency={homeCurrency}
                    tournamentCurrency={form.currency}
                    fxRate={fxRate}
                    fxLoading={fxLoading}
                  />
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Funding</CardTitle>
              </CardHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary px-4 py-3">
                  <span className="text-sm font-medium text-foreground">Subsidized</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.subsidized}
                    onClick={() => set("subsidized", !form.subsidized)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${form.subsidized ? "bg-primary" : "bg-border"}`}
                  >
                    <span
                      className={`absolute top-0.5 size-5 rounded-full bg-background shadow transition-transform ${form.subsidized ? "translate-x-5" : "translate-x-0.5"}`}
                    />
                  </button>
                </div>

                {form.subsidized && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FieldGroup>
                      <Label>Subsidized By</Label>
                      <Input value={form.subsidy_by} onChange={(event) => set("subsidy_by", event.target.value)} />
                    </FieldGroup>
                    <FieldGroup>
                      <Label>Covers</Label>
                      <Select value={form.subsidy_covers} onChange={(event) => set("subsidy_covers", event.target.value)}>
                        <option value="flights">Flights only</option>
                        <option value="accommodation">Accommodation only</option>
                        <option value="full_expenses">Full expenses</option>
                        <option value="flat_stipend">Flat stipend</option>
                      </Select>
                    </FieldGroup>
                    <div className="sm:col-span-2">
                      <MoneyField
                        label="Subsidy Amount"
                        value={form.subsidy_amount}
                        onChange={(value) => set("subsidy_amount", value)}
                        homeCurrency={homeCurrency}
                        tournamentCurrency={form.currency}
                        fxRate={fxRate}
                        fxLoading={fxLoading}
                      />
                    </div>
                  </div>
                )}

                <MoneyField
                  label="Sponsorship Allocated"
                  value={form.sponsorship_allocated}
                  onChange={(value) => set("sponsorship_allocated", value)}
                  homeCurrency={homeCurrency}
                  tournamentCurrency={form.currency}
                  fxRate={fxRate}
                  fxLoading={fxLoading}
                />
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Prize Rounds</CardTitle>
              </CardHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                {ROUND_FIELDS.map((round) => (
                  <MoneyField
                    key={round.key}
                    label={round.label}
                    value={form[round.field]}
                    onChange={(value) => set(round.field, value)}
                    homeCurrency={homeCurrency}
                    tournamentCurrency={form.currency}
                    fxRate={fxRate}
                    fxLoading={fxLoading}
                  />
                ))}
              </div>
            </Card>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                href={`/tournaments/${id}`}
                className="inline-flex items-center justify-center rounded-full border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
              >
                Cancel
              </Link>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save Changes
              </Button>
            </div>
          </div>

          <PreviewPanel
            preview={preview}
            loading={previewLoading}
            error={apiPreviewError}
            homeCurrency={homeCurrency}
            tournamentCurrency={form.currency}
            fxRate={fxRate}
            fxLoading={fxLoading}
            blockedMessage={previewBlockedMessage}
          />
        </div>
    </form>
  );
}
