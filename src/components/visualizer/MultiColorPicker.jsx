import React from "react";
import { Image } from "@/components/ui/image";

// Multi-color metallic picker — lets the user select 2–3 metallic colors
// to blend into a single multi-tone metallic epoxy floor.
export default function MultiColorPicker({ colors, selectedIds, onChange, max = 3 }) {
  const toggle = (c) => {
    if (selectedIds.includes(c.id)) {
      onChange(selectedIds.filter((id) => id !== c.id));
    } else if (selectedIds.length < max) {
      onChange([...selectedIds, c.id]);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[11px] text-slate-500 mb-1">
          Pick 2–3 metallic colors to blend · {selectedIds.length}/{max} selected
        </p>
        <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto pr-1">
          {colors.map((c) => {
            const active = selectedIds.includes(c.id);
            const disabled = !active && selectedIds.length >= max;
            return (
              <button
                key={c.id}
                type="button"
                disabled={disabled}
                onClick={() => toggle(c)}
                className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border text-[12px] transition-all ${
                  active ? "border-slate-900 bg-slate-50 shadow-sm" : disabled ? "border-slate-200 opacity-40 cursor-not-allowed" : "border-slate-200 hover:border-slate-400"
                }`}
              >
                <span className="w-6 h-6 rounded-full overflow-hidden border border-slate-200 shrink-0 grid place-items-center">
                  {c.image_url ? (
                    <Image src={c.image_url} fittingType="fill" className="w-full h-full" />
                  ) : (
                    <span className="block w-full h-full" style={{ background: c.hex || "#ccc" }} />
                  )}
                </span>
                <span className="text-slate-700">{c.color_name}</span>
                {active && <span className="text-[10px] text-slate-400">✓</span>}
              </button>
            );
          })}
        </div>
      </div>
      {selectedIds.length >= 2 && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-[10px] uppercase tracking-wide text-slate-400">Blend preview</span>
          <div className="flex gap-1">
            {selectedIds.map((id) => {
              const c = colors.find((x) => x.id === id);
              if (!c) return null;
              return (
                <span key={id} className="w-8 h-8 rounded-full overflow-hidden border border-slate-200">
                  {c.image_url ? (
                    <Image src={c.image_url} fittingType="fill" className="w-full h-full" />
                  ) : (
                    <span className="block w-full h-full" style={{ background: c.hex || "#ccc" }} />
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}