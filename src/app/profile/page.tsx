"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldGroup, Select } from "@/components/ui/input";
import { useUser } from "@/context/user";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";

const CURRENCIES = ["USD", "EUR", "GBP", "AUD", "NGN", "ZAR", "JPY", "BRL", "CAD", "CHF", "SGD", "AED", "INR", "MYR", "KES"];

const SPORTS = [
  "Athletics / Track & Field",
  "Badminton",
  "Baseball",
  "Basketball",
  "Boxing",
  "Combat Sports / MMA",
  "Cricket",
  "Cycling",
  "Football / Soccer",
  "Golf",
  "Gymnastics",
  "Ice Hockey",
  "Judo",
  "Padel",
  "Rowing",
  "Rugby",
  "Snooker / Billiards",
  "Squash",
  "Swimming",
  "Table Tennis",
  "Tennis",
  "Triathlon",
  "Volleyball",
  "Wrestling",
  "Other",
];

function ProfileForm() {
  const { user, setUser } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill from Google OAuth redirect params (new users only)
  const googleEmail = searchParams.get("email") ?? "";
  const googleName = searchParams.get("name") ?? "";

  const [form, setForm] = useState({
    email: user?.email ?? googleEmail,
    name: user?.name ?? googleName,
    home_country: user?.home_country ?? "",
    home_currency: user?.home_currency ?? "USD",
    sport: user?.sport ?? "tennis",
    monthly_income: user ? String(user.monthly_income) : "",
    savings_balance: user ? String(user.savings_balance) : "",
    monthly_sponsorship: user ? String(user.monthly_sponsorship) : "",
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = await api.profile.save({
        ...form,
        monthly_income: parseFloat(form.monthly_income) || 0,
        savings_balance: parseFloat(form.savings_balance) || 0,
        monthly_sponsorship: parseFloat(form.monthly_sponsorship) || 0,
        sport: form.sport,
      });
      setUser(saved);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <form onSubmit={handleSubmit} className="space-y-6">
        <h1 className="font-serif text-xl font-semibold text-foreground">
          {user ? "Edit Profile" : "Set Up Your Profile"}
        </h1>

        <Card>
          <h2 className="mb-4 font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground">Personal Details</h2>
          <div className="space-y-4">
            <FieldGroup>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={set("email")}
                required
              />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="e.g. Carlos Alcaraz"
                value={form.name}
                onChange={set("name")}
                required
              />
            </FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <FieldGroup>
                <Label htmlFor="country">Home Country</Label>
                <Input
                  id="country"
                  placeholder="e.g. Spain"
                  value={form.home_country}
                  onChange={set("home_country")}
                  required
                />
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="currency">Home Currency</Label>
                <Select id="currency" value={form.home_currency} onChange={set("home_currency")}>
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </FieldGroup>
            </div>
            <FieldGroup>
              <Label htmlFor="sport">Sport</Label>
              <Select id="sport" value={form.sport} onChange={set("sport")}>
                {SPORTS.map((s) => <option key={s} value={s.toLowerCase().replace(/\s+\/\s+/g, "_").replace(/\s+/g, "_")}>{s}</option>)}
              </Select>
            </FieldGroup>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground">Financial Snapshot</h2>
          <div className="space-y-4">
            <FieldGroup>
              <Label htmlFor="income">Monthly Income / Salary ({form.home_currency})</Label>
              <Input
                id="income"
                type="number"
                min="0"
                placeholder="0"
                value={form.monthly_income}
                onChange={set("monthly_income")}
              />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="savings">Current Savings Balance ({form.home_currency})</Label>
              <Input
                id="savings"
                type="number"
                min="0"
                placeholder="0"
                value={form.savings_balance}
                onChange={set("savings_balance")}
              />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="sponsorship">Monthly Sponsorship Income ({form.home_currency})</Label>
              <Input
                id="sponsorship"
                type="number"
                min="0"
                placeholder="0"
                value={form.monthly_sponsorship}
                onChange={set("monthly_sponsorship")}
              />
            </FieldGroup>
          </div>
        </Card>

        {error && (
          <p className="rounded-xl border border-loss/20 bg-loss-soft px-4 py-3 text-sm text-loss">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? "Saving…" : user ? "Save Changes" : "Create Profile"}
        </Button>
      </form>
    </AppShell>
  );
}

export default function ProfilePage() {
  return (
    <Suspense>
      <ProfileForm />
    </Suspense>
  );
}
