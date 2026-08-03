import React from "react";
import { money } from "@/lib/pricing";
import { WARRANTY_TEXT, FINE_PRINT } from "@/lib/proposalBuilder";

export default function ProposalPreview({ proposal }) {
  if (!proposal) return null;
  const { company, customer, project, lineItems, subtotal, discount, discountAmount, total, desiredInstallDate, floorLogoDescription, specs, proposalNumber } = proposal;
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {company.logo_url ? (
            <img src={company.logo_url} alt="logo" className="w-12 h-12 rounded-lg object-contain bg-white/10" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-[#F5C542] text-slate-900 grid place-items-center font-bold text-sm">XPS</div>
          )}
          <div>
            <p className="text-[15px] font-semibold">{company.name || "Xtreme Polishing Systems"}</p>
            <p className="text-[11px] text-white/60">{company.tagline || "National Concrete Polishing Division"}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-white/50">Proposal</p>
          <p className="text-[12px] text-white/80">{proposalNumber}</p>
          <p className="text-[11px] text-white/50">{new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium mb-1">Customer</p>
            <p className="text-[14px] font-medium text-slate-900">{customer.name}</p>
            {customer.address && <p className="text-[12px] text-slate-500">{customer.address}</p>}
            <div className="flex gap-3 text-[12px] text-slate-500">
              {customer.phone && <span>{customer.phone}</span>}
              {customer.email && <span>{customer.email}</span>}
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium mb-1">Project</p>
            <p className="text-[13px] text-slate-700">{project.systemName}</p>
            <p className="text-[12px] text-slate-500">{project.floorType} · {project.colorName}</p>
            <p className="text-[12px] text-slate-500">{project.sqft.toLocaleString()} sq ft · {project.spaceType}</p>
            {desiredInstallDate && <p className="text-[12px] text-slate-500">Desired install: {desiredInstallDate}</p>}
          </div>
        </div>

        {specs && specs.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium mb-2">Scope of Work</p>
            <div className="space-y-1.5">
              {specs.map((s, i) => (
                <div key={i} className="flex gap-2 text-[12px]">
                  <span className="text-slate-400 font-mono shrink-0">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <span className="text-slate-700 font-medium">{s.label}</span>
                    {s.detail && <span className="text-slate-500"> — {s.detail}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {floorLogoDescription && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-amber-700 font-medium">Floor Logo</p>
            <p className="text-[12px] text-amber-900">{floorLogoDescription}</p>
          </div>
        )}

        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium mb-2">Pricing Breakdown</p>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-[12px]">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Description</th>
                  <th className="text-right px-3 py-2 font-medium w-20">Qty</th>
                  <th className="text-right px-3 py-2 font-medium w-24">Rate</th>
                  <th className="text-right px-3 py-2 font-medium w-24">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lineItems.map((item, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-slate-700">{item.label}</td>
                    <td className="px-3 py-2 text-right text-slate-500">{item.qty} {item.unit}</td>
                    <td className="px-3 py-2 text-right text-slate-500">{money(item.rate)}</td>
                    <td className="px-3 py-2 text-right text-slate-700 font-medium">{money(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-right text-slate-500 font-medium">Subtotal</td>
                  <td className="px-3 py-2 text-right text-slate-700 font-medium">{money(subtotal)}</td>
                </tr>
                {discountAmount > 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right text-emerald-600 font-medium">
                      Discount {discount.pct ? `(${discount.pct}%)` : ""}
                      <span className="block text-[10px] text-emerald-500">24-hour offer</span>
                    </td>
                    <td className="px-3 py-2 text-right text-emerald-600 font-medium">-{money(discountAmount)}</td>
                  </tr>
                )}
                <tr className="border-t-2 border-slate-300">
                  <td colSpan={3} className="px-3 py-2 text-right text-slate-900 font-bold">TOTAL</td>
                  <td className="px-3 py-2 text-right text-slate-900 font-bold text-[14px]">{money(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium mb-2">Warranty</p>
          <pre className="text-[11px] text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">{WARRANTY_TEXT}</pre>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium mb-2">Terms & Conditions</p>
          <pre className="text-[11px] text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">{FINE_PRINT}</pre>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium mb-3">Acceptance</p>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <div className="border-b border-slate-300 h-8" />
              <p className="text-[11px] text-slate-500 mt-1">Customer signature / Date</p>
            </div>
            <div>
              <div className="border-b border-slate-300 h-8" />
              <p className="text-[11px] text-slate-500 mt-1">XPS Representative / Date</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}