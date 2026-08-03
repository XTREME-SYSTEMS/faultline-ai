import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CalendarCheck } from "lucide-react";

export default function ConsultationForm({ onSubmit, submitting, done }) {
  const [form, setForm] = useState({
    customer_name: "", email: "", phone: "", project_address: "",
    requested_date: "", requested_window: "morning", message: "",
  });
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <CalendarCheck className="w-5 h-5 mx-auto text-emerald-600" />
        <p className="mt-2 text-[14px] font-medium text-emerald-900">Consultation request received</p>
        <p className="text-[12px] text-emerald-700 mt-1">
          Your contractor will confirm the time. No appointment, price, or schedule is final yet.
        </p>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.customer_name || !form.email) return setError("Name and email are required.");
        setError("");
        onSubmit(form);
      }}
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[12px]">Full name</Label>
          <Input value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px]">Email</Label>
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px]">Phone</Label>
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px]">Project address</Label>
          <Input value={form.project_address} onChange={(e) => set("project_address", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px]">Preferred date</Label>
          <Input type="date" value={form.requested_date} onChange={(e) => set("requested_date", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px]">Time window</Label>
          <Select value={form.requested_window} onValueChange={(v) => set("requested_window", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["morning", "midday", "afternoon", "evening"].map((w) => (
                <SelectItem key={w} value={w}>{w}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-[12px]">Anything we should know?</Label>
        <Textarea rows={3} value={form.message} onChange={(e) => set("message", e.target.value)} />
      </div>
      {error && <p className="text-[12px] text-red-600">{error}</p>}
      <Button type="submit" disabled={submitting} className="w-full bg-slate-900 hover:bg-slate-800">
        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Request consultation
      </Button>
    </form>
  );
}