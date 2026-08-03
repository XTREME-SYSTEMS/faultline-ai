import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/vq/PageHeader";
import SectionCard from "@/components/vq/SectionCard";
import LogoStudio from "@/components/close/LogoStudio";
import PackageBuilder from "@/components/close/PackageBuilder";
import ProposalGenerator from "@/components/close/ProposalGenerator";
import EmailTemplateGenerator from "@/components/close/EmailTemplateGenerator";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Users } from "lucide-react";

export default function Close() {
  const [leads, setLeads] = useState([]);
  const [leadId, setLeadId] = useState("");
  const [lead, setLead] = useState(null);
  const [brand, setBrand] = useState(null);

  useEffect(() => {
    (async () => {
      const ls = await base44.entities.Lead.list("-created_date", 50);
      setLeads(ls);
      if (ls[0]) setLeadId(ls[0].id);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const bs = await base44.entities.BrandAsset.list("-created_date", 1);
      if (bs[0]) setBrand(bs[0]);
    })();
  }, []);

  useEffect(() => {
    if (!leadId) { setLead(null); return; }
    (async () => {
      try { setLead(await base44.entities.Lead.get(leadId)); } catch { setLead(null); }
    })();
  }, [leadId]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="QUOTE TO CLOSE"
        title="Close"
        description="Turn a lead into a branded proposal with Good / Better / Best packages, follow-up email drafts, and a logo studio. All output is draft-only for human review — nothing is sent in preview mode."
      />

      <SectionCard index="01" title="Brand & logo" tag="Brand">
        <LogoStudio brand={brand} onSaved={setBrand} />
      </SectionCard>

      <SectionCard index="02" title="Opportunity" tag="Lead">
        {leads.length === 0 ? (
          <p className="text-[12px] text-slate-400">No leads yet. Create one from the Visualizer first.</p>
        ) : (
          <Select value={leadId} onValueChange={setLeadId}>
            <SelectTrigger className="w-full text-[13px]">
              <SelectValue placeholder="Select a lead" />
            </SelectTrigger>
            <SelectContent>
              {leads.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.customer_name} — {l.space_type} · {l.system_name || "flooring"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </SectionCard>

      {lead ? (
        <>
          <SectionCard index="03" title="Packages" tag="Good / Better / Best">
            <PackageBuilder lead={lead} />
          </SectionCard>
          <SectionCard index="04" title="Proposal generator" tag="Proposal">
            <ProposalGenerator lead={lead} brand={brand} />
          </SectionCard>
          <SectionCard index="05" title="Email template generator" tag="Follow-up">
            <EmailTemplateGenerator lead={lead} brand={brand} />
          </SectionCard>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 py-12 grid place-items-center text-center">
          <Users className="w-6 h-6 text-slate-300" />
          <p className="text-[13px] text-slate-400 mt-2">Select a lead to build packages, a proposal, and follow-up emails.</p>
        </div>
      )}
    </div>
  );
}