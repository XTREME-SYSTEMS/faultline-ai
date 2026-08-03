import React from "react";
import { money } from "@/lib/pricing";
import Disclosure from "@/components/vq/Disclosure";
import { PRICE_DISCLOSURE as PD } from "@/lib/brand";

export default function QuoteRange({ range, sqft, systemName }) {
  if (!range || !sqft) {
    return <p className="text-[13px] text-slate-500">Enter a floor area to see a preliminary range.</p>;
  }
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-slate-900 text-white p-5">
        <p className="text-[10px] uppercase tracking-[0.16em] text-[#F5C542]">Preliminary range</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight">
          {money(range.low)} <span className="text-slate-500 text-xl">–</span> {money(range.high)}
        </p>
        <p className="mt-2 text-[12px] text-slate-400">
          {systemName || "Selected system"} · {sqft.toLocaleString()} sq ft · rules {range.version}
        </p>
      </div>
      <Disclosure text={PD} />
    </div>
  );
}