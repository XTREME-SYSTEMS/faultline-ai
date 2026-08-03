import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/vq/PageHeader";
import SectionCard from "@/components/vq/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus, CheckCircle2, ArrowRight, TrendingUp } from "lucide-react";
import { computeRange, money, DEFAULT_RULES } from "@/lib/pricing";
import { FLOOR_TYPE_OPTIONS } from "@/lib/floorSpecs";
import Disclosure from "@/components/vq/Disclosure";

const SPACE_TYPES = [
  { value: "garage", label: "Garage" },
  { value: "basement", label: "Basement" },
  { value: "warehouse", label: "Warehouse" },
  { value: "showroom", label: "Showroom" },
  { value: "patio", label: "Patio" },
  { value: "commercial_kitchen", label: "Commercial Kitchen" },
  { value: "retail", label: "Retail" },
  { value: "other", label: "Other" },
];

export default function LeadGenerator() {
  const navigate = useNavigate();
  const [systems, setSystems] = useState(null);
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);

  const [form, setForm] = useState({
    customer_name: "",
    email: "",
    phone: "",
    project_address: "",
    space_type: "garage",
    square_feet: "",
    system_id: "",
    floor_type: "",
    condition: "fair",
    needs_grinding: true,
    needs_moisture_mitigation: false,
    linear_feet_cracks: 0,
    linear_feet_coving: 0,
    notes: "",
  });

  useEffect(() => {
    (async () => {
      const sys = await base44.entities.FloorSystem.filter({ active: true }, "name", 50);
      setSystems(sys || []);
      const r = await base44.entities.PricingRule.filter({ status: "active" }, "-version", 1);
      if (r && r[0]) setRules({ ...DEFAULT_RULES, ...r[0] });
    })();
  }, []);

  const selectedSystem = useMemo(
    () => systems?.find((s) => s.id === form.system_id),
    [systems, form.system_id]
  );

  const estimate = useMemo(() => {
    if (!selectedSystem || !form.square_feet) return null;
    return computeRange(
      {
        square_feet: Number(form.square_feet),
        base_rate_low: selectedSystem.base_rate_low,
        base_rate_high: selectedSystem.base_rate_high,
        condition: form.condition,
        needs_grinding: form.needs_grinding,
        needs_moisture_mitigation: form.needs_moisture_mitigation,
        linear_feet_cracks: Number(form.linear_feet_cracks) || 0,
        linear_feet_coving: Number(form.linear_feet_coving) || 0,
      },
      rules
    );
  }, [form, selectedSystem, rules]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const canSubmit = form.customer_name && form.email && form.square_feet && form.system_id;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const lead = await base44.entities.Lead.create({
        customer_name: form.customer_name,
        email: form.email,
        phone: form.phone,
        project_address: form.project_address,
        space_type: form.space_type,
        square_feet: Number(form.square_feet),
        system_id: form.system_id,
        system_name: selectedSystem?.name,
        floor_type: form.floor_type,
        condition: form.condition,
        needs_grinding: form.needs_grinding,
        needs_moisture_mitigation: form.needs_moisture_mitigation,
        linear_feet_cracks: Number(form.linear_feet_cracks) || 0,
        linear_feet_coving: Number(form.linear_feet_coving) || 0,
        estimate_low: estimate?.low,
        estimate_high: estimate?.high,
        pricing_version: estimate?.version,
        source: "lead_generator",
        status: "new",
        notes: form.notes,
      });
      setCreated(lead);
    } finally {
      setSaving(false);
    }
  };

  if (created) {
    return (
      <div>
        <PageHeader eyebrow="Lead generator" title="Lead created" description="The lead is in the system and the automated follow-up sequence has started." />
        <SectionCard index="01" title="Lead summary" tag="Created" tagTone="green">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 grid place-items-center shrink-0">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-[15px] font-semibold text-slate-900">{created.customer_name}</p>
                <p className="text-[13px] text-slate-500">{created.email} · {created.phone || "No phone"}</p>
                <p className="text-[13px] text-slate-500">{created.system_name} · {created.square_feet} sq ft · {created.space_type}</p>
              </div>
              <div className="rounded-lg bg-slate-900 text-white p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Preliminary range</p>
                <p className="text-2xl font-semibold text-[#F5C542] mt-1">{money(created.estimate_low)} – {money(created.estimate_high)}</p>
                <p className="text-[11px] text-slate-400 mt-1">Pricing version {created.pricing_version}</p>
              </div>
              <div className="flex gap-2">
                <Button className="bg-slate-900 hover:bg-slate-800" onClick={() => navigate(`/app/xv/leads/${created.id}`)}>
                  Open lead <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
                <Button variant="outline" onClick={() => { setCreated(null); setForm({ customer_name: "", email: "", phone: "", project_address: "", space_type: "garage", square_feet: "", system_id: "", floor_type: "", condition: "fair", needs_grinding: true, needs_moisture_mitigation: false, linear_feet_cracks: 0, linear_feet_coving: 0, notes: "" }); }}>
                  Create another
                </Button>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Lead generator"
        title="Quick lead entry"
        description="Enter a lead from any source — phone call, walk-in, referral — and get an instant preliminary estimate. The automated follow-up sequence starts automatically."
      />

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <SectionCard index="01" title="Customer information" tag="Required">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-[12px]">Customer name *</Label>
                <Input value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} placeholder="John Smith" className="mt-1" />
              </div>
              <div>
                <Label className="text-[12px]">Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="john@email.com" className="mt-1" />
              </div>
              <div>
                <Label className="text-[12px]">Phone</Label>
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(555) 123-4567" className="mt-1" />
              </div>
              <div>
                <Label className="text-[12px]">Project address</Label>
                <Input value={form.project_address} onChange={(e) => set("project_address", e.target.value)} placeholder="123 Main St, City, ST" className="mt-1" />
              </div>
            </div>
          </SectionCard>

          <SectionCard index="02" title="Project details" tag="Required">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-[12px]">Space type</Label>
                <Select value={form.space_type} onValueChange={(v) => set("space_type", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SPACE_TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[12px]">Square feet *</Label>
                <Input type="number" value={form.square_feet} onChange={(e) => set("square_feet", e.target.value)} placeholder="500" className="mt-1" />
              </div>
              <div>
                <Label className="text-[12px]">Floor system *</Label>
                <Select value={form.system_id} onValueChange={(v) => set("system_id", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select a system" /></SelectTrigger>
                  <SelectContent>
                    {systems?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[12px]">Floor type (for specs)</Label>
                <Input list="floor-type-opts" value={form.floor_type} onChange={(e) => set("floor_type", e.target.value)} placeholder="Metallic Epoxy" className="mt-1" />
                <datalist id="floor-type-opts">
                  {FLOOR_TYPE_OPTIONS.map((t) => <option key={t} value={t} />)}
                </datalist>
              </div>
              <div>
                <Label className="text-[12px]">Slab condition</Label>
                <Select value={form.condition} onValueChange={(v) => set("condition", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[12px]">Linear feet of cracks</Label>
                <Input type="number" value={form.linear_feet_cracks} onChange={(e) => set("linear_feet_cracks", e.target.value)} placeholder="0" className="mt-1" />
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              <label className="flex items-center justify-between gap-3 text-[12px] text-slate-700">
                Needs grinding / surface prep
                <Switch checked={form.needs_grinding} onCheckedChange={(v) => set("needs_grinding", v)} />
              </label>
              <label className="flex items-center justify-between gap-3 text-[12px] text-slate-700">
                Moisture mitigation required
                <Switch checked={form.needs_moisture_mitigation} onCheckedChange={(v) => set("needs_moisture_mitigation", v)} />
              </label>
            </div>

            <div className="mt-4">
              <Label className="text-[12px]">Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Any additional context — referral source, timeline, special requests…" className="mt-1" />
            </div>
          </SectionCard>

          <div className="flex items-center gap-3">
            <Button className="bg-slate-900 hover:bg-slate-800" disabled={!canSubmit || saving} onClick={submit}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Create lead
            </Button>
            {!canSubmit && <span className="text-[12px] text-slate-400">Name, email, square feet, and floor system required</span>}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-4 space-y-4">
            <SectionCard index="→" title="Live estimate" tag="Preliminary" tagTone="gold">
              {estimate ? (
                <div>
                  <div className="rounded-xl bg-slate-900 text-white p-5">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-slate-400">
                      <TrendingUp className="w-3.5 h-3.5" /> Preliminary range
                    </div>
                    <p className="text-3xl font-semibold text-[#F5C542] mt-2">{money(estimate.low)} – {money(estimate.high)}</p>
                    <p className="text-[11px] text-slate-400 mt-2">{selectedSystem?.name} · {form.square_feet} sq ft · {form.condition} condition</p>
                  </div>
                  <div className="mt-3 space-y-1.5 text-[11px] text-slate-500">
                    {form.needs_grinding && <p>✓ Grinding prep included</p>}
                    {form.needs_moisture_mitigation && <p>✓ Moisture mitigation included</p>}
                    {(Number(form.linear_feet_cracks) || 0) > 0 && <p>✓ Crack repair: {form.linear_feet_cracks} lf</p>}
                    <p className="text-slate-400 pt-1">Pricing version {estimate.version}</p>
                  </div>
                </div>
              ) : (
                <p className="text-[12px] text-slate-400 py-8 text-center">Select a floor system and enter square feet to see the estimate.</p>
              )}
              <div className="mt-4">
                <Disclosure text="Preliminary range only. Final quote requires a site visit and detailed measurement." />
              </div>
            </SectionCard>

            <SectionCard index="→" title="Follow-up sequence" tag="Automated" tagTone="slate">
              <ol className="space-y-2 text-[12px] text-slate-600">
                <li className="flex gap-2"><span className="text-slate-400 font-mono">1.</span> <span><strong className="text-slate-900">Welcome email</strong> — sent immediately on lead creation</span></li>
                <li className="flex gap-2"><span className="text-slate-400 font-mono">2.</span> <span><strong className="text-slate-900">First follow-up</strong> — 2 days later</span></li>
                <li className="flex gap-2"><span className="text-slate-400 font-mono">3.</span> <span><strong className="text-slate-900">Second follow-up</strong> — 7 days later</span></li>
                <li className="flex gap-2"><span className="text-slate-400 font-mono">4.</span> <span><strong className="text-slate-900">Final reminder</strong> — 14 days later</span></li>
              </ol>
              <p className="mt-3 text-[11px] text-slate-400">Skips automatically if the lead is won or lost. Drafts are saved even if email isn't connected.</p>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}