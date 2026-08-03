import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/vq/PageHeader";
import EmptyState from "@/components/vq/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Layers, Plus } from "lucide-react";

export default function Systems() {
  const [systems, setSystems] = useState(null);
  const [draft, setDraft] = useState(null);

  const load = () => base44.entities.FloorSystem.list("-created_date", 100).then(setSystems);
  useEffect(() => { load(); }, []);

  if (!systems) return <div className="py-24 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  const save = async () => {
    const payload = {
      name: draft.name,
      category: draft.category || "epoxy",
      description: draft.description || "",
      finishes: (draft.finishesText || "").split(",").map((s) => s.trim()).filter(Boolean),
      colors: (draft.colorsText || "").split(",").map((s) => s.trim()).filter(Boolean).map((pair) => {
        const [n, hex] = pair.split(":").map((x) => x.trim());
        return { name: n, hex: hex || "#888888" };
      }),
      base_rate_low: Number(draft.base_rate_low) || 0,
      base_rate_high: Number(draft.base_rate_high) || 0,
      active: draft.active !== false,
    };
    if (draft.id) await base44.entities.FloorSystem.update(draft.id, payload);
    else await base44.entities.FloorSystem.create(payload);
    setDraft(null);
    load();
  };

  return (
    <div>
      <PageHeader
        eyebrow="Configuration"
        title="Floor systems and colors"
        description="Systems, finishes, colors, and per-square-foot base rates that drive the visualizer and the preliminary range."
        actions={
          <Button className="bg-slate-900" onClick={() => setDraft({ finishesText: "", colorsText: "", active: true })}>
            <Plus className="w-4 h-4 mr-1.5" /> New system
          </Button>
        }
      />

      {draft && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label className="text-[12px]">Name</Label>
              <Input value={draft.name || ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-[12px]">Category</Label>
              <Input value={draft.category || ""} placeholder="epoxy / polished_concrete / coating" onChange={(e) => setDraft({ ...draft, category: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-[12px]">Finishes (comma separated)</Label>
              <Input value={draft.finishesText || ""} onChange={(e) => setDraft({ ...draft, finishesText: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-[12px]">Colors (Name:#hex, comma separated)</Label>
              <Input value={draft.colorsText || ""} onChange={(e) => setDraft({ ...draft, colorsText: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-[12px]">Base rate low ($/sqft)</Label>
              <Input type="number" value={draft.base_rate_low || ""} onChange={(e) => setDraft({ ...draft, base_rate_low: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-[12px]">Base rate high ($/sqft)</Label>
              <Input type="number" value={draft.base_rate_high || ""} onChange={(e) => setDraft({ ...draft, base_rate_high: e.target.value })} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label className="text-[12px]">Description</Label>
              <Input value={draft.description || ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
          </div>
          <div className="flex items-center gap-3">
            <Button className="bg-slate-900" disabled={!draft.name} onClick={save}>Save system</Button>
            <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {!systems.length ? (
        <EmptyState icon={Layers} title="No floor systems configured" hint="Add a system so the visualizer and pricing engine have something to work with." />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {systems.map((s) => (
            <div key={s.id} className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-slate-900 truncate">{s.name}</p>
                  <p className="text-[11px] uppercase tracking-[0.1em] text-slate-400">{s.category?.replace(/_/g, " ")}</p>
                </div>
                <Switch
                  checked={s.active !== false}
                  onCheckedChange={async (v) => { await base44.entities.FloorSystem.update(s.id, { active: v }); load(); }}
                />
              </div>
              <p className="mt-2 text-[12px] text-slate-500 leading-relaxed line-clamp-2">{s.description}</p>
              <div className="mt-3 flex gap-1.5">
                {(s.colors || []).map((c) => (
                  <span key={c.name} title={c.name} className="w-5 h-5 rounded-full border border-black/10" style={{ background: c.hex }} />
                ))}
              </div>
              <p className="mt-3 text-[13px] font-medium text-slate-900">${s.base_rate_low} – ${s.base_rate_high} / sq ft</p>
              <p className="mt-1 text-[11px] text-slate-400">{(s.finishes || []).join(" · ")}</p>
              {s.sheen_levels && s.sheen_levels.length > 0 && (
                <p className="mt-1.5 text-[10px] text-slate-400">Sheen: {s.sheen_levels.join(" · ")}</p>
              )}
              {s.product_skus && s.product_skus.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {s.product_skus.slice(0, 4).map((sku) => (
                    <span key={sku} className="px-1.5 py-0.5 rounded text-[9px] bg-slate-100 text-slate-500 font-mono">{sku}</span>
                  ))}
                  {s.product_skus.length > 4 && <span className="text-[9px] text-slate-400">+{s.product_skus.length - 4}</span>}
                </div>
              )}
              <Button
                size="sm"
                variant="outline"
                className="mt-3 text-[12px]"
                onClick={() => setDraft({
                  ...s,
                  finishesText: (s.finishes || []).join(", "),
                  colorsText: (s.colors || []).map((c) => `${c.name}:${c.hex}`).join(", "),
                })}
              >
                Edit
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}