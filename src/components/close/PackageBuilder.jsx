import React, { useMemo } from "react";
import { buildPackages } from "@/lib/closeEngine";
import { money } from "@/lib/pricing";

export default function PackageBuilder({ lead }) {
  const packages = useMemo(() => buildPackages(lead), [lead]);
  const low = lead.adjusted_low ?? lead.estimate_low;
  const high = lead.adjusted_high ?? lead.estimate_high;

  return (
    <div>
      <p className="text-[12px] text-slate-500 mb-3">
        Derived from the preliminary range {money(low)} – {money(high)}. Prices are non-binding drafts for contractor review.
      </p>
      <div className="grid sm:grid-cols-3 gap-3">
        {packages.map((p) => (
          <div
            key={p.id}
            className={`rounded-xl border p-4 flex flex-col ${p.recommended ? "border-[#F5C542] bg-[#F5C542]/5 ring-1 ring-[#F5C542]/40" : "border-slate-200"}`}
          >
            {p.recommended ? (
              <span className="text-[10px] uppercase tracking-[0.12em] text-[#8a6a00] font-semibold">Recommended</span>
            ) : (
              <span className="text-[10px] uppercase tracking-[0.12em] text-slate-400 font-semibold">Package</span>
            )}
            <p className="text-[15px] font-semibold text-slate-900 mt-1">{p.name}</p>
            <p className="text-2xl font-semibold mt-1 text-slate-900">{money(p.price)}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{Math.round(p.margin * 100)}% target margin</p>
            <p className="text-[12px] text-slate-600 mt-3 leading-relaxed flex-1">{p.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}