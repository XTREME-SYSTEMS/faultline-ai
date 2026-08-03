import React from "react";
import { BRAND_DIRECTIONS } from "@/lib/brand";

export default function BrandGate({ selected, onSelect }) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Brand gate: select one direction</p>
      <div className="grid sm:grid-cols-3 gap-3">
        {BRAND_DIRECTIONS.map((b) => (
          <button
            key={b.key}
            type="button"
            onClick={() => onSelect(b.key)}
            className={`text-left rounded-xl border p-4 transition-all ${
              selected === b.key ? "border-[#F5C542] ring-2 ring-[#F5C542]/30" : "border-slate-200 hover:border-slate-400"
            }`}
          >
            <p className="text-[14px] font-semibold text-slate-900">{b.name}</p>
            <p className="mt-1 text-[12px] text-slate-500 leading-relaxed">{b.description}</p>
            <p className="mt-3 font-mono text-[10px] text-slate-400">{b.swatches.join(" / ")}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-400">{b.status}</p>
          </button>
        ))}
      </div>
      <p className="text-[12px] text-slate-500">
        Precision Gold is applied as the provisional preview direction only. No direction is approved until the operator confirms.
      </p>
    </div>
  );
}