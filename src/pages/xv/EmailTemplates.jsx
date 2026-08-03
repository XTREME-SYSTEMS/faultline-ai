import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/vq/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, Sparkles, Check } from "lucide-react";
import { EMAIL_TYPES, emailPrompt, EMAIL_JSON_SCHEMA } from "@/lib/closeEngine";

export default function EmailTemplates() {
  const [leads, setLeads] = useState([]);
  const [leadId, setLeadId] = useState("");
  const [emailType, setEmailType] = useState("proposal_delivery");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    base44.entities.Lead.list("-created_date", 50).then(setLeads);
  }, []);

  const lead = leads.find((l) => l.id === leadId);

  const generate = async () => {
    if (!lead) return;
    setGenerating(true);
    setErr("");
    setSent(false);
    try {
      const prompt = emailPrompt(lead, emailType, null);
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: EMAIL_JSON_SCHEMA,
      });
      setSubject(res.subject || "");
      setBody(res.body || "");
    } catch (e) {
      setErr("Could not generate email. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  const sendEmail = async () => {
    if (!lead?.email) return setErr("This lead has no email address.");
    setSending(true);
    setErr("");
    try {
      const res = await fetch("/api/v1/functions/gmail/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", to: lead.email, subject, text: body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      setSent(true);
    } catch (e) {
      setErr(e.message || "Could not send email. Make sure your Gmail is connected.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Branded follow-up"
        title="Email template generator"
        description="Generate branded follow-up emails for any lead and send them directly from your connected Gmail."
      />

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[12px]">Select a customer</Label>
            <Select value={leadId} onValueChange={setLeadId}>
              <SelectTrigger><SelectValue placeholder="Choose a lead..." /></SelectTrigger>
              <SelectContent>
                {leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.customer_name} — {l.floor_type || "Flooring"}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Email type</Label>
            <Select value={emailType} onValueChange={setEmailType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EMAIL_TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={generate} disabled={generating || !lead} className="w-full bg-slate-900 hover:bg-slate-800">
            {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {generating ? "Generating..." : "Generate email draft"}
          </Button>
          {lead && (
            <div className="rounded-lg border border-slate-200 p-3 text-[12px] text-slate-500 space-y-1">
              <p><span className="font-medium text-slate-700">To:</span> {lead.email || "No email"}</p>
              <p><span className="font-medium text-slate-700">Project:</span> {lead.floor_type} · {lead.square_feet?.toLocaleString() || "—"} sq ft</p>
              <p><span className="font-medium text-slate-700">Total:</span> {lead.proposal_total ? `$${lead.proposal_total.toLocaleString()}` : "—"}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[12px]">Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Body</Label>
            <Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} className="font-mono text-[12px]" />
          </div>
          {err && <p className="text-[12px] text-red-600">{err}</p>}
          {sent && <p className="text-[12px] text-emerald-600 flex items-center gap-1"><Check className="w-4 h-4" /> Email sent to {lead?.email}</p>}
          <Button onClick={sendEmail} disabled={sending || !subject || !body || !lead?.email} className="w-full bg-slate-900 hover:bg-slate-800">
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            {sending ? "Sending..." : "Send email"}
          </Button>
        </div>
      </div>
    </div>
  );
}