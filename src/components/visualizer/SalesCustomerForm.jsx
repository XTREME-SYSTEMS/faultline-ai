import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SalesCustomerForm({ value, onChange }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[12px]">Customer name *</Label>
          <Input value={value.customer_name || ""} onChange={(e) => set("customer_name", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px]">Phone</Label>
          <Input value={value.phone || ""} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px]">Email *</Label>
          <Input type="email" value={value.email || ""} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px]">Project address</Label>
          <Input value={value.project_address || ""} onChange={(e) => set("project_address", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px]">Desired installation date</Label>
          <Input type="date" value={value.desired_install_date || ""} onChange={(e) => set("desired_install_date", e.target.value)} />
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4">
        <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mb-3">Discount (24-hour offer)</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[12px]">Discount type</Label>
            <Select value={value.discount_type || "amount"} onValueChange={(v) => set("discount_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="amount">Flat amount ($)</SelectItem>
                <SelectItem value="pct">Percentage (%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">{value.discount_type === "pct" ? "Discount %" : "Discount $"}</Label>
            <Input type="number" min="0" value={value.discount_value ?? ""} onChange={(e) => set("discount_value", Number(e.target.value))} />
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">Valid only if the customer signs or calls back within 24 hours of receiving the proposal.</p>
      </div>

      <div className="border-t border-slate-200 pt-4">
        <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mb-3">Floor Logo (optional)</p>
        <div className="space-y-1.5">
          <Label className="text-[12px]">Logo to install in the floor (describe)</Label>
          <Textarea rows={2} placeholder="e.g. Company logo, sports team logo, family monogram — describe size and placement" value={value.floor_logo_description || ""} onChange={(e) => set("floor_logo_description", e.target.value)} />
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4">
        <div className="space-y-1.5">
          <Label className="text-[12px]">Notes</Label>
          <Textarea rows={2} placeholder="Any additional notes for this proposal" value={value.notes || ""} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </div>
    </div>
  );
}