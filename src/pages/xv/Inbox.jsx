import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/vq/PageHeader";
import SectionCard from "@/components/vq/SectionCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Mail, RefreshCw, Sparkles, Send, Check } from "lucide-react";

function replyTo(from) {
  const m = (from || "").match(/<([^>]+)>/);
  return m ? m[1] : from;
}

export default function Inbox() {
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [reading, setReading] = useState(false);
  const [reply, setReply] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentOk, setSentOk] = useState(false);
  const [err, setErr] = useState("");

  const fetchInbox = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("gmail", { action: "list" });
      setItems(res.data.items || []);
      setConnected(true);
    } catch {
      setConnected(false);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInbox(); }, []);

  const open = async (id) => {
    setActiveId(id);
    setDetail(null);
    setReading(true);
    setReply("");
    setSentOk(false);
    setErr("");
    try {
      const res = await base44.functions.invoke("gmail", { action: "read", id });
      setDetail(res.data);
    } finally {
      setReading(false);
    }
  };

  const draftReply = async () => {
    if (!detail) return;
    setDrafting(true);
    setErr("");
    try {
      const out = await base44.integrations.Core.InvokeLLM({
        prompt: `A flooring contractor received this email. Draft a professional, concise reply that addresses the customer's question, offers clear next steps, and never promises a final price, fixed date, or warranty. Sign off as the contractor. Keep under 180 words.\n\nFrom: ${detail.from}\nSubject: ${detail.subject}\n\nEmail:\n${detail.body}`,
      });
      setReply(String(out));
    } finally {
      setDrafting(false);
    }
  };

  const send = async () => {
    setSending(true);
    setErr("");
    setSentOk(false);
    try {
      const res = await base44.functions.invoke("gmail", {
        action: "send",
        to: replyTo(detail.from),
        subject: detail.subject?.startsWith("Re:") ? detail.subject : `Re: ${detail.subject || ""}`,
        text: reply,
      });
      if (res.data?.ok) setSentOk(true);
      else setErr(res.data?.error || "Send failed");
    } catch (e) {
      setErr(e.response?.data?.error || e.message || "Send failed — is Gmail connected in Settings?");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Customer email"
        title="Inbox"
        description="Read incoming customer emails, let AI draft a reply, review it, and send — straight from your connected Gmail."
      />

      {!connected ? (
        <SectionCard index="01" title="Email not connected" tag="Gmail">
          <p className="text-[13px] text-slate-500">Connect your Gmail in Settings to read and reply to customer emails here.</p>
        </SectionCard>
      ) : (
        <div className="grid lg:grid-cols-2 gap-5">
          <SectionCard index="01" title="Recent inbox" tag={`${items?.length || 0} messages`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] text-slate-500">Latest 15 inbox messages</p>
              <Button size="sm" variant="ghost" className="text-[12px]" onClick={fetchInbox} disabled={loading}>
                {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                Refresh
              </Button>
            </div>
            <div className="space-y-1.5 max-h-[520px] overflow-y-auto">
              {items?.length === 0 && !loading && (
                <p className="text-[12px] text-slate-400 py-8 text-center">No messages found.</p>
              )}
              {items?.map((m) => (
                <button
                  key={m.id}
                  onClick={() => open(m.id)}
                  className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors ${activeId === m.id ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:bg-slate-50"}`}
                >
                  <p className="text-[12px] font-medium text-slate-900 truncate">{m.subject}</p>
                  <p className="text-[11px] text-slate-500 truncate">{m.from}</p>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{m.snippet}</p>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard index="02" title="Message & AI reply" tag="Draft">
            {!activeId ? (
              <p className="text-[12px] text-slate-400 py-12 text-center">Select a message to read and draft a reply.</p>
            ) : reading ? (
              <div className="py-12 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
            ) : detail ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-[12px] font-medium text-slate-900">{detail.subject}</p>
                  <p className="text-[11px] text-slate-500">{detail.from}</p>
                  <p className="text-[12px] text-slate-600 mt-2 whitespace-pre-wrap leading-relaxed">{detail.body}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-[12px]" onClick={draftReply} disabled={drafting}>
                    {drafting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                    Draft AI reply
                  </Button>
                  <Button size="sm" className="text-[12px] bg-slate-900" onClick={send} disabled={!reply || sending}>
                    {sending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
                    Send reply
                  </Button>
                  {sentOk && <span className="inline-flex items-center text-[12px] text-emerald-600 gap-1 self-center"><Check className="w-3.5 h-3.5" /> Sent</span>}
                </div>
                {err && <p className="text-[12px] text-red-600">{err}</p>}
                <Textarea rows={10} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="AI draft appears here — review and edit before sending." className="text-[13px] leading-relaxed" />
              </div>
            ) : null}
          </SectionCard>
        </div>
      )}
    </div>
  );
}