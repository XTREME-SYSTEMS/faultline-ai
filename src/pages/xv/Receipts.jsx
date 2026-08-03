import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/vq/PageHeader";
import EmptyState from "@/components/vq/EmptyState";
import { Loader2, ScrollText } from "lucide-react";

export default function Receipts() {
  const [items, setItems] = useState(null);
  const [category, setCategory] = useState("all");

  useEffect(() => { base44.entities.ActivityReceipt.list("-created_date", 200).then(setItems); }, []);

  if (!items) return <div className="py-24 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  const shown = category === "all" ? items : items.filter((i) => i.category === category);

  return (
    <div>
      <PageHeader eyebrow="Evidence" title="Activity, validation, and audit receipts" description="Every photo, mask correction, visualization, quote, proposal, and appointment action leaves a receipt." />
      <div className="flex flex-wrap gap-2 mb-5">
        {["all", "photo", "mask", "visualization", "quote", "proposal", "appointment", "validation", "audit"].map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1.5 rounded-full text-[12px] border transition-colors ${
              category === c ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      {!shown.length ? (
        <EmptyState icon={ScrollText} title="No receipts in this category" hint="Receipts are written automatically as work happens." />
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
          {shown.map((r) => (
            <div key={r.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] font-medium text-slate-900">{r.action}</p>
                <span className="text-[10px] uppercase tracking-[0.1em] text-slate-400">{r.category}</span>
              </div>
              {r.detail && <p className="mt-1 text-[12px] text-slate-500">{r.detail}</p>}
              <p className="mt-1 text-[10px] font-mono text-slate-400">
                {r.actor || "system"} · {new Date(r.created_date).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}