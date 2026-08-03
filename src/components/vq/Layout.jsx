import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Sidebar from "@/components/vq/Sidebar";
import VizzyAssistant from "@/components/vq/VizzyAssistant";

export default function Layout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex">
      <aside className="hidden lg:block shrink-0 sticky top-0 h-screen w-[232px]">
        <Sidebar />
      </aside>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute top-14 right-0 w-64 max-w-[80vw] max-h-[calc(100vh-3.5rem)] bg-white border-l border-b border-slate-200 shadow-xl animate-in slide-in-from-top duration-200 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="lg:hidden sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200 px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#0A0A0A] text-[#F5C542] grid place-items-center text-[11px] font-semibold">VQ</div>
            <span className="text-[14px] font-semibold tracking-tight">VisualQuote AI</span>
          </div>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            className="-mr-2 flex items-center justify-center w-11 h-11 rounded-lg text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        <main className="p-4 sm:p-6 lg:p-8 max-w-[1180px] mx-auto">
          <Outlet />
        </main>
      </div>

      <VizzyAssistant />
    </div>
  );
}