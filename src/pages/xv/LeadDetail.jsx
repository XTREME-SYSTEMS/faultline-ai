import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import SectionCard from "@/components/vq/SectionCard";
import PageHeader from "@/components/vq/PageHeader";
import Disclosure from "@/components/vq/Disclosure";
import EstimateAdjuster from "@/components/lead/EstimateAdjuster";
import ProposalDraft from "@/components/lead/ProposalDraft";
import FloorSpecEditor from "@/components/lead/FloorSpecEditor";
import MaskEditor from "@/components/visualizer/MaskEditor";
import { Image } from "@/components/ui/image";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AI_DISCLOSURE } from "@/lib/brand";
import { money } from "@/lib/pricing";
import { Loader2, ArrowLeft } from "lucide-react";

export default function LeadDetail() {
  const { id } = useParams();
  const [lead, setLead] = useState(null);
  const [viz, setViz] = useState([]);
  const [appts, setAppts] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [maskEdit, setMaskEdit] = useState(false);

  const load = async () => {
    const l = await base44.entities.Lead.get(id);
    setLead(l);
    const [v, a, r] = await Promise.all([
      base44.entities.Visualization.filter({ lead_id: id }),
      base44.entities.Appointment.filter({ lead_id: id }),
      base44.entities.ActivityReceipt.filter({ lead_id: id }, "-created_date"),
    ]);
    setViz(v); setAppts(a); setReceipts(r);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  if (!lead) return <div className="py-24 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  const patch = async (data, receipt) => {
    await base44.entities.Lead.update(lead.id, data);
    if (receipt) await base44.entities.ActivityReceipt.create({ lead_id: lead.id, actor: "Contractor", ...receipt });
    load();
  };

  return (
    <div className="space-y-5">
      <Link to="/app/xv/leads" className="inline-flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-900">
        <ArrowLeft className="w-3.5 h-3.5" /> All leads
      </Link>
      <PageHeader
        eyebrow={`Lead · ${lead.space_type?.replace(/_/g, " ") || "project"}`}
        title={lead.customer_name}
        description={[lead.email, lead.phone, lead.project_address].filter(Boolean).join(" · ")}
        actions={
          <Select value={lead.status} onValueChange={(v) => patch({ status: v }, { action: `Status set to ${v}`, category: "audit" })}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["new", "qualified", "estimate_sent", "proposal_sent", "follow_up", "won", "lost"].map((s) => (
                <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid lg:grid-cols-2 gap-5">
        <SectionCard index="01" title="Customer photo and mask" tag={`${lead.mask_coverage_pct ?? 0}% mask`} tagTone="slate">
          {lead.photo_url ? (
            maskEdit ? (
              <MaskEditor
                photoUrl={lead.photo_url}
                onMaskChange={(m) => setLead((l) => ({ ...l, mask_coverage_pct: m.coverage }))}
              />
            ) : (
              <Image src={lead.photo_url} alt="Project photo" className="w-full h-56 rounded-xl" />
            )
          ) : (
            <p className="text-[13px] text-slate-500">No photo on this lead.</p>
          )}
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" className="text-[12px]" onClick={() => setMaskEdit((v) => !v)}>
              {maskEdit ? "Close mask editor" : "Correct floor mask"}
            </Button>
            {maskEdit && (
              <Button
                size="sm"
                className="text-[12px] bg-slate-900"
                onClick={() => { patch({ mask_coverage_pct: lead.mask_coverage_pct }, { action: "Floor mask corrected", detail: `Coverage ${lead.mask_coverage_pct}%`, category: "mask" }); setMaskEdit(false); }}
              >
                Save mask review
              </Button>
            )}
          </div>
        </SectionCard>

        <SectionCard index="02" title="Visualization history" tag="AI concept">
          {viz.length ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {viz.sort((a, b) => a.option_index - b.option_index).map((v) => (
                  <div key={v.id} className={`rounded-lg overflow-hidden border ${v.selected ? "border-[#F5C542] ring-2 ring-[#F5C542]/30" : "border-slate-200"}`}>
                    <Image src={v.image_url} alt={v.label} className="w-full h-24" />
                    <p className="px-2 py-1.5 text-[10px] text-slate-500 truncate">0{v.option_index} {v.label}</p>
                  </div>
                ))}
              </div>
              <Disclosure text={AI_DISCLOSURE} />
            </div>
          ) : (
            <p className="text-[13px] text-slate-500">No visualizations stored for this lead.</p>
          )}
        </SectionCard>
      </div>

      <SectionCard index="03" title="Floor specifications" tag="Scope of work" tagTone="gold">
        <FloorSpecEditor lead={lead} onSave={patch} />
      </SectionCard>

      <div className="grid lg:grid-cols-2 gap-5">
        <SectionCard index="04" title="Preliminary estimate" tag="Contractor adjustable" tagTone="gold">
          <EstimateAdjuster lead={lead} onSave={patch} />
        </SectionCard>

        <SectionCard index="05" title="Proposal draft" tag="Draft only" tagTone="slate">
          <ProposalDraft lead={lead} onSave={patch} />
        </SectionCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <SectionCard index="06" title="Appointments and follow-up">
          {appts.length ? (
            <ul className="space-y-2">
              {appts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[13px] text-slate-900">{a.type.replace(/_/g, " ")} · {a.requested_date || "date open"}</p>
                    <p className="text-[11px] text-slate-500">{a.requested_window} window</p>
                  </div>
                  <Select
                    value={a.status}
                    onValueChange={async (v) => {
                      await base44.entities.Appointment.update(a.id, { status: v });
                      await base44.entities.ActivityReceipt.create({ lead_id: lead.id, actor: "Contractor", action: `Appointment ${v}`, category: "appointment" });
                      load();
                    }}
                  >
                    <SelectTrigger className="w-[140px] h-8 text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["requested", "confirmed", "completed", "cancelled", "no_show"].map((s) => (
                        <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-slate-500">No appointment requested yet.</p>
          )}
        </SectionCard>

        <SectionCard index="07" title="Activity and audit receipts" tag="Evidence" tagTone="slate">
          {receipts.length ? (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {receipts.map((r) => (
                <li key={r.id} className="border-l-2 border-slate-200 pl-3">
                  <p className="text-[13px] text-slate-900">{r.action}</p>
                  {r.detail && <p className="text-[11px] text-slate-500">{r.detail}</p>}
                  <p className="text-[10px] font-mono text-slate-400">{r.category} · {new Date(r.created_date).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-slate-500">No receipts recorded.</p>
          )}
        </SectionCard>
      </div>

      <p className="text-[11px] text-slate-400">
        Stored preliminary range: {money(lead.estimate_low)} – {money(lead.estimate_high)} · rules {lead.pricing_version || "n/a"}
      </p>
    </div>
  );
}