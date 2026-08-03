import React, { useState } from "react";
import PageHeader from "@/components/vq/PageHeader";
import SectionCard from "@/components/vq/SectionCard";
import { TRADES, FLOOR_SYSTEMS, COUNTERTOPS, REGIONS } from "@/lib/industryData";
import { Search } from "lucide-react";

const TABS = [
  { key: "trades", label: "Trades", data: TRADES, cols: ["Code", "Trade", "NAICS", "SIC", "Category"] },
  { key: "floors", label: "Floor systems", data: FLOOR_SYSTEMS, cols: ["Code", "System", "Category"] },
  { key: "counters", label: "Countertops", data: COUNTERTOPS, cols: ["Code", "Countertop", "Material"] },
  { key: "regions", label: "Regions", data: REGIONS, cols: ["Code", "Region", "States", "Cost index"] },
];

export default function IndustryReference() {
  const [tab, setTab] = useState("trades");
  const [q, setQ] = useState("");
  const active = TABS.find((t) => t.key === tab);

  const rows = active.data.filter((r) =>
    Object.values(r).some((v) => String(v).toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Industry reference"
        title="Trades, floor systems, countertops & regions"
        description="An exhaustive coded reference for the specialty flooring, concrete, and countertop industry — used to drive trade-based market pricing and regional cost scaling."
      />

      <SectionCard index="01" title="Reference library" tag={`${TRADES.length} trades · ${FLOOR_SYSTEMS.length} systems · ${COUNTERTOPS.length} countertops · ${REGIONS.length} regions`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded-full text-[12px] border transition-colors ${tab === t.key ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-slate-200 text-[12px] focus:outline-none focus:border-slate-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-[12px]">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {active.cols.map((c) => (
                  <th key={c} className="text-left font-medium px-3 py-2 whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.code} className={i % 2 ? "bg-slate-50/40" : ""}>
                  {tab === "trades" && (
                    <>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-700">{r.code}</td>
                      <td className="px-3 py-2 text-slate-800">{r.name}</td>
                      <td className="px-3 py-2 text-slate-500">{r.naics}</td>
                      <td className="px-3 py-2 text-slate-500">{r.sic}</td>
                      <td className="px-3 py-2 text-slate-500">{r.category}</td>
                    </>
                  )}
                  {tab === "floors" && (
                    <>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-700">{r.code}</td>
                      <td className="px-3 py-2 text-slate-800">{r.name}</td>
                      <td className="px-3 py-2 text-slate-500">{r.category}</td>
                    </>
                  )}
                  {tab === "counters" && (
                    <>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-700">{r.code}</td>
                      <td className="px-3 py-2 text-slate-800">{r.name}</td>
                      <td className="px-3 py-2 text-slate-500">{r.material}</td>
                    </>
                  )}
                  {tab === "regions" && (
                    <>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-700">{r.code}</td>
                      <td className="px-3 py-2 text-slate-800">{r.name}</td>
                      <td className="px-3 py-2 text-slate-500">{r.states}</td>
                      <td className="px-3 py-2 font-semibold text-slate-900">{r.cost_index.toFixed(2)}×</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-400 mt-3">{rows.length} entries. Region cost index is a multiplier vs. the US national average (1.00×) and scales market pricing by area.</p>
      </SectionCard>
    </div>
  );
}