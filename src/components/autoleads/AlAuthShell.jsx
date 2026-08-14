import React from "react";
import { BRAND } from "@/lib/brandIdentity";

// AUTO LEADS-branded auth shell — black/gold two-column layout used by the
// branded login + register pages. Distinct from the FaultLine AuthLayout so
// visitors coming from a rebranded clone land on an on-brand surface.
export default function AlAuthShell({ children, footer }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[0.9fr_1.1fr] bg-[#0B0B0D]">
      {/* Brand panel */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 text-white relative overflow-hidden"
        style={{
          background:
            "radial-gradient(circle at 82% 28%, rgba(255,215,0,0.18), transparent 30%), #090909",
        }}
      >
        <div className="flex items-center gap-3">
          <img src={BRAND.logoDark} alt={BRAND.name} className="h-12 w-auto" />
          <div className="leading-tight">
            <div className="font-[Libre_Caslon_Display,serif] text-2xl tracking-tight">
              {BRAND.name}
            </div>
            <div className="text-[10px] tracking-[0.16em] uppercase text-[#FFD700]">
              {BRAND.tagline}
            </div>
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="font-[Libre_Caslon_Display,serif] text-5xl leading-[1.05] tracking-tight">
            Capture, nurture & close more <span className="text-[#FFD700]">construction</span> leads.
          </h1>
          <p className="mt-5 text-[#bbb] text-lg leading-relaxed">
            The all-in-one platform for contractors — CRM, funnels, automations,
            and booking tools that turn clicks into booked jobs.
          </p>
          <ul className="mt-8 space-y-3 text-[#ddd] text-sm">
            <li className="flex items-center gap-2">
              <span className="text-[#FFD700]">✓</span> 14-day free trial, no card required
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#FFD700]">✓</span> Built for local service contractors
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#FFD700]">✓</span> Cancel anytime
            </li>
          </ul>
        </div>

        <div className="text-xs text-[#777]">
          © {new Date().getFullYear()} {BRAND.name} · {BRAND.domain}
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10 bg-[#f7f7f5]">
        <div className="w-full max-w-md bg-white border border-[#e5e1da] rounded-xl p-8 sm:p-10 shadow-[0_24px_70px_rgba(0,0,0,0.08)]">
          {/* Mobile brand header */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <img src={BRAND.logoDark} alt={BRAND.name} className="h-10 w-auto" />
            <div className="leading-tight">
              <div className="font-[Libre_Caslon_Display,serif] text-xl tracking-tight text-[#0B0B0D]">
                {BRAND.name}
              </div>
              <div className="text-[9px] tracking-[0.16em] uppercase text-[#B8860B]">
                {BRAND.tagline}
              </div>
            </div>
          </div>
          {children}
          {footer && (
            <p className="text-center text-sm text-[#666] mt-6">{footer}</p>
          )}
        </div>
      </div>
    </div>
  );
}