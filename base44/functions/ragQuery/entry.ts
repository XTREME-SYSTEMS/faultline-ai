import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// RAG Query — the retrieval layer.
//
// MISSION: Given a query, find the most relevant chunks from the RAG knowledge base
// and return them as context for the autonomous coding system.
//
// Approach: LLM-ranked retrieval (no external embedding API needed).
//   1. Fetch all RAG documents for the org (filtered by source_type if specified)
//   2. Build a compact index: id, title, summary, tags, first 200 chars of content
//   3. Send the index + query to the LLM, ask it to rank the top N most relevant
//   4. Fetch the full content of the top N ranked documents
//   5. Return the ranked chunks as context
//
// This works for moderate corpora (hundreds to low thousands of chunks). For
// larger corpora, the index can be pre-filtered by tags/category before LLM ranking.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });
    const body = await req.json().catch(() => ({}));
    const { query, source_type, top_k, organization_id } = body;
    const targetOrg = organization_id || orgId;

    if (!query || query.length < 3) {
      return Response.json({ error: 'query required (min 3 chars)' }, { status: 400 });
    }

    const topK = top_k || 5;

    // 1. FETCH all RAG documents for the org
    //    Filter by source_type if specified (code, template, doc, clone, website)
    const filter = { organization_id: targetOrg, library_type: 'rag_document' };
    if (source_type) filter.category = source_type;

    const allDocs = await base44.asServiceRole.entities.WebsiteLibraryAsset.filter(
      filter, '-created_date', 500
    );

    if (allDocs.length === 0) {
      return Response.json({
        status: 'success',
        query,
        results: [],
        context: '',
        message: 'No RAG documents found — ingest content first using ragIngest'
      });
    }

    // 2. BUILD a compact index for LLM ranking
    //    Each entry: id, title, source_type, summary, tags, content_preview (200 chars)
    const index = allDocs.map((doc: any) => ({
      id: doc.id,
      title: doc.data?.title || doc.name || 'Untitled',
      source_type: doc.category || doc.data?.source_type || 'document',
      summary: doc.data?.summary || '',
      tags: doc.data?.tags || [],
      content_preview: (doc.data?.content || '').slice(0, 200)
    }));

    // 3. LLM RANKING — ask the LLM to select the most relevant documents
    //    For large indexes, we batch to stay within token limits (max 100 entries per call)
    let rankedIds = [];

    if (index.length <= 100) {
      // Single LLM call for small indexes
      const rankRes = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a retrieval system. Given a query and an index of documents, select the ${topK} most relevant documents.

QUERY: ${query}

DOCUMENT INDEX (JSON):
${JSON.stringify(index.slice(0, 100))}

Select the ${topK} documents most relevant to the query. Consider:
- Title relevance (does the title match the query topic?)
- Summary relevance (does the summary describe something related to the query?)
- Tag relevance (do the tags match concepts in the query?)
- Content preview relevance (does the preview contain relevant information?)

Return JSON with: selected_ids (array of document IDs, most relevant first, max ${topK}), reasoning (string explaining why these were selected).`,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            selected_ids: { type: 'array', items: { type: 'string' } },
            reasoning: { type: 'string' }
          }
        }
      });
      rankedIds = Array.isArray(rankRes.selected_ids) ? rankRes.selected_ids : [];
    } else {
      // For large indexes: pre-filter by tag/title keyword matching, then LLM rank
      const queryLower = query.toLowerCase();
      const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
      const preFiltered = index.filter(doc => {
        const text = (doc.title + ' ' + doc.summary + ' ' + doc.tags.join(' ')).toLowerCase();
        return queryWords.some(w => text.includes(w));
      }).slice(0, 100);

      if (preFiltered.length === 0) {
        // Fallback: use the most recent documents
        rankedIds = index.slice(0, topK).map(d => d.id);
      } else {
        const rankRes = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a retrieval system. Given a query and an index of documents, select the ${topK} most relevant.

QUERY: ${query}

DOCUMENT INDEX (JSON):
${JSON.stringify(preFiltered)}

Return JSON with: selected_ids (array of IDs, most relevant first, max ${topK}), reasoning (string).`,
          model: 'gemini_3_flash',
          response_json_schema: {
            type: 'object',
            properties: {
              selected_ids: { type: 'array', items: { type: 'string' } },
              reasoning: { type: 'string' }
            }
          }
        });
        rankedIds = Array.isArray(rankRes.selected_ids) ? rankRes.selected_ids : [];
      }
    }

    // 4. FETCH full content of the ranked documents
    const rankedDocs = rankedIds
      .map(id => allDocs.find((d: any) => d.id === id))
      .filter(Boolean);

    const results = rankedDocs.map((doc: any, i: number) => ({
      rank: i + 1,
      id: doc.id,
      title: doc.data?.title || doc.name,
      source_type: doc.category || doc.data?.source_type,
      summary: doc.data?.summary || '',
      tags: doc.data?.tags || [],
      content: doc.data?.content || '',
      chunk_index: doc.data?.chunk_index || 0
    }));

    // 5. BUILD a combined context string for the coding system
    const context = results.map((r, i) =>
      `--- Context ${i + 1}: ${r.title} (${r.source_type}) ---\n${r.content}`
    ).join('\n\n');

    return Response.json({
      status: 'success',
      query,
      source_type: source_type || 'all',
      total_documents_searched: allDocs.length,
      results_returned: results.length,
      results,
      context,
      message: `Retrieved ${results.length} relevant chunks from ${allDocs.length} RAG documents`
    });
  } catch (error) {
    console.error('ragQuery error:', error);
    return Response.json({ error: error.message, results: [], context: '' }, { status: 500 });
  }
}