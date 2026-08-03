import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { rfc2047, base64Url, base64Std, buildMime } from "../../shared/gmailMime.ts";

const CONNECTOR_ID = "69db200274332486fd28dd7e";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
    const auth = { Authorization: `Bearer ${accessToken}` };

    if (body.action === "send") {
      let attachment = null;
      if (body.attachment_url) {
        const resp = await fetch(body.attachment_url);
        if (!resp.ok) return Response.json({ error: "Could not fetch attachment" }, { status: 400 });
        const buf = new Uint8Array(await resp.arrayBuffer());
        attachment = {
          name: body.attachment_name || "attachment.png",
          type: body.attachment_type || "image/png",
          data: base64Std(buf),
        };
      }
      const mime = buildMime({ from: user.email, to: body.to, subject: body.subject, text: body.text, attachment });
      const raw = base64Url(mime);
      const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      });
      const data = await r.json();
      if (!r.ok) return Response.json({ error: data.error?.message || "send failed" }, { status: r.status });
      return Response.json({ ok: true, id: data.id });
    }

    if (body.action === "list") {
      const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15&q=in:inbox", { headers: auth });
      const data = await r.json();
      if (!r.ok) return Response.json({ error: data.error?.message || "list failed" }, { status: r.status });
      const ids = (data.messages || []).map((m) => m.id);
      const items = [];
      for (const id of ids) {
        const m = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`, { headers: auth });
        const mj = await m.json();
        const headers = Object.fromEntries((mj.payload?.headers || []).map((h) => [h.name, h.value]));
        items.push({ id, subject: headers.Subject || "(no subject)", from: headers.From || "", snippet: mj.snippet || "" });
      }
      return Response.json({ items });
    }

    if (body.action === "read") {
      const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${body.id}?format=full`, { headers: auth });
      const data = await r.json();
      if (!r.ok) return Response.json({ error: data.error?.message || "read failed" }, { status: r.status });
      const headers = Object.fromEntries((data.payload?.headers || []).map((h) => [h.name, h.value]));
      let textBody = "";
      function walk(part) {
        if (textBody) return;
        if (part.mimeType === "text/plain" && part.body?.data) {
          const b64 = part.body.data.replace(/-/g, "+").replace(/_/g, "/");
          const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
          textBody = new TextDecoder().decode(bytes);
        } else if (part.parts) {
          for (const p of part.parts) walk(p);
        }
      }
      walk(data.payload);
      return Response.json({ id: body.id, subject: headers.Subject || "", from: headers.From || "", body: textBody || data.snippet || "" });
    }

    return Response.json({ error: "unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}