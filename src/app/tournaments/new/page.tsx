"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldGroup, Select } from "@/components/ui/input";
import { ChevronRight, ChevronLeft } from "lucide-react";

const STEPS = [
  "Tournament Details",
  "Prize Money",
  "Travel & Costs",
  "Funding",
  "Spending Plan",
];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-colors ${
            i <= current ? "bg-emerald-500" : "bg-zinc-800"
          }`}
        />
      ))}
    </div>
  );
}

function Step1() {
  return (
    <div className="space-y-4">
      <FieldGroup>
        <Label htmlFor="t-name">Tournament Name</Label>
        <Input id="t-name" placeholder="e.g. Rome Open 2026" />
      </FieldGroup>
      <FieldGroup>
        <Label htmlFor="t-location">City</Label>
        <Input id="t-location" placeholder="e.g. Rome" />
      </FieldGroup>
      <div className="grid grid-cols-2 gap-3">
        <FieldGroup>
          <Label htmlFor="t-country">Country</Label>
          <Input id="t-country" placeholder="e.g. Italy" />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="t-currency">Local Currency</Label>
          <Select id="t-currency">
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
            <option value="AUD">AUD</option>
            <option value="JPY">JPY</option>
            <option value="BRL">BRL</option>
          </Select>
        </FieldGroup>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FieldGroup>
          <Label htmlFor="t-start">Start Date</Label>
          <Input id="t-start" type="date" />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="t-end">End Date</Label>
          <Input id="t-end" type="date" />
        </FieldGroup>
      </div>
      <FieldGroup>
        <Label htmlFor="t-entry">Entry Fee</Label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
          <Input id="t-entry" type="number" placeholder="0" className="pl-7" />
        </div>
      </FieldGroup>
    </div>
  );
}

const ROUND_LABELS: [string, string][] = [
  ["r1", "Round 1"],
  ["r2", "Round 2"],
  ["r3", "Round 3"],
  ["qf", "Quarter-Final"],
  ["sf", "Semi-Final"],
  ["f", "Final"],
  ["w", "Winner"],
];

function Step2() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-400 mb-4">
        Enter prize money per round. Leave blank for rounds that don&apos;t apply.
      </p>
      {ROUND_LABELS.map(([key, label]) => (
        <FieldGroup key={key}>
          <Label htmlFor={`prize-${key}`}>{label}</Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
            <Input id={`prize-${key}`} type="number" placeholder="0" className="pl-7" />
          </div>
        </FieldGroup>
      ))}
    </div>
  );
}

function Step3() {
  return (
    <div className="space-y-4">
      <FieldGroup>
        <Label htmlFor="t-flight">Flights & Transport</Label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
          <Input id="t-flight" type="number" placeholder="0" className="pl-7" />
        </div>
      </FieldGroup>
      <FieldGroup>
        <Label htmlFor="t-accom">Accommodation (total)</Label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
          <Input id="t-accom" type="number" placeholder="0" className="pl-7" />
        </div>
      </FieldGroup>
      <FieldGroup>
        <Label htmlFor="t-coaching">Coaching / Physio on-site</Label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
          <Input id="t-coaching" type="number" placeholder="0" className="pl-7" />
        </div>
      </FieldGroup>
      <FieldGroup>
        <Label htmlFor="t-misc">Misc (gear, visa, etc.)</Label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
          <Input id="t-misc" type="number" placeholder="0" className="pl-7" />
        </div>
      </FieldGroup>
    </div>
  );
}

function Step4() {
  const [subsidized, setSubsidized] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3">
        <span className="text-sm text-zinc-200">I am subsidized for this tournament</span>
        <button
          onClick={() => setSubsidized(!subsidized)}
          className={`relative h-6 w-11 rounded-full transition-colors ${subsidized ? "bg-emerald-500" : "bg-zinc-600"}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${subsidized ? "translate-x-5" : "translate-x-0.5"}`}
          />
        </button>
      </div>

      {subsidized && (
        <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
          <FieldGroup>
            <Label htmlFor="t-subby">Subsidized by</Label>
            <Input id="t-subby" placeholder="e.g. National Federation" />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="t-sub-covers">Covers</Label>
            <Select id="t-sub-covers">
              <option value="flights">Flights only</option>
              <option value="accommodation">Accommodation only</option>
              <option value="full_expenses">Full expenses</option>
              <option value="flat_stipend">Flat stipend</option>
            </Select>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="t-sub-amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
              <Input id="t-sub-amount" type="number" placeholder="0" className="pl-7" />
            </div>
          </FieldGroup>
        </div>
      )}

      <FieldGroup>
        <Label htmlFor="t-sponsor">Sponsorship income for this event</Label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
          <Input id="t-sponsor" type="number" placeholder="0" className="pl-7" />
        </div>
      </FieldGroup>
    </div>
  );
}

function Step5() {
  return (
    <div className="space-y-4">
      <FieldGroup>
        <Label htmlFor="t-days">Number of days at destination</Label>
        <Input id="t-days" type="number" placeholder="e.g. 10" />
      </FieldGroup>
      <FieldGroup>
        <Label htmlFor="t-daily">Daily spending cap</Label>
        <p className="text-xs text-zinc-500 mb-1.5">Suggested: $180 USD/day for Rome based on cost-of-living data</p>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
          <Input id="t-daily" type="number" placeholder="180" className="pl-7" />
        </div>
      </FieldGroup>
    </div>
  );
}

const STEP_COMPONENTS = [Step1, Step2, Step3, Step4, Step5];

export default function NewTournamentPage() {
  const [step, setStep] = useState(0);
  const StepContent = STEP_COMPONENTS[step];

  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-white">New Tournament</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Step {step + 1} of {STEPS.length} — {STEPS[step]}
          </p>
        </div>

        <StepIndicator current={step} total={STEPS.length} />

        <Card>
          <StepContent />
        </Card>

        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="secondary" className="flex-1" onClick={() => setStep(step - 1)}>
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button className="flex-1" onClick={() => setStep(step + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button className="flex-1">Generate P&L</Button>
          )}
        </div>
      </div>
    </AppShell>
  );
}
