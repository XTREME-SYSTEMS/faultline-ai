import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/vq/PageHeader";
import SectionCard from "@/components/vq/SectionCard";
import MarketPriceLookup from "@/components/pricing/MarketPriceLookup";
import CostBuilder from "@/components/pricing/CostBuilder";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";

const rid = () => Math.random().toString(36).slice(2);

export default function CompetitivePricing() {
  const [market, setMarket] = useState(null);
  const [chosen, setChosen] = useState("mid");
  const [items, setItems] = useState([]);
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await base44.entities.PricingProfile.list();
      setProfile(p[0] || null);
    })();
  }, []);

  const base = market ? Number(market[chosen]) || 0 : 0;
  const addersTotal = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const final = base + addersTotal;

  const handleResult = (res) => {
    setMarket(res);
    setChosen("mid");
    setSaved(false);
    if (profile) {
      const seed = [];
      if (profile.fuel_rate_per_mile && profile.avg_travel_miles)
        seed.push({ id: rid(), type: "fuel", label: "Fuel / travel", amount: Math.round(profile.fuel_rate_per_mile * profile.avg_travel_miles) });
      if (profile.labor_rate_per_hr)
        seed.push({ id: rid(), type: "labor", label: "Labor", amount: Math.round(profile.labor_rate_per_hr * (profile.crew_size || 1)) });
      setItems(seed);
    } else {
      setItems([]);
    }
  };

  const save = async () => {
    if (!market) return;
    setSaving(true);
    try {
      await base44.entities.MarketPrice.create({
        trade: market.trade,
        zip_code: market.zip,
        low: market.low,
        mid: market.mid,
        high: market.high,
        unit: market.unit,
        summary: market.summary,
        confidence: market.confidence,
        chosen_range: chosen,
        adders: items.map(({ id, ...rest }) => rest),
        final_price: final,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Market intelligence"
        title="Competitive pricing intelligence"
        description="Pull live local market pricing by trade and ZIP code, pick a range, then add fuel, labor, material, and other costs to build a market-anchored quote."
      />

      <SectionCard index="01" title="Trade & service area" tag="Web search">
        <MarketPriceLookup onResult={handleResult} />
      </SectionCard>

      {market && (
        <>
          <SectionCard index="02" title="Local market range" tag={`${market.zip} · ${market.confidence || ""} confidence`} tagTone="gold">
            <p className="text-[12px] text-slate-500 mb-3">{market.summary}</p>
            <div className="grid sm:grid-cols-3 gap-3">
              {["low", "mid", "high"].map((k) => (
                <button
                  key={k}
                  onClick={() => setChosen(k)}
                  className={`text-left p-4 rounded-xl border transition-colors ${chosen === k ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-400"}`}
                >
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">{k === "mid" ? "Typical" : k}</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">${Number(market[k]).toLocaleString()}</p>
                  <p className="text-[11px] text-slate-500">{market.unit}</p>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard index="03" title="Cost components" tag="Add fuel · labor · material · other">
            <CostBuilder items={items} setItems={setItems} />
          </SectionCard>

          <SectionCard index="04" title="Final market-anchored price" tag="Quote">
            <div className="rounded-xl bg-slate-900 text-white p-5">
              <div className="flex items-center justify-between text-[12px] text-slate-300">
                <span>Base ({chosen === "mid" ? "typical" : chosen})</span>
                <span>${base.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-[12px] text-slate-300 mt-1">
                <span>Cost components</span>
                <span>${addersTotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/15">
                <span className="text-[13px] text-slate-200">Final price</span>
                <span className="text-3xl font-semibold text-[#F5C542]">${final.toLocaleString()}</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Button className="bg-slate-900 hover:bg-slate-800" disabled={saving} onClick={save}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save pricing
              </Button>
              {saved && <span className="text-[12px] text-emerald-600">Saved to market price history.</span>}
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}