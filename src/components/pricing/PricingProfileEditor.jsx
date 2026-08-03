import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Check } from "lucide-react";

const CATEGORIES = ["epoxy", "polished_concrete", "decorative_concrete", "coating", "specialty"];

const blank = () => ({
  company_name: "",
  labor_rate_per_hr: 65,
  crew_size: 2,
  fuel_rate_per_mile: 0.67,
  avg_travel_miles: 30,
  material_markup_pct: 20,
  mobilization_fee: 350,
  overhead_pct: 10,
  profit_pct: 15,
  base_rates: CATEGORIES.map((c) => ({ category: c, rate_low: 0, rate_high: 0 })),
});

export default function PricingProfileEditor() {
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const list = await base44.entities.PricingProfile.list();
      setProfile(list[0] || blank());
    })();
  }, []);

  const set = (k, v) => { setProfile((p) => ({ ...p, [k]: v })); setSaved(false); };
  const setRate = (i, k, v) => {
    setProfile((p) => {
      const br = [...p.base_rates];
      br[i] = { ...br[i], [k]: Number(v) || 0 };
      return { ...p, base_rates: br };
    });
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (profile.id) await base44.entities.PricingProfile.update(profile.id, profile);
      else {
        const created = await base44.entities.PricingProfile.create(profile);
        setProfile(created);
      }
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return <div className="py-8 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label>Company name</Label>
          <Input value={profile.company_name} onChange={(e) => set("company_name", e.target.value)} placeholder="Your company" />
        </div>
        <div>
          <Label>Mobilization fee ($)</Label>
          <Input type="number" value={profile.mobilization_fee} onChange={(e) => set("mobilization_fee", e.target.value)} />
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <Label>Labor rate ($/hr)</Label>
          <Input type="number" value={profile.labor_rate_per_hr} onChange={(e) => set("labor_rate_per_hr", e.target.value)} />
        </div>
        <div>
          <Label>Crew size</Label>
          <Input type="number" value={profile.crew_size} onChange={(e) => set("crew_size", e.target.value)} />
        </div>
        <div>
          <Label>Material markup (%)</Label>
          <Input type="number" value={profile.material_markup_pct} onChange={(e) => set("material_markup_pct", e.target.value)} />
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <Label>Fuel rate ($/mile)</Label>
          <Input type="number" value={profile.fuel_rate_per_mile} onChange={(e) => set("fuel_rate_per_mile", e.target.value)} />
        </div>
        <div>
          <Label>Avg travel (miles)</Label>
          <Input type="number" value={profile.avg_travel_miles} onChange={(e) => set("avg_travel_miles", e.target.value)} />
        </div>
        <div>
          <Label>Overhead (%)</Label>
          <Input type="number" value={profile.overhead_pct} onChange={(e) => set("overhead_pct", e.target.value)} />
        </div>
      </div>
      <div className="max-w-[220px]">
        <Label>Profit margin (%)</Label>
        <Input type="number" value={profile.profit_pct} onChange={(e) => set("profit_pct", e.target.value)} />
      </div>
      <div>
        <p className="text-[12px] font-medium text-slate-700 mb-2">Standard base rates by category ($/sq ft)</p>
        <div className="space-y-2">
          {profile.base_rates.map((r, i) => (
            <div key={r.category} className="grid grid-cols-3 gap-2 items-center">
              <span className="text-[12px] text-slate-600 capitalize">{r.category.replace(/_/g, " ")}</span>
              <Input type="number" placeholder="Low" value={r.rate_low} onChange={(e) => setRate(i, "rate_low", e.target.value)} />
              <Input type="number" placeholder="High" value={r.rate_high} onChange={(e) => setRate(i, "rate_high", e.target.value)} />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button className="bg-slate-900 hover:bg-slate-800" disabled={saving} onClick={save}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save standard pricing
        </Button>
        {saved && <span className="text-[12px] text-emerald-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Saved</span>}
      </div>
    </div>
  );
}