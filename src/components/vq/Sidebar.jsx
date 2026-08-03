import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Sparkles, Users, Layers, Calculator, ShieldCheck, CalendarClock, ScrollText, Wand2, Package, Palette, FileSignature, Inbox, Settings, TrendingUp, BookOpen, Target, Contact, Mail, FileText } from "lucide-react";

const NAV = [
  { to: "/app/xv/visualizer", label: "Visualizer", icon: Sparkles },
  { to: "/app/xv/generator", label: "Image generator", icon: Wand2 },
  { to: "/app/xv/products", label: "Products", icon: Package },
  { to: "/app/xv/colors", label: "Color charts", icon: Palette },
  { to: "/app/xv/leads", label: "Leads", icon: Users },
  { to: "/app/xv/crm", label: "CRM", icon: Contact },
  { to: "/app/xv/lead-generator", label: "Lead generator", icon: Target },
  { to: "/app/xv/systems", label: "Floor systems", icon: Layers },
  { to: "/app/xv/pricing", label: "Pricing rules", icon: Calculator },
  { to: "/app/xv/competitive-pricing", label: "Market pricing", icon: TrendingUp },
  { to: "/app/xv/industry", label: "Industry reference", icon: BookOpen },
  { to: "/app/xv/close", label: "Close", icon: FileSignature },
  { to: "/app/xv/email-templates", label: "Email templates", icon: Mail },
  { to: "/app/xv/bid-generator", label: "Bid generator", icon: FileText },
  { to: "/app/xv/appointments", label: "Appointments", icon: CalendarClock },
  { to: "/app/xv/inbox", label: "Inbox", icon: Inbox },
  { to: "/app/xv/receipts", label: "Receipts", icon: ScrollText },
  { to: "/app/xv/guardrails", label: "Guardrails", icon: ShieldCheck },
  { to: "/app/xv/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ onNavigate }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-full flex flex-col bg-white border-r border-slate-200 w-full">
      <div className="p-5">
        <div className="w-9 h-9 rounded-lg bg-[#0A0A0A] text-[#F5C542] grid place-items-center font-semibold text-sm tracking-tight">XV</div>
        <p className="mt-5 text-[10px] uppercase tracking-[0.18em] text-slate-400">Generator package</p>
        <p className="text-[15px] font-semibold tracking-tight text-slate-900">Xtreme Visualizer</p>
      </div>
      <nav className="px-3 space-y-1 flex-1 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              onClick={onNavigate}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors ${
                active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="m-3 rounded-xl border border-slate-200 px-3 py-2.5 text-[11px] text-slate-500">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 align-middle" />
        Preview-only mode
        <div className="mt-1 font-mono text-[10px] text-slate-400">Agent 6a4ae5…2450</div>
      </div>
    </div>
  );
}