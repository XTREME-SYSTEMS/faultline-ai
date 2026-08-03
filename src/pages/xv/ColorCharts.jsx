import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/vq/PageHeader";
import EmptyState from "@/components/vq/EmptyState";
import { Loader2, Palette } from "lucide-react";
import ColorSwatch from "@/components/vq/ColorSwatch";

const SYSTEMS = [
  { key: "all", label: "All" },
  { key: "metallic", label: "Metallic" },
  { key: "flake", label: "Flake" },
  { key: "quartz", label: "Quartz" },
  { key: "solid", label: "Solid" },
  { key: "glitter", label: "Glitter" },
  { key: "dye_stain", label: "Dye & Stain" },
  { key: "joint_filler", label: "Joint Filler" },
];

export default function ColorCharts() {
  const [items, setItems] = useState(null);
  const [sys, setSys] = useState("all");

  useEffect(() => { base44.entities.ColorChart.list("-created_date", 300).then(setItems); }, []);

  if (!items) return <div className="py-24 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  const shown = sys === "all" ? items : items.filter((c) => c.system === sys);
  const grouped = shown.reduce((acc, c) => {
    const k = c.collection || "Other";
    (acc[k] = acc[k] || []).push(c);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        eyebrow="Color base · Xtreme Polishing Systems"
        title="Color charts"
        description="Live manufacturer product photos pulled from xtremepolishingsystems.com and ameripolish.com — exact metallic, flake, quartz, solid, glitter, and dye colors with their official codes. These feed the visualizer and image generator."
      />
      <div className="flex flex-wrap gap-2 mb-5">
        {SYSTEMS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSys(s.key)}
            className={`px-3 py-1.5 rounded-full text-[12px] border transition-colors ${
              sys === s.key ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {!shown.length ? (
        <EmptyState icon={Palette} title="No colors in this system" />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([collection, colors]) => (
            <div key={collection}>
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400 mb-2">{collection} · {colors.length}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {colors.map((c) => (
                  <div key={c.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <ColorSwatch color={c} system={c.system} className="h-24" />
                    <div className="p-2.5">
                      <p className="text-[13px] font-medium text-slate-900 truncate">{c.color_name}</p>
                      <p className="font-mono text-[11px] text-slate-400">{c.code}</p>
                      <p className="font-mono text-[10px] text-slate-400 mt-0.5">{c.hex}</p>
                      {c.sheen && <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] bg-slate-100 text-slate-500">{c.sheen}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}