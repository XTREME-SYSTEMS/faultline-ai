import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/vq/PageHeader";
import EmptyState from "@/components/vq/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computeRange, money } from "@/lib/pricing";
import { Loader2, Calculator, Plus } from "lucide-react";

const FIELDS = [
  ["version", "Version label", "text"],
  ["mobilization_fee", "Mobilization fee ($)", "number"],
  ["min_job_price", "Minimum job price ($)", "number"],
  ["prep_grinding_rate", "Grinding prep ($/sqft)", "number"],
  ["moisture_mitigation_rate", "Moisture mitigation ($/sqft)", "number"],
  ["crack_repair_rate", "Crack repair ($/lf)", "number"],
  ["coving_rate", "Coving ($/lf)", "number"],
  ["range_spread_pct", "Range spread (0.15 = 15%)", "number"],
];

export default function Pricing() {
  const [rules, setRules] = useState(null);
  const [draft, setDraft] = useState(null);

  const load = () => base44.entities.PricingRule.list("-created_date", 50).then(setRules);
  useEffect(() => { load(); }, []);

  if (!rules) return <div className="py-24 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  const active = rules.find((r) => r.status === "active");
  const fixture = active
    ? computeRange({ square_feet: 600, condition: "fair", needs_grinding: true, linear_feet_cracks: 20, linear_feet_coving: 0, base_rate_low: 6, base_rate_high: 9 }, active)
    : null;

  const save = async () => {
    const payload = {};
    FIELDS.forEach(([k, , type]) => (payload[k] = type === "number" ? Number(draft[k]) || 0 : draft[k]));
    payload.notes = draft.notes || "";
    payload.status = draft.status || "draft";
    if (draft.id) await base44.entities.PricingRule.update(draft.id, payload);
    else await base44.entities.PricingRule.create(payload);
    setDraft(null);
    load();
  };

  const activate = async (rule) => {
    await Promise.all(rules.filter((r) => r.status === "active").map((r) => base44.entities.PricingRule.update(r.id, { status: "archived" })));
    await base44.entities.PricingRule.update(rule.id, { status: "active" });
    await base44.entities.ActivityReceipt.create({ actor: "Contractor", action: `Pricing rules ${rule.version} activated`, category: "audit" });
    load();
  };

  return (
    <div>
      <PageHeader
        eyebrow="Configuration"
        title="Versioned pricing rules"
        description="One active version drives every preliminary range. Older versions are archived, never deleted, so past quotes stay auditable."
        actions={
          <Button className="bg-slate-900" onClick={() => setDraft({ version: `v${rules.length + 1}.0`, status: "draft", range_spread_pct: 0.15 })}>
            <Plus className="w-4 h-4 mr-1.5" /> New version
          </Button>
        }
      />

      {fixture && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Quote fixture · 600 sq ft, fair slab, grinding, 20 lf cracks, $6–9/sqft</p>
          <p className="mt-1 text-[20px] font-semibold text-slate-900">{money(fixture.low)} – {money(fixture.high)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Computed with active rules {fixture.version}</p>
        </div>
      )}

      {draft && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-5 space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FIELDS.map(([k, label, type]) => (
              <div key={k} className="space-y-1.5">
                <Label className="text-[12px]">{label}</Label>
                <Input type={type} step="0.01" value={draft[k] ?? ""} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button className="bg-slate-900" disabled={!draft.version} onClick={save}>Save version</Button>
            <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {!rules.length ? (
        <EmptyState icon={Calculator} title="No pricing versions yet" hint="Create a version and activate it to power the preliminary range." />
      ) : (
        <div className="space-y-3">
          {rules.map((r) => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-slate-900">
                  {r.version}
                  <span className={`ml-2 text-[10px] uppercase tracking-[0.1em] px-2 py-0.5 rounded-md ${
                    r.status === "active" ? "bg-emerald-100 text-emerald-700" : r.status === "draft" ? "bg-[#F5C542]/25 text-[#8a6a00]" : "bg-slate-100 text-slate-500"
                  }`}>{r.status}</span>
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Mobilization ${r.mobilization_fee} · min ${r.min_job_price} · grinding ${r.prep_grinding_rate}/sqft · spread {Math.round((r.range_spread_pct || 0) * 100)}%
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-[12px]" onClick={() => setDraft(r)}>Edit</Button>
                {r.status !== "active" && (
                  <Button size="sm" className="text-[12px] bg-slate-900" onClick={() => activate(r)}>Activate</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}