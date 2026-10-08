// HTTP proxy so frontend components can call the Vercel AI Gateway
// without exposing the server-side API key.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { invokeLLM } from '../../shared/llm.ts';

export default async function(req) {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const result = await invokeLLM({
      prompt: body.prompt,
      response_json_schema: body.response_json_schema || null,
      add_context_from_internet: body.add_context_from_internet || false,
      model: body.model || 'automatic',
      file_urls: body.file_urls || null,
    });

    return Response.json({ result });
  } catch (err) {
    console.error('gatewayLLM error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}