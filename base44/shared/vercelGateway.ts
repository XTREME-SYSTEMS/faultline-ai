// FaultLine server-side Vercel AI Gateway adapter (opt-in).
// Does not change existing Base44 InvokeLLM consumers.
const GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';

export async function gatewayChat({ prompt, model = 'openai/gpt-4.1-mini', maxTokens = 1024, timeoutMs = 20000, system = '' }) {
  const key = Deno.env.get('VERCEL_AI_GATEWAY_KEY');
  if (!key) throw new Error('AI_GATEWAY_NOT_CONFIGURED');
  if (typeof prompt !== 'string' || !prompt.trim()) throw new Error('INVALID_PROMPT');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.min(timeoutMs, 30000));
  try {
    const response = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          ...(system ? [{role: 'system', content: system}] : []),
          {role:'user', content:prompt}
        ],
        max_tokens: Math.max(1,Math.min(4096,maxTokens))
      }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error('AI_GATEWAY_HTTP_' + response.status);
    const body = await response.json();
    const answer = body?.choices?.[0]?.message?.content;
    if (typeof answer !== 'string') throw new Error('AI_GATEWAY_INVALID_RESPONSE');
    return { text: answer, model: body.model ?? model, provider: 'vercel-ai-gateway' };
  } finally {clearTimeout(timeout);}
}