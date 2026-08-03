import React from "react";

export default function FinishPicker({ systems, value, onChange }) {
  const system = systems.find((s) => s.id === value.system_id);
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400 mb-2">Floor systems</p>
        <div className="flex flex-wrap gap-2">
          {systems.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange({ ...value, system_id: s.id, system_name: s.name, finish: s.finishes?.[0] || "", color_name: s.colors?.[0]?.name, color_hex: s.colors?.[0]?.hex })}
              className={`px-3 py-1.5 rounded-full text-[12px] border transition-colors ${
                value.system_id === s.id ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {system && (
        <>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400 mb-2">Finish</p>
            <div className="flex flex-wrap gap-2">
              {(system.finishes || []).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => onChange({ ...value, finish: f })}
                  className={`px-3 py-1.5 rounded-full text-[12px] border transition-colors ${
                    value.finish === f ? "bg-[#F5C542] text-slate-900 border-[#F5C542]" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          {system.sheen_levels && system.sheen_levels.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400 mb-2">Sheen level</p>
              <div className="flex flex-wrap gap-2">
                {system.sheen_levels.map((s) => (
                  <span key={s} className="px-3 py-1.5 rounded-full text-[12px] border border-slate-200 bg-slate-50 text-slate-500">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400 mb-2">Color</p>
            <div className="flex flex-wrap gap-3">
              {(system.colors || []).map((c) => (
                <button
                  key={c.name}
                  type="button"
                  title={c.name}
                  onClick={() => onChange({ ...value, color_name: c.name, color_hex: c.hex })}
                  className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border text-[12px] transition-all ${
                    value.color_name === c.name ? "border-slate-900 shadow-sm" : "border-slate-200 hover:border-slate-400"
                  }`}
                >
                  <span className="w-5 h-5 rounded-full border border-black/10" style={{ background: c.hex }} />
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[12px] text-slate-500 leading-relaxed">{system.description}</p>
        </>
      )}
    </div>
  );
}