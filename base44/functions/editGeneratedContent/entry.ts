import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Surgical AI editor — takes generated HTML + a natural language instruction,
// returns find/replace operations that change ONLY the specific thing requested.
// The frontend applies each find/replace, ensuring minimal, targeted edits.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { html, instruction } = body;

    if (!html) return Response.json({ error: 'html is required' }, { status: 400 });
    if (!instruction) return Response.json({ error: 'instruction is required' }, { status: 400 });

    // Truncate very large HTML to fit LLM context (keep beginning + end where head/footer live)
    const maxLen = 60000;
    let htmlForLLM = html;
    if (html.length > maxLen) {
      htmlForLLM = html.substring(0, maxLen / 2) + '\n<!-- ... middle truncated ... -->\n' + html.substring(html.length - maxLen / 2);
    }

    const editPrompt = `You are a SURGICAL HTML editor. You are given HTML content and an edit instruction.
Your job: make ONLY the specific change requested — absolutely nothing else.

Return a JSON object with an "operations" array. Each operation is a find/replace pair:
{ "find": "<EXACT substring that currently exists in the HTML>", "replace": "<new string>" }

CRITICAL RULES:
1. The "find" string MUST be an exact, character-for-character substring that currently exists in the HTML. Copy it directly from the source.
2. Make the MINIMUM number of operations possible (ideally 1-2, max 5).
3. Do NOT rewrite entire sections, pages, or large blocks. Only change the specific text, element, attribute, or style requested.
4. If changing TEXT content: find just the text (e.g. the words inside an <h1>, not the whole tag unless the tag itself must change).
5. If changing a COLOR: find just the color value (e.g. "#C89B3C" or "color: #C89B3C;" or "background: #C89B3C").
6. If changing a STYLE: find just the style attribute value or CSS rule.
7. If changing an ATTRIBUTE: find just the attribute value.
8. Preserve ALL surrounding HTML structure, classes, and attributes.
9. If the instruction is vague, make the most targeted, minimal change that satisfies it.
10. If you cannot find an exact match for what needs to change, return an empty operations array.

INSTRUCTION: ${instruction}

HTML CONTENT:
${htmlForLLM}

Return ONLY the JSON object.`;

    const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: editPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          operations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                find: { type: 'string' },
                replace: { type: 'string' }
              }
            }
          },
          summary: { type: 'string' }
        }
      }
    });

    // Filter to only operations whose "find" actually exists in the real (untruncated) HTML
    const operations = (llmRes?.operations || []).filter(op =>
      op.find && typeof op.find === 'string' && html.includes(op.find)
    );

    return Response.json({
      status: 'success',
      operations,
      summary: llmRes?.summary || `Applied ${operations.length} surgical edit(s)`,
      applied_count: operations.length,
    });
  } catch (error) {
    console.error('editGeneratedContent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}