import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SalesMeasurementForm({ value, onChange }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[12px]">Floor area (sq ft) *</Label>
          <Input type="number" min="0" value={value.square_feet ?? ""} onChange={(e) => set("square_feet", Number(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px]">Space type</Label>
          <Select value={value.space_type || "garage"} onValueChange={(v) => set("space_type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["garage", "basement", "warehouse", "showroom", "patio", "commercial_kitchen", "retail", "other"].map((s) => (
                <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px]">Slab condition</Label>
          <Select value={value.condition || "fair"} onValueChange={(v) => set("condition", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="good">Good</SelectItem>
              <SelectItem value="fair">Fair</SelectItem>
              <SelectItem value="poor">Poor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px]">Coving (linear ft)</Label>
          <Input type="number" min="0" value={value.linear_feet_coving ?? 0} onChange={(e) => set("linear_feet_coving", Number(e.target.value))} />
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4">
        <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mb-3">Repairs & Prep</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[12px]">Crack repair (linear ft)</Label>
            <Input type="number" min="0" value={value.linear_feet_cracks ?? 0} onChange={(e) => set("linear_feet_cracks", Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Joint filler (linear ft)</Label>
            <Input type="number" min="0" value={value.linear_feet_joints ?? 0} onChange={(e) => set("linear_feet_joints", Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Patchwork spots (how many)</Label>
            <Input type="number" min="0" value={value.patch_count ?? 0} onChange={(e) => set("patch_count", Number(e.target.value))} />
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4">
        <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mb-3">Additional Work (beyond normal scope)</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[12px]">Excessive patch spots (count)</Label>
            <Input type="number" min="0" value={value.excessive_patch_count ?? 0} onChange={(e) => set("excessive_patch_count", Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Large holes / deep spalls (count)</Label>
            <Input type="number" min="0" value={value.large_patch_count ?? 0} onChange={(e) => set("large_patch_count", Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Demolition / removal (sq ft)</Label>
            <Input type="number" min="0" value={value.demolition_sqft ?? 0} onChange={(e) => set("demolition_sqft", Number(e.target.value))} />
          </div>
        </div>
        <div className="pt-3">
          <label className="flex items-center justify-between gap-3 text-[12px] text-slate-700">
            Excessive job site prep (extra plastics, masking, containment)
            <Switch checked={!!value.extra_prep} onCheckedChange={(v) => set("extra_prep", v)} />
          </label>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4">
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-3 text-[12px] text-slate-700">
            Diamond grinding prep
            <Switch checked={!!value.needs_grinding} onCheckedChange={(v) => set("needs_grinding", v)} />
          </label>
          <label className="flex items-center justify-between gap-3 text-[12px] text-slate-700">
            Moisture mitigation
            <Switch checked={!!value.needs_moisture_mitigation} onCheckedChange={(v) => set("needs_moisture_mitigation", v)} />
          </label>
        </div>
      </div>
    </div>
  );
}