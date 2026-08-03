import React from "react";
import { Inbox } from "lucide-react";

export default function EmptyState({ title, hint, icon: Icon = Inbox }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 py-14 text-center">
      <Icon className="w-6 h-6 mx-auto text-slate-300" />
      <p className="mt-3 text-[14px] font-medium text-slate-800">{title}</p>
      {hint && <p className="mt-1 text-[12px] text-slate-500">{hint}</p>}
    </div>
  );
}