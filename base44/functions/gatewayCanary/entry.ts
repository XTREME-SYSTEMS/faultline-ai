// Isolated, authenticated Vercel AI Gateway canary.
// Does not change existing FaultLine inference paths.
// Never return secrets or the upstream body on failures.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  if (req.method !== 'POST') return Response.json({error:'Method not allowed'}, {status:405});
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({error:'Unauthorized'}, {status:401});
    const key = Deno.env.get('VERCEL_AI_GATEWAY_KEY');
    if (!key) return Response.json({ok:false,stage:'configuration',error:'Gateway credential unavailable in deployed runtime'}, {status:503});
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    let upstream;
    try {
      upstream = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
        method:'POST',
        headers:{'Authorization': 'Bearer ' + key,'Content-Type':'application/json'},
        body:JSON.stringify({model:'openai/gpt-4.1-mini',messages:[{role:'user',content:'Reply with just CANARY_OK'}],max_tokens:24}),
        signal:controller.signal
      });
    } finally { clearTimeout(timer); }
    if (!upstream.ok) return Response.json({ok:false,stage:'gateway',upstream_status:upstream.status}, {status:502});
    const result = await upstream.json();
    const text = result?.choices?.[0]?.message?.content;
    return Response.json({ok:typeof text === 'string' && text.includes('CANARY_OK'),stage:'inference',model:result?.model ?? null,receipt:'FAULTLINE-GATEWAY-CANARY-V1'});
  } catch (_) {
    return Response.json({ok:false,stage:'runtime',error:'Canary failed without exposing credentials'}, {status:500});
  }
}