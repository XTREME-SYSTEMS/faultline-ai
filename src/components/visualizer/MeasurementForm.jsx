import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function MeasurementForm({ value, onChange }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Label className="text-[12px]">Floor area (sq ft)</Label>
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
        <Label className="text-[12px]">Crack repair (linear ft)</Label>
        <Input type="number" min="0" value={value.linear_feet_cracks ?? 0} onChange={(e) => set("linear_feet_cracks", Number(e.target.value))} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[12px]">Coving (linear ft)</Label>
        <Input type="number" min="0" value={value.linear_feet_coving ?? 0} onChange={(e) => set("linear_feet_coving", Number(e.target.value))} />
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
      <div className="space-y-3 pt-1">
        <label className="flex items-center justify-between gap-3 text-[12px] text-slate-700">
          Diamond grinding prep
          <Switch checked={!!value.needs_grinding} onCheckedChange={(v) => set("needs_grinding", v)} />
        </label>
        <label className="flex items-center justify-between gap-3 text-[12px] text-slate-700">
          Moisture mitigation
          <Switch checked={!!value.needs_moisture_mitigation} onCheckedChange={(v) => set("needs_moisture_mitigation", v)} />
        </label>
        <label className="flex items-center justify-between gap-3 text-[12px] text-slate-700">
          Has joints (needs filler)
          <Switch checked={!!value.has_joints} onCheckedChange={(v) => set("has_joints", v)} />
        </label>
      </div>
    </div>
  );
}