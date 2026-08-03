import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";

const COMMON_TRADES = [
  "Epoxy garage floor coating",
  "Polished concrete",
  "Concrete floor coating",
  "Metallic epoxy floor",
  "Quartz flooring",
  "Decorative concrete",
  "Concrete sealing",
  "Floor preparation and grinding",
  "Moisture mitigation",
  "Coving installation",
];

export default function MarketPriceLookup({ onResult }) {
  const [trade, setTrade] = useState(COMMON_TRADES[0]);
  const [zip, setZip] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    if (!trade || !zip) return;
    setLoading(true);
    setError("");
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a US construction pricing analyst. Search the web — HomeAdvisor, Angi, Thumbtack, Fixr, and local contractor websites — for the typical current pricing of "${trade}" work in ZIP code ${zip}. Return the local market price range as low, mid (typical/most common), and high in USD. Use the unit this trade is most commonly quoted in (e.g. "per sq ft", "per linear ft", "per project", "per day"). Give a short summary of what drives the range and your confidence (low/medium/high). Return JSON only.`,
        add_context_from_internet: true,
        model: "gemini_3_flash",
        response_json_schema: {
          type: "object",
          properties: {
            low: { type: "number" },
            mid: { type: "number" },
            high: { type: "number" },
            unit: { type: "string" },
            summary: { type: "string" },
            confidence: { type: "string" },
          },
        },
      });
      onResult({ ...res, trade, zip });
    } catch (e) {
      setError("Could not fetch market pricing. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-slate-500">Trade / service</label>
          <Input value={trade} onChange={(e) => setTrade(e.target.value)} placeholder="e.g. Epoxy garage floor coating" />
        </div>
        <div>
          <label className="text-[11px] text-slate-500">Area ZIP code</label>
          <Input value={zip} onChange={(e) => setZip(e.target.value.replace(/[^0-9]/g, "").slice(0, 5))} placeholder="e.g. 32801" />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {COMMON_TRADES.map((t) => (
          <button
            key={t}
            onClick={() => setTrade(t)}
            className={`px-2.5 py-1 rounded-full text-[11px] border ${trade === t ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}
          >
            {t}
          </button>
        ))}
      </div>
      <Button className="bg-slate-900 hover:bg-slate-800" disabled={loading || !trade || !zip} onClick={run}>
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
        {loading ? "Searching local market…" : "Get local market pricing"}
      </Button>
      {error && <p className="text-[12px] text-red-600">{error}</p>}
    </div>
  );
}