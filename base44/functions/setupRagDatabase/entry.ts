import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    // Get Supabase OAuth access token
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('supabase');
    if (!accessToken) return Response.json({ error: 'Supabase not connected' }, { status: 500 });

    // 1. Discover project ref
    const projectsRes = await fetch('https://api.supabase.com/v1/projects', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!projectsRes.ok) {
      const txt = await projectsRes.text();
      return Response.json({ error: `Failed to list projects: ${txt}` }, { status: 502 });
    }
    const projects = await projectsRes.json();
    const project = projects[0];
    if (!project) return Response.json({ error: 'No Supabase projects found in your account' }, { status: 404 });
    const projectRef = project.id;

    // 2. Create RAG schema (vector extension + documents table + search function)
    const sql = `
      CREATE EXTENSION IF NOT EXISTS vector;

      CREATE TABLE IF NOT EXISTS faultline_documents (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        organization_id TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_id TEXT,
        title TEXT,
        content TEXT NOT NULL,
        embedding VECTOR(1536),
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_faultline_docs_org ON faultline_documents (organization_id);
      CREATE INDEX IF NOT EXISTS idx_faultline_docs_source ON faultline_documents (source_type, source_id);
      CREATE INDEX IF NOT EXISTS idx_faultline_docs_embedding ON faultline_documents
        USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

      CREATE OR REPLACE FUNCTION match_faultline_documents(
        query_embedding VECTOR(1536),
        query_org TEXT,
        match_count INT DEFAULT 10,
        filter_source TEXT DEFAULT NULL
      )
      RETURNS TABLE (
        id BIGINT,
        source_type TEXT,
        source_id TEXT,
        title TEXT,
        content TEXT,
        metadata JSONB,
        similarity FLOAT
      )
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RETURN QUERY
        SELECT
          d.id,
          d.source_type,
          d.source_id,
          d.title,
          d.content,
          d.metadata,
          1 - (d.embedding <=> query_embedding) AS similarity
        FROM faultline_documents d
        WHERE d.organization_id = query_org
          AND (filter_source IS NULL OR d.source_type = filter_source)
        ORDER BY d.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;
    `;

    const ddlRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql })
    });
    if (!ddlRes.ok) {
      const txt = await ddlRes.text();
      return Response.json({ error: `DDL failed: ${txt}` }, { status: 502 });
    }

    // 3. Fetch service_role key for future data access
    const keysRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/api-keys`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    let serviceRoleKey = null;
    if (keysRes.ok) {
      const keys = await keysRes.json();
      const sr = keys.find(k => k.name === 'service_role');
      if (sr) serviceRoleKey = sr.api_key;
    }

    return Response.json({
      status: 'success',
      project_ref: projectRef,
      project_name: project.name,
      table: 'faultline_documents',
      search_function: 'match_faultline_documents',
      service_role_key_available: !!serviceRoleKey,
      message: 'RAG database schema created. Use syncRagData to populate it and ragSearch to query it.'
    });
  } catch (error) {
    console.error('setupRagDatabase error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}