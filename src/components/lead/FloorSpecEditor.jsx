import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FileText, Save, RefreshCw } from "lucide-react";
import { FLOOR_TYPE_OPTIONS, generateSpecs, specsToText } from "@/lib/floorSpecs";

// Lets the contractor type in a general floor type and auto-generates the
// full specification list. Specs are saved to the lead and flow into proposals.
export default function FloorSpecEditor({ lead, onSave }) {
  const [floorType, setFloorType] = useState(lead.floor_type || lead.system_name || "");
  const [specs, setSpecs] = useState(lead.specifications || []);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customText, setCustomText] = useState("");

  const opts = useMemo(
    () => ({
      needs_grinding: lead.needs_grinding,
      needs_moisture_mitigation: lead.needs_moisture_mitigation,
      has_cracks: (Number(lead.linear_feet_cracks) || 0) > 0,
      has_coving: (Number(lead.linear_feet_coving) || 0) > 0,
      has_joints: lead.has_joints,
    }),
    [lead]
  );

  const generate = () => {
    const generated = generateSpecs(floorType, opts);
    setSpecs(generated);
    setCustomText(specsToText(generated));
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave(
        { floor_type: floorType, specifications: specs },
        { action: `Floor specs generated for ${floorType}`, detail: `${specs.length} spec items`, category: "proposal" }
      );
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <Input
            list="floor-type-options"
            value={floorType}
            onChange={(e) => setFloorType(e.target.value)}
            placeholder="Type the general floor type (e.g. Metallic Epoxy, Flake Epoxy…)"
            className="text-[13px]"
          />
          <datalist id="floor-type-options">
            {FLOOR_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        <Button size="sm" variant="outline" className="text-[12px]" onClick={generate} disabled={!floorType}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Generate specs
        </Button>
      </div>

      {specs.length > 0 && (
        <>
          {editing ? (
            <div className="space-y-2">
              <Textarea
                rows={14}
                value={customText}
                onChange={(e) => {
                  setCustomText(e.target.value);
                  // parse back into specs array from the textarea
                  const lines = e.target.value.split("\n").filter((l) => l.trim());
                  const parsed = lines
                    .map((l) => {
                      const m = l.replace(/^\d+\.\s*/, "").split(": ");
                      return m.length >= 2
                        ? { label: m[0], detail: m.slice(1).join(": ") }
                        : { label: m[0], detail: "" };
                    })
                    .filter((s) => s.label);
                  setSpecs(parsed);
                }}
                className="text-[12px] leading-relaxed"
                placeholder="Specs appear here. Edit freely."
              />
              <div className="flex gap-2">
                <Button size="sm" className="text-[12px] bg-slate-900" onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                  Save to lead
                </Button>
                <Button size="sm" variant="ghost" className="text-[12px]" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  {specs.length} specification items · {floorType}
                </p>
                <Button size="sm" variant="ghost" className="text-[11px] h-7" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              </div>
              <ol className="space-y-1.5 list-decimal ml-4">
                {specs.map((s, i) => (
                  <li key={i} className="text-[12px] text-slate-700">
                    <span className="font-medium text-slate-900">{s.label}</span>
                    {s.detail && <span className="text-slate-500"> — {s.detail}</span>}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
      {specs.length === 0 && !editing && (
        <p className="text-[12px] text-slate-400">
          Type a floor type above and click "Generate specs" to auto-populate the full scope of work. These specs flow into the proposal.
        </p>
      )}
    </div>
  );
}