import React from "react";
import PageHeader from "@/components/vq/PageHeader";
import SectionCard from "@/components/vq/SectionCard";
import { ShieldCheck, Ban, Check } from "lucide-react";

const ALLOWED = ["Discovery", "Architecture", "Draft code", "Sandbox changes", "Preview builds", "Sample data", "Tests", "Screenshots", "Validation receipts", "Repair recommendations", "Rollback documentation"];
const BLOCKED = ["Production deployment", "Default-branch merge", "Live database migration", "Secret changes", "Billing or spending", "Paid AI generation at scale", "Live email, SMS, or WhatsApp", "Payment activation", "Domain changes", "Public publishing", "Deletion or destructive operations"];
const VIZZY_NEVER = ["Final price", "Schedule or completion date", "Warranty", "Engineering suitability", "Code compliance"];

export default function Guardrails() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Governed handoff"
        title="Guardrails and operating authority"
        description="VisualQuote AI runs in preview-only mode under Strategic Minds AUTO BUILDER controls. Protected actions stay blocked until an operator approves them."
      />

      <div className="grid lg:grid-cols-2 gap-5">
        <SectionCard index="01" title="Allowed in this phase" tag="Draft + preview" tagTone="green">
          <ul className="space-y-2">
            {ALLOWED.map((a) => (
              <li key={a} className="flex items-center gap-2 text-[13px] text-slate-700">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> {a}
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard index="02" title="Blocked without operator approval" tag="Protected" tagTone="slate">
          <ul className="space-y-2">
            {BLOCKED.map((b) => (
              <li key={b} className="flex items-center gap-2 text-[13px] text-slate-700">
                <Ban className="w-3.5 h-3.5 text-red-500 shrink-0" /> {b}
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <SectionCard index="03" title="Vizzy limits" tag="Assistant policy" tagTone="gold">
          <p className="text-[13px] text-slate-600 leading-relaxed">
            Vizzy explains floor systems, guides photo capture, helps correct masks, compares finishes, explains quote
            assumptions, summarizes leads, and prepares communication drafts. Vizzy never commits to:
          </p>
          <ul className="mt-3 space-y-2">
            {VIZZY_NEVER.map((v) => (
              <li key={v} className="flex items-center gap-2 text-[13px] text-slate-700">
                <Ban className="w-3.5 h-3.5 text-red-500 shrink-0" /> {v}
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard index="04" title="Secrets and rollback" tag="Server-side" tagTone="slate">
          <ul className="space-y-3 text-[13px] text-slate-700">
            <li className="flex gap-2"><ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" /> No API key or provider secret is exposed to the browser. All AI and platform calls run through the managed server-side bridge.</li>
            <li className="flex gap-2"><ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" /> Rollback: pricing versions are archived rather than deleted, original customer photos are immutable, and every mask, quote, and proposal change is receipted for reversal.</li>
            <li className="flex gap-2"><ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" /> Every AI concept carries its disclosure label, and every price is labeled preliminary.</li>
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}