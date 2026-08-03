import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, MessageSquare, Share2, Copy, Check, Loader2 } from "lucide-react";

export default function SharePanel({ proposalText, customerEmail }) {
  const [emailTo, setEmailTo] = useState(customerEmail || "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  const sendEmail = async () => {
    if (!emailTo) return setErr("Enter the customer's email address.");
    setSending(true);
    setErr("");
    try {
      const res = await fetch("/api/v1/functions/gmail/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", to: emailTo, subject: "Your Flooring Proposal — Xtreme Polishing Systems", text: proposalText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      setSent(true);
    } catch (e) {
      setErr(e.message || "Could not send email. Make sure your Gmail is connected in Settings.");
    } finally {
      setSending(false);
    }
  };

  const shareText = encodeURIComponent(proposalText.slice(0, 1500) + "\n\n— Xtreme Polishing Systems");
  const smsLink = `sms:?&body=${shareText}`;
  const waLink = `https://wa.me/?text=${shareText}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(proposalText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 p-4 space-y-3">
        <p className="text-[12px] font-medium text-slate-700 flex items-center gap-2"><Mail className="w-4 h-4" /> Email proposal to customer</p>
        <div className="flex gap-2">
          <Input type="email" placeholder="customer@email.com" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} className="flex-1" />
          <Button onClick={sendEmail} disabled={sending || sent} className="bg-slate-900 hover:bg-slate-800 shrink-0">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : sent ? <Check className="w-4 h-4" /> : null}
            {sent ? "Sent" : "Send"}
          </Button>
        </div>
        {err && <p className="text-[11px] text-red-600">{err}</p>}
        {sent && <p className="text-[11px] text-emerald-600">Proposal sent to {emailTo}</p>}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button asChild variant="outline" className="h-auto py-3 flex-col gap-1">
          <a href={smsLink}>
            <MessageSquare className="w-4 h-4" />
            <span className="text-[11px]">Text</span>
          </a>
        </Button>
        <Button asChild variant="outline" className="h-auto py-3 flex-col gap-1">
          <a href={waLink} target="_blank" rel="noreferrer">
            <Share2 className="w-4 h-4" />
            <span className="text-[11px]">WhatsApp</span>
          </a>
        </Button>
        <Button variant="outline" onClick={copy} className="h-auto py-3 flex-col gap-1">
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          <span className="text-[11px]">{copied ? "Copied" : "Copy"}</span>
        </Button>
      </div>
      <p className="text-[11px] text-slate-400 text-center">Email sends from your connected Gmail. Text & WhatsApp open your phone's share screen.</p>
    </div>
  );
}