import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Check } from "lucide-react";

const blank = () => ({
  company_name: "",
  crew_wages_annual: 120000,
  employer_tax_pct: 9.15,
  workers_comp_pct: 8,
  benefits_pct: 10,
  general_liability_annual: 2500,
  commercial_auto_annual: 3000,
  equipment_insurance_annual: 1500,
  health_insurance_annual: 8000,
  fuel_cost_annual: 6000,
  vehicle_depreciation_annual: 9000,
  vehicle_maintenance_annual: 4000,
  equipment_depreciation_annual: 12000,
  rent_facility_annual: 12000,
  utilities_annual: 3600,
  software_ai_annual: 2400,
  it_hardware_annual: 3000,
  phone_internet_annual: 1800,
  marketing_annual: 6000,
  admin_other_annual: 4000,
  billable_hours_per_year: 1500,
});

const FIELDS = [
  { group: "Labor", items: [
    { k: "crew_wages_annual", label: "Crew wages (annual $)" },
    { k: "employer_tax_pct", label: "Employer taxes (%)" },
    { k: "workers_comp_pct", label: "Workers' comp (%)" },
    { k: "benefits_pct", label: "Benefits (%)" },
  ]},
  { group: "Insurance", items: [
    { k: "general_liability_annual", label: "General liability ($)" },
    { k: "commercial_auto_annual", label: "Commercial auto ($)" },
    { k: "equipment_insurance_annual", label: "Equipment insurance ($)" },
    { k: "health_insurance_annual", label: "Health insurance ($)" },
  ]},
  { group: "Vehicle & equipment", items: [
    { k: "fuel_cost_annual", label: "Fuel ($)" },
    { k: "vehicle_depreciation_annual", label: "Vehicle depreciation ($)" },
    { k: "vehicle_maintenance_annual", label: "Vehicle maintenance ($)" },
    { k: "equipment_depreciation_annual", label: "Equipment depreciation ($)" },
  ]},
  { group: "Facility", items: [
    { k: "rent_facility_annual", label: "Rent / facility ($)" },
    { k: "utilities_annual", label: "Utilities ($)" },
  ]},
  { group: "Technology", items: [
    { k: "software_ai_annual", label: "Software & AI subscriptions ($)" },
    { k: "it_hardware_annual", label: "IT / hardware ($)" },
    { k: "phone_internet_annual", label: "Phone & internet ($)" },
  ]},
  { group: "Other", items: [
    { k: "marketing_annual", label: "Marketing ($)" },
    { k: "admin_other_annual", label: "Admin / other ($)" },
    { k: "billable_hours_per_year", label: "Billable hours / year" },
  ]},
];

export default function CostOfBusinessCalculator() {
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const list = await base44.entities.CostOfBusiness.list();
      setData(list[0] || blank());
    })();
  }, []);

  const set = (k, v) => { setData((d) => ({ ...d, [k]: Number(v) || 0 })); setSaved(false); };
  const setStr = (k, v) => { setData((d) => ({ ...d, [k]: v })); setSaved(false); };

  const save = async () => {
    setSaving(true);
    try {
      if (data.id) await base44.entities.CostOfBusiness.update(data.id, data);
      else { const c = await base44.entities.CostOfBusiness.create(data); setData(c); }
      setSaved(true);
    } finally { setSaving(false); }
  };

  if (!data) return <div className="py-8 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;

  const laborBurden = data.crew_wages_annual * (1 + (data.employer_tax_pct + data.workers_comp_pct + data.benefits_pct) / 100);
  const insurance = data.general_liability_annual + data.commercial_auto_annual + data.equipment_insurance_annual + data.health_insurance_annual;
  const vehicle = data.fuel_cost_annual + data.vehicle_depreciation_annual + data.vehicle_maintenance_annual;
  const facility = data.rent_facility_annual + data.utilities_annual;
  const tech = data.software_ai_annual + data.it_hardware_annual + data.phone_internet_annual;
  const overhead = insurance + vehicle + data.equipment_depreciation_annual + facility + tech + data.marketing_annual + data.admin_other_annual;
  const totalAnnual = laborBurden + overhead;
  const hrs = data.billable_hours_per_year || 1;
  const burdenedRate = totalAnnual / hrs;
  const overheadPerHr = overhead / hrs;
  const overheadPct = laborBurden ? (overhead / laborBurden) * 100 : 0;

  const money = (n) => "$" + Math.round(n).toLocaleString();

  return (
    <div className="space-y-5">
      <div>
        <Label>Company name</Label>
        <Input value={data.company_name} onChange={(e) => setStr("company_name", e.target.value)} placeholder="Your company" className="max-w-xs" />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
        {FIELDS.map((g) => (
          <div key={g.group} className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{g.group}</p>
            {g.items.map((f) => (
              <div key={f.k}>
                <Label className="text-[11px]">{f.label}</Label>
                <Input type="number" value={data[f.k]} onChange={(e) => set(f.k, e.target.value)} />
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Labor burden (annual)", value: money(laborBurden) },
          { label: "Total overhead (annual)", value: money(overhead) },
          { label: "Total cost of business", value: money(totalAnnual) },
          { label: "Overhead % of labor", value: overheadPct.toFixed(0) + "%" },
          { label: "Burdened hourly rate", value: money(burdenedRate), highlight: true },
          { label: "Overhead per billable hr", value: money(overheadPerHr) },
        ].map((m) => (
          <div key={m.label} className={`rounded-xl border p-4 ${m.highlight ? "bg-slate-900 text-white border-slate-900" : "border-slate-200"}`}>
            <p className={`text-[11px] ${m.highlight ? "text-slate-300" : "text-slate-500"}`}>{m.label}</p>
            <p className={`mt-1 text-xl font-semibold ${m.highlight ? "text-[#F5C542]" : "text-slate-900"}`}>{m.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button className="bg-slate-900 hover:bg-slate-800" disabled={saving} onClick={save}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save cost of business
        </Button>
        {saved && <span className="text-[12px] text-emerald-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Saved</span>}
      </div>
    </div>
  );
}