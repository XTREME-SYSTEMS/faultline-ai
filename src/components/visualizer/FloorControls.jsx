import React from "react";
import { Image } from "@/components/ui/image";

export default function FloorControls({ floorTypes, floorType, onFloorType, colors, selectedColorId, onColor }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] text-slate-500 mb-2">Floor type</p>
        <div className="flex flex-wrap gap-2">
          {floorTypes.map((f) => (
            <button
              key={f.key}
              onClick={() => onFloorType(f.key)}
              className={`px-3 py-1.5 rounded-full text-[12px] border transition-colors ${floorType === f.key ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      {colors && colors.length > 0 && (
        <div>
          <p className="text-[11px] text-slate-500 mb-2">Color chart — choose a color</p>
          <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto pr-1">
            {colors.map((c) => {
              const active = selectedColorId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => onColor(c)}
                  className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border transition-colors ${active ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-400"}`}
                >
                  <span className="w-6 h-6 rounded-full overflow-hidden border border-slate-200 shrink-0 grid place-items-center">
                    {c.image_url ? (
                      <Image src={c.image_url} fittingType="fill" className="w-full h-full" />
                    ) : (
                      <span className="block w-full h-full" style={{ background: c.hex || "#ccc" }} />
                    )}
                  </span>
                  <span className="text-[12px] text-slate-700">{c.color_name}</span>
                  {c.sheen && active && <span className="text-[10px] text-slate-400 ml-1">· {c.sheen}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}