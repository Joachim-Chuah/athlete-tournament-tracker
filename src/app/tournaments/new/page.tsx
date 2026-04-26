"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldGroup, Select } from "@/components/ui/input";
import { useUser } from "@/context/user";
import { api } from "@/lib/api";
import { ChevronRight, ChevronLeft, Loader2 } from "lucide-react";

const STEPS = ["Tournament Details", "Prize Money", "Travel & Costs", "Funding", "Spending Plan"];

type FormState = {
  name: string;
  location: string;
  country: string;
  currency: string;
  start_date: string;
  end_date: string;
  entry_fee: string;
  prize_r1: string;
  prize_r2: string;
  prize_r3: string;
  prize_qf: string;
  prize_sf: string;
  prize_f: string;
  prize_w: string;
  flight_cost: string;
  accommodation_total: string;
  coaching_cost: string;
  misc_cost: string;
  subsidized: boolean;
  subsidy_by: string;
  subsidy_covers: string;
  subsidy_amount: string;
  sponsorship_allocated: string;
  duration_days: string;
  daily_spending_cap: string;
};

const INITIAL: FormState = {
  name: "", location: "", country: "", currency: "EUR",
  start_date: "", end_date: "", entry_fee: "",
  prize_r1: "", prize_r2: "", prize_r3: "", prize_qf: "", prize_sf: "", prize_f: "", prize_w: "",
  flight_cost: "", accommodation_total: "", coaching_cost: "", misc_cost: "",
  subsidized: false, subsidy_by: "", subsidy_covers: "flights", subsidy_amount: "",
  sponsorship_allocated: "", duration_days: "", daily_spending_cap: "",
};

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= current ? "bg-emerald-500" : "bg-zinc-800"}`} />
      ))}
    </div>
  );
}

const CURRENCIES = ["EUR", "USD", "GBP", "AUD", "JPY", "BRL", "ZAR", "NGN"];
const ROUND_LABELS: [keyof FormState, string][] = [
  ["prize_r1", "Round 1"], ["prize_r2", "Round 2"], ["prize_r3", "Round 3"],
  ["prize_qf", "Quarter-Final"], ["prize_sf", "Semi-Final"], ["prize_f", "Final"], ["prize_w", "Winner"],
];

type StepProps = { form: FormState; set: (field: keyof FormState, value: string | boolean) => void };

function Step1({ form, set }: StepProps) {
  return (
    <div className="space-y-4">
      <FieldGroup>
        <Label>Tournament Name</Label>
        <Input placeholder="e.g. Rome Open 2026" value={form.name} onChange={(e) => set("name", e.target.value)} required />
      </FieldGroup>
      <FieldGroup>
        <Label>City</Label>
        <Input placeholder="e.g. Rome" value={form.location} onChange={(e) => set("location", e.target.value)} required />
      </FieldGroup>
      <div className="grid grid-cols-2 gap-3">
        <FieldGroup>
          <Label>Country</Label>
          <Input placeholder="e.g. Italy" value={form.country} onChange={(e) => set("country", e.target.value)} required />
        </FieldGroup>
        <FieldGroup>
          <Label>Local Currency</Label>
          <Select value={form.currency} onChange={(e) => set("currency", e.target.value)}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </FieldGroup>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FieldGroup>
          <Label>Start Date</Label>
          <Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} required />
        </FieldGroup>
        <FieldGroup>
          <Label>End Date</Label>
          <Input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} required />
        </FieldGroup>
      </div>
      <FieldGroup>
        <Label>Entry Fee ({form.currency})</Label>
        <Input type="number" min="0" placeholder="0" value={form.entry_fee} onChange={(e) => set("entry_fee", e.target.value)} />
      </FieldGroup>
    </div>
  );
}

function Step2({ form, set }: StepProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-400 mb-4">Enter prize money in {form.currency || "tournament currency"}. Leave blank for rounds that don&apos;t apply.</p>
      {ROUND_LABELS.map(([key, label]) => (
        <FieldGroup key={key}>
          <Label>{label}</Label>
          <Input type="number" min="0" placeholder="0" value={form[key] as string} onChange={(e) => set(key, e.target.value)} />
        </FieldGroup>
      ))}
    </div>
  );
}

function Step3({ form, set }: StepProps) {
  return (
    <div className="space-y-4">
      {[
        { key: "flight_cost", label: "Flights & Transport" },
        { key: "accommodation_total", label: "Accommodation (total)" },
        { key: "coaching_cost", label: "Coaching / Physio on-site" },
        { key: "misc_cost", label: "Misc (gear, visa, etc.)" },
      ].map(({ key, label }) => (
        <FieldGroup key={key}>
          <Label>{label} ({form.currency})</Label>
          <Input type="number" min="0" placeholder="0" value={form[key as keyof FormState] as string} onChange={(e) => set(key as keyof FormState, e.target.value)} />
        </FieldGroup>
      ))}
    </div>
  );
}

function Step4({ form, set }: StepProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3">
        <span className="text-sm text-zinc-200">I am subsidized for this tournament</span>
        <button
          type="button"
          onClick={() => set("subsidized", !form.subsidized)}
          className={`relative h-6 w-11 rounded-full transition-colors ${form.subsidized ? "bg-emerald-500" : "bg-zinc-600"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.subsidized ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>

      {form.subsidized && (
        <div className="space-y-4">
          <FieldGroup>
            <Label>Subsidized by</Label>
            <Input placeholder="e.g. National Federation" value={form.subsidy_by} onChange={(e) => set("subsidy_by", e.target.value)} />
          </FieldGroup>
          <FieldGroup>
            <Label>Covers</Label>
            <Select value={form.subsidy_covers} onChange={(e) => set("subsidy_covers", e.target.value)}>
              <option value="flights">Flights only</option>
              <option value="accommodation">Accommodation only</option>
              <option value="full_expenses">Full expenses</option>
              <option value="flat_stipend">Flat stipend</option>
            </Select>
          </FieldGroup>
          <FieldGroup>
            <Label>Amount ({form.currency})</Label>
            <Input type="number" min="0" placeholder="0" value={form.subsidy_amount} onChange={(e) => set("subsidy_amount", e.target.value)} />
          </FieldGroup>
        </div>
      )}

      <FieldGroup>
        <Label>Sponsorship income for this event ({form.currency})</Label>
        <Input type="number" min="0" placeholder="0" value={form.sponsorship_allocated} onChange={(e) => set("sponsorship_allocated", e.target.value)} />
      </FieldGroup>
    </div>
  );
}

