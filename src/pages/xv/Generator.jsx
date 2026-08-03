import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/vq/PageHeader";
import SectionCard from "@/components/vq/SectionCard";
import PhotoUpload from "@/components/visualizer/PhotoUpload";
import Disclosure from "@/components/vq/Disclosure";
import { Image } from "@/components/ui/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Download } from "lucide-react";
import { AI_DISCLOSURE } from "@/lib/brand";
import { CAMERA_LIBRARY, compilePrompt, finishToColorSystems } from "@/lib/promptLibrary";

const COLOR_PRESETS = [
  { name: "Graphite", hex: "#3A3A3A" },
  { name: "Charcoal", hex: "#2B2B2B" },
  { name: "Copper", hex: "#B06A32" },
  { name: "Ocean", hex: "#4A6E82" },
  { name: "Sandstone", hex: "#C4A882" },
  { name: "Silver", hex: "#9AA0A6" },
  { name: "Amber", hex: "#B07D3A" },
  { name: "Clear/Natural", hex: "#8C8C8C" },
];

export default function Generator() {
  const [finishes, setFinishes] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [finish, setFinish] = useState(null);
  const [environment, setEnvironment] = useState(null);
  const [camera, setCamera] = useState(CAMERA_LIBRARY[0]);
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [xpsColors, setXpsColors] = useState([]);
  const [customHex, setCustomHex] = useState("");
  const [photoUrls, setPhotoUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const hex = customHex || color.hex;

  // Load finish profiles (finished stage only) and environment profiles.
  useEffect(() => {
    base44.entities.FinishProfile.filter({ stage: "finished", active: true }).then((rows) => {
      setFinishes(rows);
      if (rows.length) setFinish(rows[0]);
    });
    base44.entities.EnvironmentProfile.filter({ active: true }).then((rows) => {
      setEnvironments(rows);
      if (rows.length) setEnvironment(rows[0]);
    });
  }, []);

  // Load real XPS color-chart colors for the selected finish.
  useEffect(() => {
    if (!finish) return;
    const systems = finishToColorSystems(finish.finish_id);
    base44.entities.ColorChart.filter({ system: { $in: systems } }).then((rows) => {
      setXpsColors(rows);
      if (rows.length) {
        setColor({ name: rows[0].color_name, hex: rows[0].hex, code: rows[0].code });
        setCustomHex("");
      }
    });
  }, [finish]);

  const finishesByFamily = useMemo(() => {
    const groups = {};
    finishes.forEach((f) => {
      const key = f.family || "other";
      if (!groups[key]) groups[key] = [];
      groups[key].push(f);
    });
    return groups;
  }, [finishes]);

  const envsBySector = useMemo(() => {
    const groups = {};
    environments.forEach((e) => {
      const key = e.sector || "other";
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    return groups;
  }, [environments]);

  const compiledPrompt = useMemo(() => {
    if (!finish || !environment) return "";
    return compilePrompt({ finish, environment, camera, colorName: color.name, hex });
  }, [finish, environment, camera, color, hex]);

  const generate = async () => {
    if (!finish || !environment) return;
    setLoading(true);
    setResults([]);
    const payload = { prompt: compiledPrompt };
    if (photoUrls.length) payload.existing_image_urls = photoUrls;
    const { url } = await base44.integrations.Core.GenerateImage(payload);
    setResults([{ url, finish: finish.name, color: color.name, hex, environment: environment.name, camera: camera.name }]);
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Studio"
        title="Ultra-lifelike floor image generator"
        description="Powered by the Xtreme AI Visual Prompt Library — 33 finish profiles, 48 environment profiles, and 10 camera angles compiled into professional contractor-grade prompts."
      />

      <div className="grid lg:grid-cols-2 gap-5">
        <SectionCard index="01" title="Finish profile" tag={`${finishes.length} profiles`}>
          {finishes.length === 0 ? (
            <p className="text-[12px] text-slate-400">Loading finish profiles…</p>
          ) : (
            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
              {Object.entries(finishesByFamily).map(([family, items]) => (
                <div key={family}>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400 mb-2 capitalize">{family.replace(/_/g, " ")}</p>
                  <div className="space-y-1.5">
                    {items.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFinish(f)}
                        className={`w-full text-left rounded-lg border p-2.5 transition-all ${
                          finish?.id === f.id ? "border-slate-900 ring-2 ring-slate-900/10 bg-slate-50" : "border-slate-200 hover:border-slate-400"
                        }`}
                      >
                        <p className="text-[12px] font-semibold text-slate-900 capitalize">{f.name}</p>
                        <p className="mt-0.5 text-[10px] text-slate-500 leading-relaxed line-clamp-2">{f.surface_description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard index="02" title="Environment, camera & color">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400 mb-2">Environment · {environments.length} spaces</p>
              <div className="max-h-40 overflow-y-auto pr-1 space-y-3">
                {Object.entries(envsBySector).map(([sector, items]) => (
                  <div key={sector}>
                    <p className="text-[9px] uppercase tracking-wide text-slate-300 mb-1 capitalize">{sector}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => setEnvironment(e)}
                          className={`px-2.5 py-1 rounded-full text-[11px] border transition-all capitalize ${
                            environment?.id === e.id ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                          }`}
                        >
                          {e.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400 mb-2">Camera angle</p>
              <div className="flex flex-wrap gap-1.5">
                {CAMERA_LIBRARY.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCamera(c)}
                    className={`px-2.5 py-1 rounded-full text-[11px] border transition-all ${
                      camera?.id === c.id ? "bg-[#F5C542] text-slate-900 border-[#F5C542]" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400 mb-2">
                XPS color chart {xpsColors.length > 0 && `· ${xpsColors.length} colors`}
              </p>
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                {xpsColors.length === 0 && COLOR_PRESETS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    title={c.name}
                    onClick={() => { setColor(c); setCustomHex(""); }}
                    className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border text-[12px] transition-all ${
                      color.name === c.name && !customHex ? "border-slate-900 shadow-sm" : "border-slate-200 hover:border-slate-400"
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full border border-black/10" style={{ background: c.hex }} />
                    {c.name}
                  </button>
                ))}
                {xpsColors.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={`${c.color_name} · ${c.code} · ${c.collection}${c.sheen ? ` · ${c.sheen}` : ""}`}
                    onClick={() => { setColor({ name: c.color_name, hex: c.hex, code: c.code }); setCustomHex(""); }}
                    className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border text-[12px] transition-all ${
                      color.name === c.color_name && !customHex ? "border-slate-900 shadow-sm" : "border-slate-200 hover:border-slate-400"
                    }`}
                  >
                    {c.image_url ? (
                      <span className="w-5 h-5 rounded-full overflow-hidden border border-black/10 shrink-0">
                        <Image src={c.image_url} fittingType="fill" className="w-full h-full" />
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full border border-black/10" style={{ background: c.hex }} />
                    )}
                    {c.color_name}
                    <span className="font-mono text-[10px] text-slate-400">{c.code}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px]">Custom hex</Label>
              <div className="flex gap-2">
                <Input value={customHex} placeholder="#3A3A3A" onChange={(e) => setCustomHex(e.target.value)} />
                <span className="w-10 h-9 rounded-md border border-slate-200" style={{ background: hex }} />
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard index="03" title="Reference photo (optional)" tag="Match the room" tagTone="slate">
        <PhotoUpload photoUrls={photoUrls} onUploaded={setPhotoUrls} />
        {photoUrls.length > 0 && <p className="mt-2 text-[12px] text-slate-500">When references are attached, the generator matches their perspective and walls.</p>}
      </SectionCard>

      {compiledPrompt && (
        <SectionCard index="04" title="Compiled prompt" tag="Preview" tagTone="slate">
          <pre className="text-[11px] text-slate-600 whitespace-pre-wrap leading-relaxed font-mono bg-slate-50 rounded-lg p-3 border border-slate-200 max-h-48 overflow-y-auto">{compiledPrompt}</pre>
        </SectionCard>
      )}

      <div className="flex justify-center">
        <Button size="lg" className="bg-slate-900 hover:bg-slate-800" disabled={loading || !finish || !environment} onClick={generate}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          {loading ? "Generating ultra-lifelike floor…" : "Generate floor image"}
        </Button>
      </div>

      {results.length > 0 && (
        <SectionCard index="05" title="Result" tag="AI concept">
          <div className="space-y-3">
            {results.map((r, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-slate-200">
                <Image src={r.url} alt={`${r.finish} floor`} className="w-full h-72 sm:h-96" />
                <div className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-slate-900 capitalize">{r.finish} · {r.color}</p>
                    <p className="text-[11px] text-slate-500 truncate capitalize">{r.environment} · {r.camera}</p>
                  </div>
                  <a href={r.url} download target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline" className="text-[12px]"><Download className="w-3.5 h-3.5 mr-1.5" /> Save</Button>
                  </a>
                </div>
              </div>
            ))}
            <Disclosure text={AI_DISCLOSURE} />
          </div>
        </SectionCard>
      )}
    </div>
  );
}