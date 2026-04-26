import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldGroup, Select } from "@/components/ui/input";

export default function ProfilePage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-lg font-semibold text-white">Athlete Profile</h1>

        <Card>
          <h2 className="mb-4 text-sm font-medium text-zinc-300">Personal Details</h2>
          <div className="space-y-4">
            <FieldGroup>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="e.g. Carlos Alcaraz" />
            </FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <FieldGroup>
                <Label htmlFor="country">Home Country</Label>
                <Input id="country" placeholder="e.g. Spain" />
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="currency">Home Currency</Label>
                <Select id="currency">
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="AUD">AUD</option>
                  <option value="NGN">NGN</option>
                  <option value="ZAR">ZAR</option>
                  <option value="JPY">JPY</option>
                  <option value="BRL">BRL</option>
                </Select>
              </FieldGroup>
            </div>
            <FieldGroup>
              <Label htmlFor="sport">Sport</Label>
              <Select id="sport">
                <option value="tennis">Tennis</option>
                <option value="athletics">Track & Field</option>
                <option value="combat">Combat Sports</option>
                <option value="golf">Golf</option>
                <option value="other">Other</option>
              </Select>
            </FieldGroup>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-medium text-zinc-300">Financial Snapshot</h2>
          <div className="space-y-4">
            <FieldGroup>
              <Label htmlFor="income">Monthly Income / Salary</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
                <Input id="income" type="number" placeholder="0" className="pl-7" />
              </div>
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="savings">Current Savings Balance</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
                <Input id="savings" type="number" placeholder="0" className="pl-7" />
              </div>
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="sponsorship">Monthly Sponsorship Income</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
                <Input id="sponsorship" type="number" placeholder="0" className="pl-7" />
              </div>
            </FieldGroup>
          </div>
        </Card>

        <Button className="w-full" size="lg">Save Profile</Button>
      </div>
    </AppShell>
  );
}
