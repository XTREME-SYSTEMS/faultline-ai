import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { slugify, createVercelProject, disableVercelSso, deployToVercel } from '../../shared/launchInfra.ts';

// SEO-SAFE CONTENT REWRITE
// Fetches a deployed clone, rewrites every substantial visible text block to be
// original (same meaning + keywords + approximate length, fresh wording) so the
// clone is not flagged as duplicate content by Google, then redeploys to Vercel.
// Preserves all HTML structure, tags, scripts, styles, images, and entities.

const MIN_BLOCK_LEN = 30;       // skip nav labels / single words
const MAX_BLOCKS = 60;          // cap per LLM call to keep payload safe

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { source_url, clone_name, return_html } = body;
    if (!source_url) return Response.json({ error: 'source_url required' }, { status: 400 });

    // 1. Fetch the clone HTML
    const r = await fetch(source_url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SeoRewriter/1.0)' } });
    if (!r.ok) throw new Error(`Fetch failed (${r.status})`);
    let html = await r.text();

    // 2. Extract and placeholder script/style/textarea/noscript/svg blocks so we
    //    never rewrite code or hidden text.
    const blocks: string[] = [];
    let working = html.replace(/<(script|style|textarea|noscript|svg)[\s\S]*?<\/\1>/gi, (m) => {
      const i = blocks.length;
      blocks.push(m);
      return `\x00BLOCK${i}\x00`;
    });

    // 3. Collect substantial visible text nodes (between tags, no raw '<')
    const textBlocks: string[] = [];
    for (const m of working.matchAll(/>([^<]+)</g)) {
      const t = m[1].trim();
      if (t.length >= MIN_BLOCK_LEN) textBlocks.push(t);
    }
    const totalFound = textBlocks.length;
    const toRewrite = textBlocks.slice(0, MAX_BLOCKS);

    if (toRewrite.length === 0) {
      return Response.json({ error: 'No substantial text blocks found to rewrite' }, { status: 400 });
    }

    // 4. One LLM call — rewrite every block to be original, preserving meaning,
    //    keywords, approximate length, and any HTML entities.
    const rewritePrompt = `You are an SEO content rewriter. Rewrite each text block below to be ORIGINAL, plagiarism-free copy that will not trigger Google's duplicate-content filter.

Rules for EVERY block:
- Keep the same meaning, the same target keywords, and the same approximate length.
- Keep the same tone and reading level.
- Preserve any HTML entities (e.g. &amp; &nbsp; &#39; &mdash;) EXACTLY as they appear.
- Do NOT add or remove headings, bullet markers, or punctuation that changes structure.
- Do NOT invent facts, prices, or statistics — generalize if needed.
- Return the rewritten blocks in the SAME ORDER as the input, indexed from 0.

Input blocks (JSON array of strings):
${JSON.stringify(toRewrite, null, 2)}

Return JSON: { "rewrites": [ { "index": 0, "text": "..." }, ... ] } — one entry per input block, in order.`;

    const llmRes = await base44.integrations.Core.InvokeLLM({
      prompt: rewritePrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          rewrites: {
            type: 'array',
            items: { type: 'object', properties: { index: { type: 'number' }, text: { type: 'string' } } }
          }
        }
      }
    });

    const rewrites: Array<{ index: number; text: string }> = llmRes.rewrites || [];
    // Build a position-indexed lookup (LLM may not return every index)
    const byIndex = new Map<number, string>();
    for (const r2 of rewrites) { if (r2 && typeof r2.index === 'number' && r2.text) byIndex.set(r2.index, r2.text); }

    // 5. Splice rewrites back positionally — only the first MAX_BLOCKS substantial
    //    nodes are replaced; the rest are left untouched.
    let subIdx = 0;
    working = working.replace(/>([^<]+)</g, (m, text) => {
      const t = text.trim();
      if (t.length >= MIN_BLOCK_LEN && subIdx < MAX_BLOCKS) {
        const replacement = byIndex.get(subIdx);
        subIdx++;
        if (replacement) {
          const lead = text.slice(0, text.length - text.trimStart().length);
          const trail = text.slice(text.trimEnd().length);
          return `>${lead}${replacement}${trail}<`;
        }
      }
      return m;
    });

    // 6. Restore script/style/textarea/noscript/svg blocks
    working = working.replace(/\x00BLOCK(\d+)\x00/g, (_m, i) => blocks[+i] || '');
    html = working;

    const rewrittenCount = byIndex.size;
    // Coverage check: warn if LLM returned less than 80% of blocks
    const coverage = toRewrite.length > 0 ? Math.round((rewrittenCount / toRewrite.length) * 100) : 0;
    if (coverage < 80 && toRewrite.length > 5) {
      console.warn(`rewriteContentForSeo: low coverage (${rewrittenCount}/${toRewrite.length} = ${coverage}%) — some blocks kept original text`);
    }

    // 7. Return HTML in-memory (no deploy) or deploy to Vercel
    if (return_html) {
      return Response.json({
        status: 'success',
        source_url,
        rewritten_html: html,
        blocks_found: totalFound,
        blocks_rewritten: rewrittenCount,
        blocks_skipped: Math.max(0, totalFound - MAX_BLOCKS),
        coverage,
        summary: `Rewrote ${rewrittenCount} of ${totalFound} text blocks to original copy (${coverage}% coverage).`,
      });
    }
    const token = secrets.get('VERCEL_TOKEN');
    if (!token) throw new Error('VERCEL_TOKEN secret not set');
    const teamId = secrets.get('VERCEL_TEAM_ID') || null;
    const baseSlug = slugify(clone_name || 'lead-gen-near-you') || 'lead-gen-near-you';
    const slug = `${baseSlug}-seo`;
    const vProject = await createVercelProject(token, teamId, slug);
    try { await disableVercelSso(token, teamId, vProject.id); } catch (e) { /* non-fatal */ }
    const deploy = await deployToVercel(token, teamId, slug, vProject.id, html);

    return Response.json({
      status: 'success',
      source_url,
      rewritten_url: deploy.url,
      rewritten_html: html,
      blocks_found: totalFound,
      blocks_rewritten: rewrittenCount,
      blocks_skipped: Math.max(0, totalFound - MAX_BLOCKS),
      coverage,
      summary: `Rewrote ${rewrittenCount} of ${totalFound} text blocks to original copy and redeployed (${coverage}% coverage).`,
    });
  } catch (error) {
    console.error('rewriteContentForSeo error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}