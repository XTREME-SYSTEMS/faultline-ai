import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/vq/PageHeader";
import SectionCard from "@/components/vq/SectionCard";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Check, Unlink } from "lucide-react";
import PricingProfileEditor from "@/components/pricing/PricingProfileEditor";
import CostOfBusinessCalculator from "@/components/pricing/CostOfBusinessCalculator";

const CONNECTOR_ID = "69db200274332486fd28dd7e";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const check = async () => {
    try {
      await base44.functions.invoke("gmail", { action: "list" });
      setConnected(true);
    } catch {
      setConnected(false);
    }
  };

  useEffect(() => {
    (async () => {
      const authed = await base44.auth.isAuthenticated();
      if (authed) {
        const me = await base44.auth.me();
        setUser(me);
        await check();
      }
      setLoading(false);
    })();
  }, []);

  const connect = async () => {
    setBusy(true);
    try {
      const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
      const popup = window.open(url, "_blank");
      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          check();
          setBusy(false);
        }
      }, 500);
    } catch {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await base44.connectors.disconnectAppUser(CONNECTOR_ID);
      setConnected(false);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="py-24 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Connect your Gmail to email customers proposals, concept images, and AI-drafted replies — all from your own inbox."
      />
      <SectionCard index="01" title="Email connection" tag="Gmail">
        {!user ? (
          <div className="space-y-3">
            <p className="text-[13px] text-slate-500">Sign in to connect your email.</p>
            <Button onClick={() => base44.auth.redirectToLogin()}>Sign in</Button>
          </div>
        ) : connected ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-emerald-50 grid place-items-center">
                <Check className="w-4 h-4 text-emerald-600" />
              </span>
              <div>
                <p className="text-[13px] font-medium text-slate-900">Gmail connected</p>
                <p className="text-[12px] text-slate-500">{user.email}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled={busy} onClick={disconnect}>
              {busy ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5 mr-1.5" />}
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[13px] text-slate-500">
              Connect your Gmail account to send proposals and images, and let AI draft replies to customer emails.
            </p>
            <Button disabled={busy} onClick={connect}>
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              Connect Gmail
            </Button>
          </div>
        )}
      </SectionCard>

      <SectionCard index="02" title="Standard pricing" tag="Your rates">
        <p className="text-[12px] text-slate-500 mb-4">Set your standard rates once — the competitive pricing builder uses these to pre-fill fuel, labor, and material costs.</p>
        <PricingProfileEditor />
      </SectionCard>

      <SectionCard index="03" title="Cost of doing business" tag="Overhead">
        <p className="text-[12px] text-slate-500 mb-4">Account for labor burden, insurance, fuel, vehicle, equipment, software/AI, IT, and more — the calculator outputs your burdened hourly rate and overhead to apply to every quote.</p>
        <CostOfBusinessCalculator />
      </SectionCard>
    </div>
  );
}