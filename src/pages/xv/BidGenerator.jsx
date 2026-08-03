import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/vq/PageHeader";
import SectionCard from "@/components/vq/SectionCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FileText, Sparkles } from "lucide-react";
import SharePanel from "@/components/visualizer/SharePanel";

export default function BidGenerator() {
  const [bidPackage, setBidPackage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [err, setErr] = useState("");

  const generate = async () => {
    setGenerating(true);
    setErr("");
    try {
      const prompt = `Scan the following company websites and generate a comprehensive, professional bid package / company overview document that a salesperson can send to a potential client.

Websites to scan:
1. xtremepolishingsystems.com — Xtreme Polishing Systems (parent company, manufacturer and distributor of concrete polishing and epoxy flooring products)
2. nationalconcretepolishing.net — National Concrete Polishing (a division of Xtreme Polishing Systems with 70+ nationwide locations)
3. polishedconcreteuniversity.com — Polished Concrete University (training and certification arm)

Generate a professional bid package with these sections as Markdown headings:

# Xtreme Polishing Systems — Company Overview
Brief history, national reach, scale of operations, manufacturer-direct advantage.

# Our Divisions
Xtreme Polishing Systems (products), National Concrete Polishing (installation, 70+ locations), Polished Concrete University (training & certification).

# Services We Offer
Polished concrete, epoxy flooring (metallic, flake, quartz, solid, glitter), stained concrete, sealed concrete, overlays/micro-toppings, joint filler, concrete countertops, and more.

# Insurance & Compliance
Fully licensed and insured contractor. General liability insurance and workers' compensation insurance coverage. Certificates of insurance available upon request. OSHA-compliant operations.

# Safety & Certifications
Trained and certified crews through Polished Concrete University. OSHA safety compliance. Manufacturer-trained installers.

# Why Choose Us
70+ nationwide locations, manufacturer-direct products, certified installers, workmanship warranty, national reach with local service, decades of experience.

# Warranty
Workmanship warranty on installations. Manufacturer warranties on products.

# Contact
Your salesperson's contact information is included with your proposal. Visit xtremepolishingsystems.com or nationalconcretepolishing.net for more information.

Format as a clean, professional document with Markdown headings. Keep it under 800 words. This is a marketing document to help close deals — make it compelling but honest.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        model: "gemini_3_flash",
      });
      setBidPackage(typeof result === "string" ? result : String(result));
    } catch (e) {
      setErr("Could not generate bid package. " + (e.message || ""));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Company bid package"
        title="Bid package generator"
        description="AI scans your company websites and generates a professional bid package with company highlights, insurance, and certifications — ready to send to any client."
        actions={
          <Button onClick={generate} disabled={generating} className="bg-slate-900 hover:bg-slate-800">
            {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {generating ? "Scanning..." : "Generate bid package"}
          </Button>
        }
      />

      {!bidPackage && !generating && (
        <div className="py-16 text-center">
          <FileText className="w-10 h-10 mx-auto text-slate-300" />
          <p className="mt-3 text-[13px] text-slate-500">Click "Generate bid package" to scan your company websites and create a professional bid package.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-[11px] text-slate-400">
            <span className="px-2 py-1 rounded-full bg-slate-100">xtremepolishingsystems.com</span>
            <span className="px-2 py-1 rounded-full bg-slate-100">nationalconcretepolishing.net</span>
            <span className="px-2 py-1 rounded-full bg-slate-100">polishedconcreteuniversity.com</span>
          </div>
        </div>
      )}

      {generating && (
        <div className="py-16 grid place-items-center">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          <p className="mt-3 text-[12px] text-slate-500">Scanning company websites and generating bid package...</p>
        </div>
      )}

      {err && <p className="text-[12px] text-red-600">{err}</p>}

      {bidPackage && !generating && (
        <>
          <SectionCard index="01" title="Bid package preview" tag="Editable" tagTone="gold">
            <Textarea rows={24} value={bidPackage} onChange={(e) => setBidPackage(e.target.value)} className="font-mono text-[12px]" />
          </SectionCard>
          <SectionCard index="02" title="Send / share the bid package" tag="Deliver" tagTone="green">
            <SharePanel proposalText={bidPackage} customerEmail="" />
          </SectionCard>
        </>
      )}
    </div>
  );
}