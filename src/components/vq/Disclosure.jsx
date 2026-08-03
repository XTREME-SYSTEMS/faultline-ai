import React from "react";
import { Check } from "lucide-react";

export default function Disclosure({ text }) {
  return (
    <p className="flex items-start gap-2 text-[12px] leading-relaxed text-[#8a6a00] bg-[#F5C542]/10 border border-[#F5C542]/40 rounded-lg px-3 py-2">
      <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" />
      <span>{text}</span>
    </p>
  );
}