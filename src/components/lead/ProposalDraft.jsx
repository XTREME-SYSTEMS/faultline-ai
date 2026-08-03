import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { money } from "@/lib/pricing";
import { specsToText } from "@/lib/floorSpecs";
import { Loader2, FileText } from "lucide-react";

export default function ProposalDraft({ lead, onSave }) {
  const [text, setText] = useState(lead.proposal_draft || "");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const generate = async () => {
    setBusy(true);
    const draft = await base44.integrations.Core.InvokeLLM({
      prompt: `Write a professional flooring proposal DRAFT for a contractor to review. Never state a final price, completion date, warranty, engineering suitability, or code compliance — describe pricing only as a preliminary range subject to site verification.
Customer: ${lead.customer_name}
Space: ${lead.space_type}
System: ${lead.system_name} · finish ${lead.finish} · color ${lead.color_name}
Area: ${lead.square_feet} sq ft, condition ${lead.condition}
Prep: ${lead.needs_grinding ? "diamond grinding" : "no grinding"}${lead.needs_moisture_mitigation ? ", moisture mitigation" : ""}
Crack repair: ${lead.linear_feet_cracks || 0} lf, coving: ${lead.linear_feet_coving || 0} lf
${lead.has_joints ? "Joints: present — joint filler required" : ""}
Preliminary range: ${money(lead.adjusted_low ?? lead.estimate_low)} – ${money(lead.adjusted_high ?? lead.estimate_high)}
${lead.specifications && lead.specifications.length > 0 ? `Full scope of work specifications (${lead.floor_type || lead.system_name || ""}):\n${specsToText(lead.specifications)}` : "No detailed specs on file — generate from floor type on the lead."}
Sections: overview, scope of work (include every spec item as a line item — concrete grinding, surface preparation, perimeter protection with plastic and tape, moisture mitigation, joint filler, base coats, color coats, topcoats including polyaspartic / urethane / T200, cove base, final inspection), materials, preliminary investment range, assumptions and exclusions, next steps. Under 450 words.`,
    });
    setText(String(draft));
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="text-[12px]" onClick={generate} disabled={busy}>
          {busy ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <FileText className="w-3.5 h-3.5 mr-1.5" />}
          Generate draft
        </Button>
        <Button
          size="sm"
          className="text-[12px] bg-slate-900"
          disabled={!text || saving}
          onClick={async () => {
            setSaving(true);
            await onSave({ proposal_draft: text }, { action: "Proposal draft saved", category: "proposal" });
            setSaving(false);
          }}
        >
          {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />} Save draft
        </Button>
      </div>
      <Textarea
        rows={12}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Proposal draft appears here. Nothing is sent to the customer from preview mode."
        className="text-[13px] leading-relaxed"
      />
      <p className="text-[11px] text-slate-400">Draft only — no email, SMS, or WhatsApp is sent in preview mode.</p>
    </div>
  );
}