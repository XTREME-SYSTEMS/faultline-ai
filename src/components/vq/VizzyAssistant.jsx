import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Loader2, Mic, Send } from "lucide-react";

const GUARD = `You are Vizzy, the assistant inside VisualQuote AI for flooring contractors.
You may: explain floor systems, guide photo capture, help correct floor masks, compare finishes,
explain quote assumptions, summarize leads, and prepare communication drafts.
You must NEVER promise or state a final price, a schedule or completion date, any warranty,
engineering suitability, or code compliance. Always call prices preliminary ranges and
defer final commitments to the contractor. Keep answers under 120 words.`;

export default function VizzyAssistant({ context = "" }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [messages, setMessages] = useState([
    { role: "vizzy", text: "Hi, I'm Vizzy. Ask me about floor systems, photo tips, mask corrections, or what's behind a preliminary range." },
  ]);

  const send = async (text) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: "you", text }]);
    setInput("");
    setBusy(true);
    const reply = await base44.integrations.Core.InvokeLLM({
      prompt: `${GUARD}\n\nCurrent screen context: ${context || "none"}\n\nUser: ${text}`,
    });
    setBusy(false);
    setMessages((m) => [...m, { role: "vizzy", text: String(reply) }]);
  };

  const listen = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return setMessages((m) => [...m, { role: "vizzy", text: "Voice input isn't supported in this browser — type your question instead." }]);
    const rec = new SR();
    rec.lang = "en-US";
    setListening(true);
    rec.onresult = (e) => { setListening(false); send(e.results[0][0].transcript); };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full bg-slate-900 text-[#F5C542] grid place-items-center shadow-lg hover:scale-105 transition-transform"
        aria-label="Open Vizzy assistant"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>

      {open && (
        <div className="fixed bottom-20 right-4 z-40 w-[calc(100vw-2rem)] sm:w-[360px] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-[14px] font-semibold text-slate-900">Vizzy</p>
            <p className="text-[11px] text-slate-500">Guidance only — never final price, schedule, or warranty.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-[13px] leading-relaxed rounded-xl px-3 py-2 max-w-[90%] ${
                  m.role === "you" ? "ml-auto bg-slate-900 text-white" : "bg-slate-100 text-slate-800"
                }`}
              >
                {m.text}
              </div>
            ))}
            {busy && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
          </div>
          <form
            className="p-3 border-t border-slate-100 flex items-center gap-2"
            onSubmit={(e) => { e.preventDefault(); send(input); }}
          >
            <Button type="button" size="icon" variant={listening ? "default" : "outline"} className="h-9 w-9 shrink-0" onClick={listen}>
              <Mic className="w-4 h-4" />
            </Button>
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask Vizzy…" className="text-[13px]" />
            <Button type="submit" size="icon" className="h-9 w-9 shrink-0 bg-slate-900" disabled={busy}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}