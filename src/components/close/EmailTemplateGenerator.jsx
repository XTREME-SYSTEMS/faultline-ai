import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { EMAIL_TYPES, emailPrompt, EMAIL_JSON_SCHEMA } from "@/lib/closeEngine";
import { Loader2, Mail, Save, Check, Send } from "lucide-react";

export default function EmailTemplateGenerator({ lead, brand }) {
  const [type, setType] = useState("proposal_delivery");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [sending, setSending] = useState(false);
  const [sentOk, setSentOk] = useState(false);
  const [err, setErr] = useState("");

  const generate = async () => {
    setBusy(true);
    setSavedId(null);
    setSentOk(false);
    setErr("");
    try {
      const out = await base44.integrations.Core.InvokeLLM({
        prompt: emailPrompt(lead, type, brand),
        response_json_schema: EMAIL_JSON_SCHEMA,
      });
      setSubject(out.subject || "");
      setBody(out.body || "");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const rec = await base44.entities.MessageTemplate.create({
        lead_id: lead.id,
        template_type: type,
        subject,
        body,
        status: "draft",
      });
      setSavedId(rec.id);
    } finally {
      setSaving(false);
    }
  };

  const send = async () => {
    setSending(true);
    setErr("");
    setSentOk(false);
    try {
      const res = await base44.functions.invoke("gmail", {
        action: "send",
        to: lead.email,
        subject,
        text: body,
        attachment_url: attachmentUrl || undefined,
        attachment_name: "concept.png",
        attachment_type: "image/png",
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[240px] text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EMAIL_TYPES.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="text-[12px]" disabled={busy} onClick={generate}>
          {busy ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Mail className="w-3.5 h-3.5 mr-1.5" />}
          Generate draft
        </Button>
        <Button size="sm" className="text-[12px] bg-slate-900" disabled={!subject || saving} onClick={save}>
          {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
          Save template
        </Button>
        {savedId && (
          <span className="inline-flex items-center text-[12px] text-emerald-600 gap-1">
            <Check className="w-3.5 h-3.5" /> Saved
          </span>
        )}
      </div>

      {subject || body ? (
        <div className="space-y-2">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="text-[13px] font-medium" />
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} placeholder="Email body" className="text-[13px] leading-relaxed" />
          <Input value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} placeholder="Optional: paste a concept image URL to attach" className="text-[12px]" />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" className="text-[12px] bg-[#F5C542] text-slate-900 hover:bg-[#e9b92f]" disabled={!subject || !lead?.email || sending} onClick={send}>
              {sending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
              Send via Gmail {lead?.email ? `to ${lead.email}` : ""}
            </Button>
            {sentOk && <span className="inline-flex items-center text-[12px] text-emerald-600 gap-1"><Check className="w-3.5 h-3.5" /> Sent</span>}
            {err && <span className="text-[12px] text-red-600">{err}</span>}
            {!lead?.email && <span className="text-[11px] text-slate-400">Add a customer email on the lead to send.</span>}
          </div>
        </div>
      ) : (
        <p className="text-[12px] text-slate-400">Pick a follow-up type and generate a draft. Optionally attach a concept image, then send via your connected Gmail.</p>
      )}
    </div>
  );
}