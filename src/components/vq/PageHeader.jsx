import React from "react";

export default function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{eyebrow}</p>}
        <h1 className="mt-1 text-2xl sm:text-[30px] font-semibold tracking-tight text-slate-900 leading-tight">{title}</h1>
        {description && <p className="mt-2 text-[13px] text-slate-500 max-w-2xl leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}