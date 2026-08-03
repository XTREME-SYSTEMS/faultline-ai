import React from "react";
import { Input } from "@/components/ui/input";
import { Fuel, HardHat, Package, Plus, Trash2 } from "lucide-react";

const PRESETS = [
  { type: "fuel", label: "Fuel / travel", icon: Fuel },
  { type: "labor", label: "Labor", icon: HardHat },
  { type: "material", label: "Material", icon: Package },
  { type: "other", label: "Other", icon: Plus },
];

const rid = () => Math.random().toString(36).slice(2);

export default function CostBuilder({ items, setItems }) {
  const add = (preset) => setItems([...items, { id: rid(), type: preset.type, label: preset.label, amount: 0 }]);
  const update = (id, field, value) =>
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: field === "amount" ? Number(value) || 0 : value } : i)));
  const remove = (id) => setItems(items.filter((i) => i.id !== id));
  const total = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.type}
            onClick={() => add(p)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] border border-slate-200 text-slate-600 hover:border-slate-400 hover:bg-slate-50"
          >
            <p.icon className="w-3.5 h-3.5" /> Add {p.label}
          </button>
        ))}
      </div>
      {items.length === 0 ? (
        <p className="text-[12px] text-slate-400">No cost components added yet.</p>
      ) : (
        <div className="space-y-2">
          {items.map((i) => (
            <div key={i.id} className="flex items-center gap-2">
              <Input value={i.label} onChange={(e) => update(i.id, "label", e.target.value)} className="flex-1" />
              <div className="relative w-32">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[12px]">$</span>
                <Input type="number" value={i.amount} onChange={(e) => update(i.id, "amount", e.target.value)} className="pl-5" />
              </div>
              <button onClick={() => remove(i.id)} className="text-slate-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-between pt-2 border-t border-slate-100">
        <span className="text-[12px] text-slate-500">Cost components total</span>
        <span className="text-[13px] font-semibold text-slate-900">${total.toLocaleString()}</span>
      </div>
    </div>
  );
}