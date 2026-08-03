import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/pricing";
import Disclosure from "@/components/vq/Disclosure";
import { PRICE_DISCLOSURE } from "@/lib/brand";
import { Loader2 } from "lucide-react";

export default function EstimateAdjuster({ lead, onSave }) {
  const [low, setLow] = useState(lead.adjusted_low ?? lead.estimate_low ?? 0);
  const [high, setHigh] = useState(lead.adjusted_high ?? lead.estimate_high ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (Number(low) <= 0 || Number(high) < Number(low)) return setError("High must be greater than low, and both above zero.");
    setError("");
    setSaving(true);
    await onSave(
      { adjusted_low: Number(low), adjusted_high: Number(high) },
      { action: "Preliminary estimate adjusted", detail: `${money(Number(low))} – ${money(Number(high))}`, category: "quote" }
    );
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-slate-500">
        Auto-calculated: {money(lead.estimate_low)} – {money(lead.estimate_high)} ({lead.square_feet || 0} sq ft, rules {lead.pricing_version || "n/a"})
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[12px]">Adjusted low</Label>
          <Input type="number" value={low} onChange={(e) => setLow(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px]">Adjusted high</Label>
          <Input type="number" value={high} onChange={(e) => setHigh(e.target.value)} />
        </div>
      </div>
      {error && <p className="text-[12px] text-red-600">{error}</p>}
      <Button onClick={save} disabled={saving} className="bg-slate-900 hover:bg-slate-800">
        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save adjusted range
      </Button>
      <Disclosure text={PRICE_DISCLOSURE} />
    </div>
  );
}