import React from "react";

export default function SectionCard({ index, title, tag, tagTone = "gold", children, className = "" }) {
  const tones = {
    gold: "bg-[#F5C542]/15 text-[#8a6a00] border-[#F5C542]/50",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  return (
    <section className={`bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${className}`}>
      <header className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          {index && <span className="text-[11px] font-mono text-slate-400">{index}</span>}
          <h2 className="text-[15px] font-semibold tracking-tight text-slate-900 truncate">{title}</h2>
        </div>
        {tag && (
          <span className={`shrink-0 text-[10px] uppercase tracking-[0.12em] px-2 py-1 rounded-md border ${tones[tagTone]}`}>
            {tag}
          </span>
        )}
      </header>
      {children}
    </section>
  );
}