import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Sparkles, Calculator, Users, FileSignature, TrendingUp, ShieldCheck, ArrowRight, Check, Zap, Image as ImageIcon, Mail, Clock } from "lucide-react";
import { Image } from "@/components/ui/image";

// Before (bare surface) images
const GARAGE_BEFORE = "https://media.base44.com/images/public/6a6fe802b87f48341282f12e/5a88fc994_generated_image.png";
const SHOWROOM_BEFORE = "https://media.base44.com/images/public/6a6fe802b87f48341282f12e/a690c8466_generated_image.png";
const RETAIL_BEFORE = "https://media.base44.com/images/public/6a6fe802b87f48341282f12e/11ddfe467_generated_image.png";
const KITCHEN_BEFORE = "https://media.base44.com/images/public/6a6fe802b87f48341282f12e/f9dca7f7c_generated_image.png";

// After (finished surface) images
const GARAGE_METALLIC = "https://media.base44.com/images/public/6a6fe802b87f48341282f12e/58658b1a2_generated_image.png";
const GARAGE_FLAKE = "https://media.base44.com/images/public/6a6fe802b87f48341282f12e/bfde932f1_generated_image.png";
const GARAGE_QUARTZ = "https://media.base44.com/images/public/6a6fe802b87f48341282f12e/7031f81bd_generated_image.png";
const GARAGE_SOLID = "https://media.base44.com/images/public/6a6fe802b87f48341282f12e/a4965b603_generated_image.png";
const GARAGE_GLITTER = "https://media.base44.com/images/public/6a6fe802b87f48341282f12e/b04f1ef00_generated_image.png";
const SHOWROOM_POLISHED = "https://media.base44.com/images/public/6a6fe802b87f48341282f12e/ae4096ae4_generated_image.png";
const SHOWROOM_STAINED = "https://media.base44.com/images/public/6a6fe802b87f48341282f12e/c6e4d7bdf_generated_image.png";
const KITCHEN_CONCRETE_CT = "https://media.base44.com/images/public/6a6fe802b87f48341282f12e/bfb0c0b07_generated_image.png";
const KITCHEN_EPOXY_CT = "https://media.base44.com/images/public/6a6fe802b87f48341282f12e/178861210_generated_image.png";
const HERO_MANCAVE = "https://media.base44.com/images/public/6a6fe802b87f48341282f12e/005480d5c_image.png";

const TRANSFORMATIONS = [
  { label: "Metallic Epoxy", space: "Garage", before: GARAGE_BEFORE, after: GARAGE_METALLIC },
  { label: "Flake Epoxy", space: "Garage", before: GARAGE_BEFORE, after: GARAGE_FLAKE },
  { label: "Quartz Epoxy", space: "Garage", before: GARAGE_BEFORE, after: GARAGE_QUARTZ },
  { label: "Solid Color Epoxy", space: "Garage", before: GARAGE_BEFORE, after: GARAGE_SOLID },
  { label: "Glitter Epoxy", space: "Garage", before: GARAGE_BEFORE, after: GARAGE_GLITTER },
  { label: "Polished Concrete", space: "Showroom", before: SHOWROOM_BEFORE, after: SHOWROOM_POLISHED },
  { label: "Stained Concrete", space: "Retail", before: RETAIL_BEFORE, after: SHOWROOM_STAINED },
  { label: "Concrete Countertops", space: "Kitchen", before: KITCHEN_BEFORE, after: KITCHEN_CONCRETE_CT },
  { label: "Epoxy Countertops", space: "Kitchen", before: KITCHEN_BEFORE, after: KITCHEN_EPOXY_CT },
];

const FEATURES = [
  { icon: Sparkles, title: "AI Visualizer", desc: "Transform customer photos into realistic flooring concept visualizations in seconds." },
  { icon: Calculator, title: "Instant Quotes", desc: "Generate preliminary pricing ranges from square footage, conditions, and floor system." },
  { icon: Users, title: "Lead Management", desc: "Track every project from inquiry to close with automated follow-up sequences." },
  { icon: FileSignature, title: "Proposal Studio", desc: "Build Good/Better/Best packages and send professional proposals with your brand." },
  { icon: TrendingUp, title: "Market Pricing", desc: "Live local market intelligence and cost-of-doing-business calculator built in." },
  { icon: ShieldCheck, title: "Safety Guardrails", desc: "Vizzy AI assistant with explicit guardrails for honest, transparent customer communication." },
];

const STEPS = [
  { icon: ImageIcon, title: "Upload a photo", desc: "Customer sends a photo of their space — garage, basement, warehouse, anywhere." },
  { icon: Sparkles, title: "Pick a floor system", desc: "Choose from metallic, flake, quartz, solid, or stained concrete with real color charts." },
  { icon: Zap, title: "Get a concept + quote", desc: "AI generates a realistic visualization and preliminary pricing range instantly." },
  { icon: Mail, title: "Send a proposal", desc: "Close the deal with a branded proposal and automated follow-up sequence." },
];

