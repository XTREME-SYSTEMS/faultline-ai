import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/vq/PageHeader";
import EmptyState from "@/components/vq/EmptyState";
import { money } from "@/lib/pricing";
import { Loader2, Package, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const CATEGORIES = ["all", "epoxy_kit", "polyaspartic", "pigment", "sealer", "flake", "quartz", "equipment", "tooling"];

export default function Products() {
  const [items, setItems] = useState(null);
  const [cat, setCat] = useState("all");
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => { base44.entities.Product.list("-created_date", 200).then(setItems); }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke("scrapeXpsCatalog", { maxPages: 5 });
      const d = res.data;
      toast({ title: "Catalog synced", description: `${d.scrapedCount} scraped · ${d.created} new · ${d.updated} updated` });
      const fresh = await base44.entities.Product.list("-created_date", 200);
      setItems(fresh);
    } catch (e) {
      toast({ variant: "destructive", title: "Sync failed", description: e.message });
    } finally {
      setSyncing(false);
    }
  };

  if (!items) return <div className="py-24 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  const shown = cat === "all" ? items : items.filter((p) => p.category === cat);

  return (
    <div>
      <PageHeader
        eyebrow="Product base · Xtreme Polishing Systems"
        title="Products and pricing"
        description="Real XPS products scraped from xtremepolishingsystems.com — epoxy kits, polyaspartics, pigments, sealers, flakes, quartz, equipment, and tooling. These power the pricing engine and specs."
        actions={
          <Button onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync catalog"}
          </Button>
        }
      />
      <div className="flex flex-wrap gap-2 mb-5">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`px-3 py-1.5 rounded-full text-[12px] border transition-colors ${
              cat === c ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
            }`}
          >
            {c.replace(/_/g, " ")}
          </button>
        ))}
      </div>
      {!shown.length ? (
        <EmptyState icon={Package} title="No products in this category" />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {shown.map((p) => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[14px] font-semibold text-slate-900 leading-tight">{p.name}</p>
                <span className="text-[10px] uppercase tracking-[0.1em] text-slate-400 shrink-0">{p.category?.replace(/_/g, " ")}</span>
              </div>
              {p.sku && <p className="mt-1 font-mono text-[11px] text-slate-400">{p.sku}</p>}
              {p.size && <p className="mt-1 text-[12px] text-slate-500">{p.size}</p>}
              <p className="mt-3 text-[16px] font-semibold text-slate-900">{money(p.price)}<span className="text-[11px] font-normal text-slate-400 ml-1">{p.price_unit}</span></p>
              {p.specs && <p className="mt-2 text-[12px] text-slate-500 leading-relaxed">{p.specs}</p>}
              {p.product_url && (
                <a href={p.product_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[12px] text-slate-900 underline">
                  View on XPS <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}