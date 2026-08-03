import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Image } from "@/components/ui/image";
import { Loader2, Upload, Sparkles, Save } from "lucide-react";

const DIRECTIONS = [
  { id: "revenue_gold", name: "Revenue Gold", palette: "#FFFFFF / #0A0A0A / #F5C542" },
  { id: "clarity_white", name: "Clarity White", palette: "#FFFFFF / #24262B / #C8CDD5" },
  { id: "closing_room", name: "Closing Room", palette: "#111214 / #FFFFFF / #D4AF37" },
];

const EMPTY = { company_name: "", tagline: "", brand_direction: "revenue_gold", primary_color: "#0A0A0A", accent_color: "#F5C542", email_signature: "" };

export default function LogoStudio({ brand, onSaved }) {
  const [form, setForm] = useState(brand || EMPTY);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (brand) setForm(brand); }, [brand]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const upload = async (file) => {
    setBusy(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set("logo_url", file_url);
    } finally { setBusy(false); }
  };

  const generate = async () => {
    setBusy(true);
    try {
      const { url } = await base44.integrations.Core.GenerateImage({
        prompt: `Minimalist professional contractor company logo for "${form.company_name || "VisualQuote Pro"}", flat vector style, bold geometric mark, ${form.accent_color || "#F5C542"} accent on dark background, clean, modern, centered, no text watermark.`,
      });
      set("logo_url", url);
    } finally { setBusy(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      const saved = form.id
        ? await base44.entities.BrandAsset.update(form.id, form)
        : await base44.entities.BrandAsset.create(form);
      setForm(saved);
      onSaved?.(saved);
    } finally { setSaving(false); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="space-y-4">
        <div>
          <Label className="text-[11px] text-slate-500">Company name</Label>
          <Input value={form.company_name || ""} onChange={(e) => set("company_name", e.target.value)} placeholder="VisualQuote Pro" className="mt-1" />
        </div>
        <div>
          <Label className="text-[11px] text-slate-500">Tagline</Label>
          <Input value={form.tagline || ""} onChange={(e) => set("tagline", e.target.value)} placeholder="Flooring concepts, quoted fast" className="mt-1" />
        </div>
        <div>
          <Label className="text-[11px] text-slate-500">Brand direction</Label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {DIRECTIONS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => set("brand_direction", d.id)}
                className={`text-left rounded-lg border px-2.5 py-2 transition-colors ${form.brand_direction === d.id ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:bg-slate-50"}`}
              >
                <p className="text-[12px] font-semibold text-slate-900">{d.name}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{d.palette}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[11px] text-slate-500">Primary color</Label>
            <div className="flex items-center gap-2 mt-1">
              <input type="color" value={form.primary_color || "#0A0A0A"} onChange={(e) => set("primary_color", e.target.value)} className="w-8 h-8 rounded border border-slate-200" />
              <Input value={form.primary_color || ""} onChange={(e) => set("primary_color", e.target.value)} className="font-mono text-[12px]" />
            </div>
          </div>
          <div>
            <Label className="text-[11px] text-slate-500">Accent color</Label>
            <div className="flex items-center gap-2 mt-1">
              <input type="color" value={form.accent_color || "#F5C542"} onChange={(e) => set("accent_color", e.target.value)} className="w-8 h-8 rounded border border-slate-200" />
              <Input value={form.accent_color || ""} onChange={(e) => set("accent_color", e.target.value)} className="font-mono text-[12px]" />
            </div>
          </div>
        </div>
        <div>
          <Label className="text-[11px] text-slate-500">Email signature</Label>
          <Textarea value={form.email_signature || ""} onChange={(e) => set("email_signature", e.target.value)} rows={2} placeholder="Thanks, — The VisualQuote Pro team" className="mt-1 text-[12px]" />
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-[11px] text-slate-500">Logo</Label>
        <div className="rounded-xl border border-slate-200 bg-slate-50 aspect-[16/9] grid place-items-center overflow-hidden">
          {form.logo_url ? (
            <Image src={form.logo_url} fittingType="fit" className="w-full h-full" />
          ) : (
            <p className="text-[12px] text-slate-400">No logo yet — upload or generate</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="text-[12px]" disabled={busy} onClick={() => document.getElementById("logo-upload").click()}>
            {busy ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
            Upload logo
          </Button>
          <Button size="sm" variant="outline" className="text-[12px]" disabled={busy} onClick={generate}>
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Generate logo
          </Button>
          <Button size="sm" className="text-[12px] bg-slate-900" disabled={saving || !form.company_name} onClick={save}>
            {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            <Save className="w-3.5 h-3.5 mr-1.5" />
            Save brand
          </Button>
          <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </div>
        <p className="text-[11px] text-slate-400">Logo attaches to generated proposals and email drafts. AI generation uses your company name and accent color.</p>
      </div>
    </div>
  );
}