// Frontend helper — routes LLM calls through the Vercel AI Gateway
// via the gatewayLLM backend function (keeps the API key server-side).
import { base44 } from '@/api/base44Client';

export async function invokeLLM(args) {
  const res = await base44.functions.invoke('gatewayLLM', {
    prompt: args.prompt,
    response_json_schema: args.response_json_schema || null,
    add_context_from_internet: args.add_context_from_internet || false,
    model: args.model || 'automatic',
    file_urls: args.file_urls || null,
  });
  return res?.result ?? res;
}