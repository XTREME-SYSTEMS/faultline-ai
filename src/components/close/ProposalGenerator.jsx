import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from "react-markdown";
import { buildPackages, proposalPrompt } from "@/lib/closeEngine";
import { computeRange } from "@/lib/pricing";
import { Loader2, FileText, Save, Check, Send } from "lucide-react";

export default function ProposalGenerator({ lead, brand }) {
  const [md, setMd] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [emailing, setEmailing] = useState(false);
  const [emailed, setEmailed] = useState(false);
  const [err, setErr] = useState("");

  // When the lead has no preliminary estimate, recompute it from the linked
  // FloorSystem's base rates + the active PricingRule so packages are priced.
  const resolveRange = async () => {
    if (Number(lead.estimate_low) || Number(lead.estimate_high)) return null;
    if (!lead.system_id) return null;
    const [sys, rules] = await Promise.all([
      base44.entities.FloorSystem.filter({ active: true }),
      base44.entities.PricingRule.filter({ status: "active" }),
    ]);
    const system = sys.find((s) => s.id === lead.system_id);
    if (!system) return null;
    return computeRange({
      square_feet: lead.square_feet,
      condition: lead.condition,
      needs_grinding: lead.needs_grinding,
      needs_moisture_mitigation: lead.needs_moisture_mitigation,
      linear_feet_cracks: lead.linear_feet_cracks,
      linear_feet_coving: lead.linear_feet_coving,
      base_rate_low: system.base_rate_low,
      base_rate_high: system.base_rate_high,
    }, rules[0]);
  };

  const generate = async () => {
    setBusy(true);
    setSavedId(null);
    try {
      const range = await resolveRange();
      const packages = buildPackages(lead, range);
      const out = await base44.integrations.Core.InvokeLLM({ prompt: proposalPrompt(lead, packages, brand) });
      setMd(String(out));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const range = await resolveRange();
      const packages = buildPackages(lead, range);
      const rec = await base44.entities.Proposal.create({
        lead_id: lead.id,
        company_name: brand?.company_name || "",
        scope_summary: `${lead.system_name || "Flooring"} · ${lead.space_type} · ${lead.square_feet || "—"} sq ft`,
        packages,
        content_markdown: md,
        version: "v1",
        status: "draft",
      });
      setSavedId(rec.id);
    } finally {
      setSaving(false);
    }
  };

  const emailProposal = async () => {
    setEmailing(true);
    setErr("");
    setEmailed(false);
    try {
      const res = await base44.functions.invoke("gmail", {
        action: "send",
        to: lead.email,
        subject: `Flooring proposal for ${lead.customer_name}`,
        text: md,
      });
      if (res.data?.ok) setEmailed(true);
      else setErr(res.data?.error || "Send failed");
    } catch (e) {
      setErr(e.response?.data?.error || e.message || "Send failed — is Gmail connected in Settings?");
    } finally {
      setEmailing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="text-[12px]" disabled={busy} onClick={generate}>
          {busy ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <FileText className="w-3.5 h-3.5 mr-1.5" />}
          Generate proposal
        </Button>
        <Button size="sm" className="text-[12px] bg-slate-900" disabled={!md || saving} onClick={save}>
          {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
          Save version
        </Button>
        <Button size="sm" className="text-[12px] bg-[#F5C542] text-slate-900 hover:bg-[#e9b92f]" disabled={!md || !lead?.email || emailing} onClick={emailProposal}>
          {emailing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
          Email proposal {lead?.email ? `to ${lead.email}` : ""}
        </Button>
        {savedId && <span className="inline-flex items-center text-[12px] text-emerald-600 gap-1 self-center"><Check className="w-3.5 h-3.5" /> Saved as draft v1</span>}
        {emailed && <span className="inline-flex items-center text-[12px] text-emerald-600 gap-1 self-center"><Check className="w-3.5 h-3.5" /> Emailed</span>}
        {err && <span className="text-[12px] text-red-600 self-center">{err}</span>}
        {!lead?.email && <span className="text-[11px] text-slate-400 self-center">Add a customer email on the lead to send.</span>}
      </div>

      {md ? (
        <div className="grid lg:grid-cols-2 gap-4">
          <Textarea value={md} onChange={(e) => setMd(e.target.value)} rows={22} className="text-[12px] leading-relaxed font-mono" />
          <div className="rounded-xl border border-slate-200 bg-white p-5 overflow-y-auto max-h-[560px]">
            <article className="text-[13px] leading-relaxed text-slate-700 [&_h1]:text-[18px] [&_h1]:font-semibold [&_h1]:text-slate-900 [&_h1]:mb-2 [&_h2]:text-[14px] [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h2]:mt-4 [&_h2]:mb-1.5 [&_li]:ml-4 [&_p]:my-1.5">
              <ReactMarkdown>{md}</ReactMarkdown>
            </article>
          </div>
        </div>
      ) : (
        <p className="text-[12px] text-slate-400">Generate a branded proposal with Good / Better / Best packages, then email it to the customer via your connected Gmail.</p>
      )}
    </div>
  );
}