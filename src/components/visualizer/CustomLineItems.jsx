import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Package } from "lucide-react";

export default function CustomLineItems({ items, onChange }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    base44.entities.Product.filter({ active: true }, undefined, 50).then(setProducts).catch(() => {});
  }, []);

  const add = () => {
    onChange([...items, { label: "", detail: "", qty: 1, unit: "each", rate: 0 }]);
  };

  const update = (i, field, value) => {
    const next = [...items];
    next[i] = { ...next[i], [field]: value };
    onChange(next);
  };

  const remove = (i) => {
    onChange(items.filter((_, idx) => idx !== i));
  };

  const addProduct = (p) => {
    onChange([...items, { label: p.name, detail: p.specs || "", qty: 1, unit: p.price_unit || "each", rate: p.price || 0 }]);
  };

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-12 sm:col-span-4 space-y-1">
                <Label className="text-[11px]">Description</Label>
                <Input value={item.label} onChange={(e) => update(i, "label", e.target.value)} placeholder="Custom work item" />
              </div>
              <div className="col-span-4 sm:col-span-2 space-y-1">
                <Label className="text-[11px]">Qty</Label>
                <Input type="number" min="0" value={item.qty} onChange={(e) => update(i, "qty", Number(e.target.value))} />
              </div>
              <div className="col-span-4 sm:col-span-2 space-y-1">
                <Label className="text-[11px]">Unit</Label>
                <Input value={item.unit} onChange={(e) => update(i, "unit", e.target.value)} placeholder="each, lf, sq ft" />
              </div>
              <div className="col-span-3 sm:col-span-2 space-y-1">
                <Label className="text-[11px]">Rate $</Label>
                <Input type="number" min="0" value={item.rate} onChange={(e) => update(i, "rate", Number(e.target.value))} />
              </div>
              <div className="col-span-1 flex justify-end">
                <Button variant="ghost" size="icon" onClick={() => remove(i)} className="h-9 w-9 text-slate-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2 items-center">
        <Button variant="outline" onClick={add} className="text-[12px]">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add custom line item
        </Button>
        {products.length > 0 && (
          <details>
            <summary className="cursor-pointer text-[12px] text-slate-500 hover:text-slate-700 inline-flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" /> Pick from product catalog
            </summary>
            <div className="mt-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
              {products.map((p) => (
                <button key={p.id} onClick={() => addProduct(p)} className="block w-full text-left px-2 py-1.5 rounded text-[12px] hover:bg-slate-100">
                  <span className="font-medium text-slate-700">{p.name}</span>
                  <span className="text-slate-400 ml-2">{p.price ? `$${p.price}` : ""} / {p.price_unit || "each"}</span>
                </button>
              ))}
            </div>
          </details>
        )}
      </div>
      <p className="text-[11px] text-slate-400">Add unlimited custom items — modifications, add-ons, customer requests, or anything not covered by the standard scope. Pick from the product catalog or type your own.</p>
    </div>
  );
}