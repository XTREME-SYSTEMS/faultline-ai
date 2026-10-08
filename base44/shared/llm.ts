// Unified LLM invocation — routes 100% through the Vercel AI Gateway.
// Replaces base44.integrations.Core.InvokeLLM across the entire system.
// Matches the InvokeLLM interface so call sites need no logic changes.

const GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';

// Map Base44 model keys → Vercel AI Gateway provider-prefixed model IDs.
const MODEL_MAP: Record<string, string> = {
  automatic: 'openai/gpt-4.1-mini',
  gpt_5_mini: 'openai/gpt-4.1-mini',
  gpt_5_4: 'openai/gpt-4.1',
  gpt_5_6_sol: 'openai/gpt-4.1',
  gpt_5_6_luna: 'openai/gpt-4.1',
  gemini_3_flash: 'google/gemini-2.5-flash',
  gemini_3_1_pro: 'google/gemini-2.5-pro',
  claude_sonnet_4_6: 'anthropic/claude-sonnet-4',
  claude_opus_4_6: 'anthropic/claude-opus-4',
  claude_opus_4_7: 'anthropic/claude-opus-4',
  claude_opus_4_8: 'anthropic/claude-opus-4',
  claude_opus_5: 'anthropic/claude-opus-4',
  'claude-sonnet-5': 'anthropic/claude-sonnet-5',
};

interface InvokeLLMArgs {
  prompt: string;
  response_json_schema?: Record<string, any> | null;
  add_context_from_internet?: boolean;
  model?: string | null;
  file_urls?: string | string[] | null;
  app_id?: string | null;
  app_owner?: string | null;
}

export async function invokeLLM(args: InvokeLLMArgs): Promise<any> {
  const key = Deno.env.get('VERCEL_AI_GATEWAY_KEY');
  if (!key) throw new Error('AI_GATEWAY_NOT_CONFIGURED: VERCEL_AI_GATEWAY_KEY secret missing');

  const prompt = args.prompt;
  if (typeof prompt !== 'string' || !prompt.trim()) throw new Error('INVALID_PROMPT');

  const gatewayModel = MODEL_MAP[args.model || 'automatic'] || MODEL_MAP.automatic;

  // Build system message for JSON schema + web context hints
  let systemMsg = '';
  if (args.response_json_schema) {
    systemMsg += 'You must respond with valid JSON matching this exact schema. Return ONLY raw JSON, no markdown fences, no commentary:\n' + JSON.stringify(args.response_json_schema);
  }
  if (args.add_context_from_internet) {
    systemMsg += '\n(Web search context is not available via the gateway; use your training knowledge.)';
  }

  const messages: any[] = [];
  if (systemMsg) messages.push({ role: 'system', content: systemMsg });

  // Handle file_urls (images) — pass as multimodal content
  const fileUrls = args.file_urls
    ? (Array.isArray(args.file_urls) ? args.file_urls : [args.file_urls])
    : [];

  if (fileUrls.length > 0) {
    const content: any[] = [{ type: 'text', text: prompt }];
    for (const url of fileUrls) {
      if (typeof url === 'string' && url.startsWith('http')) {
        content.push({ type: 'image_url', image_url: { url } });
      }
    }
    messages.push({ role: 'user', content });
  } else {
    messages.push({ role: 'user', content: prompt });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: gatewayModel,
        messages,
        max_tokens: 4096,
        ...(args.response_json_schema ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error('AI_GATEWAY_HTTP_' + response.status + ': ' + errText.substring(0, 300));
    }

    const body = await response.json();
    const answer = body?.choices?.[0]?.message?.content;
    if (typeof answer !== 'string') throw new Error('AI_GATEWAY_INVALID_RESPONSE');

    if (args.response_json_schema) {
      try {
        return JSON.parse(answer);
      } catch {
        const jsonMatch = answer.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        throw new Error('AI_GATEWAY_JSON_PARSE_FAILED');
      }
    }

    return answer;
  } finally {
    clearTimeout(timeout);
  }
}