import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/vq/PageHeader";
import EmptyState from "@/components/vq/EmptyState";
import { money } from "@/lib/pricing";
import { Image } from "@/components/ui/image";
import { Loader2, Users, ArrowRight } from "lucide-react";
import FollowupTracker from "@/components/lead/FollowupTracker";

const STATUS_TONE = {
  new: "bg-slate-900 text-white",
  qualified: "bg-[#F5C542] text-slate-900",
  estimate_sent: "bg-blue-100 text-blue-700",
  proposal_sent: "bg-indigo-100 text-indigo-700",
  follow_up: "bg-amber-100 text-amber-700",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-red-100 text-red-700",
};

export default function Leads() {
  const [leads, setLeads] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    base44.entities.Lead.list("-created_date", 100).then(setLeads);
  }, []);

  if (!leads) return <div className="py-24 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  const shown = filter === "all" ? leads : leads.filter((l) => l.status === filter);

  return (
    <div>
      <PageHeader eyebrow="Contractor console" title="Leads" description="Every submitted VisualQuote with its photo, mask coverage, selected system, and preliminary range." />

      <FollowupTracker leads={leads} />

      <div className="flex flex-wrap gap-2 mb-5">
        {["all", "new", "qualified", "estimate_sent", "proposal_sent", "follow_up", "won", "lost"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-[12px] border transition-colors ${
              filter === s ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
            }`}
          >
            {s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {!shown.length ? (
        <EmptyState icon={Users} title="No leads here yet" hint="Submitted VisualQuotes from the visualizer appear in this list." />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {shown.map((l) => (
            <Link
              key={l.id}
              to={`/app/xv/leads/${l.id}`}
              className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow"
            >
              {l.photo_url ? (
                <Image src={l.photo_url} alt="Project" className="w-full h-36" />
              ) : (
                <div className="w-full h-36 bg-slate-100" />
              )}
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[14px] font-semibold text-slate-900 truncate">{l.customer_name}</p>
                  <span className={`text-[10px] uppercase tracking-[0.1em] px-2 py-1 rounded-md ${STATUS_TONE[l.status] || "bg-slate-100 text-slate-600"}`}>
                    {(l.status || "new").replace(/_/g, " ")}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-slate-500 truncate">{l.system_name} · {l.finish} · {l.color_name}</p>
                <p className="mt-3 text-[13px] font-medium text-slate-900">
                  {money(l.adjusted_low ?? l.estimate_low)} – {money(l.adjusted_high ?? l.estimate_high)}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {l.square_feet || 0} sq ft · mask {l.mask_coverage_pct ?? 0}%
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-[12px] text-slate-500 group-hover:text-slate-900">
                  Open lead <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}