function Step5({ form, set }: StepProps) {
  return (
    <div className="space-y-4">
      <FieldGroup>
        <Label>Number of days at destination</Label>
        <Input type="number" min="1" placeholder="e.g. 10" value={form.duration_days} onChange={(e) => set("duration_days", e.target.value)} required />
      </FieldGroup>
      <FieldGroup>
        <Label>Daily spending cap ({form.currency})</Label>
        <Input type="number" min="0" placeholder="e.g. 150" value={form.daily_spending_cap} onChange={(e) => set("daily_spending_cap", e.target.value)} />
      </FieldGroup>
    </div>
  );
}

const STEP_COMPONENTS = [Step1, Step2, Step3, Step4, Step5];

function n(val: string) { return parseFloat(val) || 0; }

export default function NewTournamentPage() {
  const [step, setStep] = useState(0);
  const [form, setFormState] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();
  const router = useRouter();

  const set = (field: keyof FormState, value: string | boolean) =>
    setFormState((f) => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    setError(null);

    const prize_rounds: Record<string, number> = {};
    const prizeFields: [string, string][] = [
      ["r1", form.prize_r1], ["r2", form.prize_r2], ["r3", form.prize_r3],
      ["qf", form.prize_qf], ["sf", form.prize_sf], ["f", form.prize_f], ["w", form.prize_w],
    ];
    for (const [round, val] of prizeFields) {
      if (val !== "") prize_rounds[round] = n(val);
    }

    try {
      const start = new Date(form.start_date);
      const end = new Date(form.end_date);
      const duration_days = form.duration_days
        ? n(form.duration_days)
        : Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));

      const tournament = await api.tournaments.create({
        user_id: user.id,
        name: form.name,
        location: form.location,
        country: form.country,
        currency: form.currency,
        start_date: form.start_date,
        end_date: form.end_date,
        duration_days,
        entry_fee: n(form.entry_fee),
        flight_cost: n(form.flight_cost),
        accommodation_total: n(form.accommodation_total),
        coaching_cost: n(form.coaching_cost),
        misc_cost: n(form.misc_cost),
        subsidy_by: form.subsidized ? form.subsidy_by : null,
        subsidy_covers: form.subsidized ? form.subsidy_covers as "flights" | "accommodation" | "full_expenses" | "flat_stipend" : null,
        subsidy_amount: form.subsidized ? n(form.subsidy_amount) : 0,
        sponsorship_allocated: n(form.sponsorship_allocated),
        daily_spending_cap: n(form.daily_spending_cap),
        prize_rounds,
      });
      router.push(`/tournaments/${tournament.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tournament");
      setSubmitting(false);
    }
  };

  const StepContent = STEP_COMPONENTS[step];

  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-white">New Tournament</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
        </div>

        <StepIndicator current={step} total={STEPS.length} />

        <Card>
          <StepContent form={form} set={set} />
        </Card>

        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
        )}

        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="secondary" className="flex-1" onClick={() => setStep(step - 1)} type="button">
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button className="flex-1" onClick={() => setStep(step + 1)} type="button">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button className="flex-1" onClick={handleSubmit} disabled={submitting} type="button">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? "Saving…" : "Generate P&L"}
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  );
}