export default function Home() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then(setAuthed).catch(() => setAuthed(false));
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-[#F5C542] grid place-items-center font-semibold text-sm tracking-tight">XV</div>
            <span className="text-[15px] font-semibold tracking-tight text-slate-900">Xtreme Visualizer</span>
          </Link>
          <div className="flex items-center gap-2">
            {authed ? (
              <Button asChild className="bg-slate-900 hover:bg-slate-800 h-9">
                <Link to="/app/xv/visualizer">Open app <ArrowRight className="w-4 h-4 ml-1.5" /></Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" className="h-9 text-[13px]">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild className="bg-slate-900 hover:bg-slate-800 h-9 text-[13px]">
                  <Link to="/register">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-900 min-h-[560px] flex items-center">
        <Image src={HERO_MANCAVE} fittingType="fill" className="absolute inset-0 w-full h-full" alt="Luxury man cave with Xtreme Vizualizer sign, black white silver and gold veined epoxy floor, and two exotic cars" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/30 to-black/10" />
        <div className="relative max-w-6xl mx-auto px-5 py-24 sm:py-32 w-full">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-white/90 bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1.5 rounded-full">
              <Sparkles className="w-3.5 h-3.5" /> AI-powered flooring sales
            </span>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-[56px] font-semibold tracking-tight leading-[1.05] text-white">
              See your floors<br />before you build them.
            </h1>
            <p className="mt-5 text-[16px] sm:text-lg text-white/80 max-w-md leading-relaxed">
              Transform project photos into realistic concept visualizations and get instant preliminary quotes. Streamline your specialty flooring sales from first contact to close.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="bg-white/10 backdrop-blur-sm text-white border border-white/30 hover:bg-white/20 h-12 px-6 text-[14px] font-medium">
                <Link to="/register">Start free <ArrowRight className="w-4 h-4 ml-1.5" /></Link>
              </Button>
              <Button asChild variant="outline" className="h-12 px-6 text-[14px] border-white/30 text-white bg-transparent hover:bg-white/10 hover:text-white">
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-5 text-[12px] text-white/70">
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#F5C542]" /> No credit card</span>
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#F5C542]" /> Real product data</span>
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#F5C542]" /> Automated follow-ups</span>
            </div>
          </div>
          <div className="absolute bottom-8 right-5 sm:right-8 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white px-4 py-3 shadow-xl">
            <p className="text-[10px] uppercase tracking-wide font-medium text-white/70">Preliminary range</p>
            <p className="text-lg font-semibold text-[#F5C542]">$3,200 – $4,800</p>
          </div>
        </div>
      </section>

      {/* Transformation gallery */}
      <section className="max-w-6xl mx-auto px-5 py-16">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#8a6a00] font-medium">Real transformations</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">From bare concrete to showroom finish</h2>
          <p className="mt-3 text-[15px] text-slate-500">Every concept is generated from the customer's actual photo — so they see exactly what they're buying.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {TRANSFORMATIONS.map((t) => (
            <div key={`${t.label}-${t.space}`} className="rounded-2xl overflow-hidden border border-slate-200 bg-white group">
              <div className="grid grid-cols-2 gap-px bg-slate-200">
                <div className="relative overflow-hidden">
                  <Image src={t.before} fittingType="fill" className="aspect-[4/3] w-full group-hover:scale-105 transition-transform duration-500" alt={`${t.space} floor before`} />
                  <span className="absolute top-2 left-2 text-[9px] font-semibold uppercase tracking-wide bg-white/90 text-slate-600 px-2 py-0.5 rounded">Before</span>
                </div>
                <div className="relative overflow-hidden">
                  <Image src={t.after} fittingType="fill" className="aspect-[4/3] w-full group-hover:scale-105 transition-transform duration-500" alt={`${t.space} floor after`} />
                  <span className="absolute top-2 left-2 text-[9px] font-semibold uppercase tracking-wide bg-[#F5C542] text-slate-900 px-2 py-0.5 rounded">After</span>
                </div>
              </div>
              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-slate-900">{t.label}</p>
                  <p className="text-[11px] text-slate-500">{t.space}</p>
                </div>
                <Sparkles className="w-4 h-4 text-[#8a6a00]" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-5 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#8a6a00] font-medium">Everything you need</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">The complete flooring sales platform</h2>
          <p className="mt-3 text-[15px] text-slate-500">From the first customer photo to the signed proposal — all in one place.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="group rounded-2xl border border-slate-200 p-6 hover:border-slate-300 hover:shadow-lg transition-all">
              <div className="w-11 h-11 rounded-xl bg-slate-900 text-[#F5C542] grid place-items-center mb-4 group-hover:scale-105 transition-transform">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-[16px] font-semibold text-slate-900">{title}</h3>
              <p className="mt-1.5 text-[13px] text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-5 py-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#8a6a00] font-medium">How it works</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">From photo to proposal in 4 steps</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] font-mono text-slate-400">{String(i + 1).padStart(2, "0")}</span>
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 grid place-items-center">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
                <p className="mt-1 text-[13px] text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-5 py-20">
        <div className="rounded-3xl bg-slate-900 text-white p-10 sm:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle at 50% 50%, #F5C542 0, transparent 60%)" }} />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Ready to close more flooring jobs?</h2>
            <p className="mt-3 text-[15px] text-slate-300 max-w-md mx-auto">Join contractors using Xtreme Visualizer to visualize, quote, and close faster.</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button asChild className="bg-[#F5C542] text-slate-900 hover:bg-[#e6b73c] h-12 px-6 text-[14px] font-medium">
                <Link to="/register">Get started free <ArrowRight className="w-4 h-4 ml-1.5" /></Link>
              </Button>
              <Button asChild variant="outline" className="h-12 px-6 text-[14px] border-slate-600 text-white hover:bg-slate-800">
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-[#F5C542] grid place-items-center font-semibold text-xs tracking-tight">XV</div>
            <span className="text-[13px] font-medium text-slate-700">Xtreme Visualizer</span>
          </div>
          <p className="text-[12px] text-slate-400">© {new Date().getFullYear()} Xtreme Visualizer. AI concept visualizations are not completed customer projects.</p>
        </div>
      </footer>
    </div>
  );
}