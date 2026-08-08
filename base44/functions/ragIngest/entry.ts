import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// RAG Ingestion — the knowledge compounding layer.
//
// MISSION: Turn every piece of content (code, templates, docs, cloned components,
// generated code) into searchable, retrievable knowledge for the autonomous
// coding system.
//
// This function chunks content into manageable pieces, enriches each chunk with
// metadata (tags, summary, category), and stores them as WebsiteLibraryAsset
// records (library_type: 'rag_document'). The ragQuery function then retrieves
// the most relevant chunks using LLM-ranked semantic search.
//
// The RAG system is the memory of the coding engine — every piece of code ever
// generated or cloned becomes available as context for future generation,
// creating a compounding knowledge flywheel.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });
    const body = await req.json().catch(() => ({}));
    const {
      content, title, source_type, source_id, tags, metadata, organization_id,
      chunk_size, generate_summary
    } = body;
    const targetOrg = organization_id || orgId;

    if (!content || content.length < 10) {
      return Response.json({ error: 'content required (min 10 chars)' }, { status: 400 });
    }

    const sourceType = source_type || 'document'; // code | template | doc | clone | website
    const chunkSize = chunk_size || 2000;
    const shouldSummarize = generate_summary !== false;

    // 1. CHUNK the content into manageable pieces
    //    Split by double newlines (paragraphs/sections) first, then by size.
    const chunks = [];
    const paragraphs = content.split(/\n\n+/);

    let currentChunk = '';
    for (const para of paragraphs) {
      if ((currentChunk + '\n\n' + para).length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = para;
      } else {
        currentChunk = currentChunk ? currentChunk + '\n\n' + para : para;
      }
    }
    if (currentChunk) chunks.push(currentChunk);

    // If any chunk is still too large (single long paragraph), split by size
    const finalChunks = [];
    for (const chunk of chunks) {
      if (chunk.length <= chunkSize * 1.5) {
        finalChunks.push(chunk);
      } else {
        for (let i = 0; i < chunk.length; i += chunkSize) {
          finalChunks.push(chunk.slice(i, i + chunkSize));
        }
      }
    }

    // 2. GENERATE SUMMARY + TAGS for the content (if requested)
    //    This powers the LLM-ranked retrieval — the summary and tags are what
    //    the ragQuery function sends to the LLM to rank relevance.
    let summary = '';
    let autoTags = [];
    if (shouldSummarize && finalChunks.length > 0) {
      try {
        const summaryRes = await base44.integrations.Core.InvokeLLM({
          prompt: `Analyze this content and provide:
1. A concise summary (2-3 sentences) describing what this content is and what it does
2. 5-10 relevant tags/keywords that would help retrieve this content in a search

Content title: ${title || 'Untitled'}
Source type: ${sourceType}
Content preview (first 2000 chars):
${content.slice(0, 2000)}

Return JSON with: summary (string), tags (array of strings).`,
          model: 'gemini_3_flash',
          response_json_schema: {
            type: 'object',
            properties: {
              summary: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } }
            }
          }
        });
        summary = summaryRes.summary || '';
        autoTags = Array.isArray(summaryRes.tags) ? summaryRes.tags : [];
      } catch (e) {
        console.error('Summary generation failed:', e.message);
      }
    }

    const allTags = [...new Set([...(tags || []), ...autoTags])];

    // 3. STORE each chunk as a WebsiteLibraryAsset (library_type: 'rag_document')
    //    Each chunk gets: the chunk content, its index, the summary, and all tags.
    //    This makes every chunk independently retrievable.
    let stored = 0;
    const storedIds = [];

    for (let i = 0; i < finalChunks.length; i++) {
      try {
        const chunk = finalChunks[i];
        const recordId = `RAG-${Date.now().toString(36)}-${i}`;
        const asset = await base44.entities.WebsiteLibraryAsset.create({
          organization_id: targetOrg,
          library_type: 'rag_document',
          record_id: recordId,
          name: finalChunks.length > 1 ? `${title || 'Untitled'} (chunk ${i + 1}/${finalChunks.length})` : (title || 'Untitled'),
          category: sourceType,
          data: {
            content: chunk,
            chunk_index: i,
            total_chunks: finalChunks.length,
            title: title || 'Untitled',
            source_type: sourceType,
            source_id: source_id || null,
            summary,
            tags: allTags,
            metadata: metadata || {},
            ingested_at: new Date().toISOString()
          },
          status: 'active'
        });
        stored++;
        storedIds.push(asset.id);
      } catch (e) {
        console.error(`Failed to store chunk ${i}: ${e.message}`);
      }
    }

    return Response.json({
      status: 'success',
      title: title || 'Untitled',
      source_type: sourceType,
      total_chunks: finalChunks.length,
      chunks_stored: stored,
      summary,
      tags: allTags,
      asset_ids: storedIds,
      message: `Ingested ${stored} chunks into RAG (${sourceType})`
    });
  } catch (error) {
    console.error('ragIngest error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}