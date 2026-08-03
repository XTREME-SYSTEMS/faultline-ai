import React, { useState } from "react";
import { Image } from "@/components/ui/image";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, SplitSquareHorizontal } from "lucide-react";
import Disclosure from "@/components/vq/Disclosure";
import { AI_DISCLOSURE } from "@/lib/brand";

export default function ConceptPreview({ photoUrls = [], concepts, loading, onGenerate, onSelect, selectedIndex, controls, canGenerate = true }) {
  const [active, setActive] = useState(0);
  const [compare, setCompare] = useState(false);
  const current = concepts[active];

  if (!concepts.length) {
    return (
      <div className="space-y-4">
        {controls}
        <div className="h-56 rounded-xl bg-slate-100 grid place-items-center text-center px-6">
          {loading ? (
            <div className="text-slate-500 text-[13px]">
              <Loader2 className="w-5 h-5 mx-auto animate-spin mb-2" />
              Generating three concept visualizations…
            </div>
          ) : (
            <p className="text-[13px] text-slate-500">Choose a floor type and color, then generate three finish concepts.</p>
          )}
        </div>
        <Button className="w-full bg-slate-900 hover:bg-slate-800" disabled={!photoUrls.length || loading || !canGenerate} onClick={onGenerate}>
          <Sparkles className="w-4 h-4 mr-2" /> Generate 3 concepts
        </Button>
        <Disclosure text={AI_DISCLOSURE} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {controls}
      {compare ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl overflow-hidden border border-slate-200">
            <Image src={photoUrls[0]} alt="Original project photo" className="w-full h-56 sm:h-64" />
          </div>
          <div className="rounded-xl overflow-hidden border border-slate-200">
            <Image src={current.image_url} alt={current.label} className="w-full h-56 sm:h-64" />
          </div>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden border border-slate-200">
          <Image src={current.image_url} alt={current.label} className="w-full h-56 sm:h-64" />
        </div>
      )}
      {compare ? (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] tracking-[0.16em] text-slate-400">BEFORE</p>
            <p className="text-[13px] font-medium text-slate-900">Original project photo</p>
          </div>
          <div>
            <p className="text-[10px] tracking-[0.16em] text-[#F5C542]">AFTER</p>
            <p className="text-[13px] font-medium text-slate-900">{current.label}</p>
          </div>
        </div>
      ) : (
        <>
          <p className="text-[10px] tracking-[0.16em] text-[#F5C542] mt-2">
            {`OPTION 0${active + 1}`}
          </p>
          <p className="text-[13px] font-medium text-slate-900">{current.label}</p>
        </>
      )}

      <div className="grid grid-cols-3 gap-2">
        {concepts.map((c, i) => (
          <button
            key={i}
            type="button"
            onClick={() => { setActive(i); setCompare(false); }}
            className={`px-2 py-2 rounded-lg text-[11px] border transition-colors truncate ${
              active === i ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
            }`}
          >
            0{i + 1} {c.short}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="rounded-full text-[12px]" onClick={() => setCompare((v) => !v)}>
          <SplitSquareHorizontal className="w-3.5 h-3.5 mr-1.5" /> {compare ? "Show concept" : "Side-by-side"}
        </Button>
        <Button
          size="sm"
          className="rounded-full text-[12px] bg-[#F5C542] text-slate-900 hover:bg-[#e9b92f]"
          onClick={() => onSelect(active)}
        >
          {selectedIndex === active ? "Selected concept" : "Use this concept"}
        </Button>
        <Button size="sm" variant="ghost" className="rounded-full text-[12px]" disabled={loading} onClick={onGenerate}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Regenerate"}
        </Button>
      </div>

      <Disclosure text={AI_DISCLOSURE} />
    </div>
  );
}