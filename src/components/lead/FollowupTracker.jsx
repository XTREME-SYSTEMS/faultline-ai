import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Mail, Clock, AlertCircle, CheckCircle2 } from "lucide-react";

const STAGE_LABELS = {
  welcome_sent: { label: "Welcome sent", tone: "bg-blue-100 text-blue-700" },
  first_followup_sent: { label: "1st follow-up sent", tone: "bg-amber-100 text-amber-700" },
  second_followup_sent: { label: "2nd follow-up sent", tone: "bg-orange-100 text-orange-700" },
  final_reminder_sent: { label: "Final reminder sent", tone: "bg-red-100 text-red-700" },
};

function daysSince(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function FollowupTracker({ leads }) {
  const stats = useMemo(() => {
    const active = (leads || []).filter((l) => l.email && l.status !== "won" && l.status !== "lost");
    const noFollowup = active.filter((l) => !l.follow_up_stage);
    const inProgress = active.filter((l) => l.follow_up_stage && l.follow_up_stage !== "final_reminder_sent");
    const overdue = active.filter((l) => {
      if (!l.last_contacted_date) return false;
      const days = daysSince(l.last_contacted_date);
      return days >= 5 && l.follow_up_stage !== "final_reminder_sent";
    });
    return { total: active.length, noFollowup: noFollowup.length, inProgress: inProgress.length, overdue: overdue.length, overdueLeads: overdue.slice(0, 5) };
  }, [leads]);

  if (!leads) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-slate-400" />
          <h2 className="text-[14px] font-semibold text-slate-900">Follow-up tracker</h2>
        </div>
        <span className="text-[11px] text-slate-400">{stats.total} active leads with email</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-slate-400"><Clock className="w-3 h-3" /> Awaiting welcome</div>
          <p className="text-2xl font-semibold text-slate-900 mt-1">{stats.noFollowup}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-slate-400"><Mail className="w-3 h-3" /> In progress</div>
          <p className="text-2xl font-semibold text-slate-900 mt-1">{stats.inProgress}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-amber-600"><AlertCircle className="w-3 h-3" /> Overdue (5+ days)</div>
          <p className="text-2xl font-semibold text-amber-700 mt-1">{stats.overdue}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-slate-400"><CheckCircle2 className="w-3 h-3" /> Total active</div>
          <p className="text-2xl font-semibold text-slate-900 mt-1">{stats.total}</p>
        </div>
      </div>

      {stats.overdueLeads.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-2">Needs attention</p>
          <div className="space-y-1.5">
            {stats.overdueLeads.map((l) => {
              const days = daysSince(l.last_contacted_date);
              const stage = STAGE_LABELS[l.follow_up_stage] || { label: "No follow-up", tone: "bg-slate-100 text-slate-600" };
              return (
                <Link key={l.id} to={`/app/xv/leads/${l.id}`} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors">
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-slate-900 truncate">{l.customer_name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{l.system_name} · {l.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md ${stage.tone}`}>{stage.label}</span>
                    <span className="text-[11px] text-amber-600 font-medium">{days}d ago</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}