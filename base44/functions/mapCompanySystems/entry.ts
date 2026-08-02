import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { fetchPage, discoverPageLinks, detectTechStack, extractData } from '../../shared/scraper.ts';

// Automated system cloner: crawls a company's website, infers their operational
// systems, maps nodes + edges, identifies leak points, and recommends AI enhancements.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found on user profile' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const companyId = body.company_id;
    if (!companyId) return Response.json({ error: 'company_id required' }, { status: 400 });

    const company = await base44.asServiceRole.entities.Company.get(companyId);
    if (!company || company.organization_id !== orgId) return Response.json({ error: 'Company not found' }, { status: 404 });

    // Gather context: website crawl + existing findings
    const websites = await base44.asServiceRole.entities.Website.filter({ organization_id: orgId, company_id: companyId });
    const existingFindings = await base44.asServiceRole.entities.Finding.filter({ organization_id: orgId });

    let crawlContext = '(no website crawl available)';
    let techStack: string[] = [];

    if (websites.length > 0) {
      const website = websites[0];
      const homeResult = await fetchPage(website.url);
      if (homeResult.ok && homeResult.html) {
        techStack = detectTechStack(homeResult.html);
        const subLinks = discoverPageLinks(homeResult.html, website.url);
        const subResults = await Promise.all(subLinks.slice(0, 3).map(l => fetchPage(l.url)));
        const pageSummaries = [homeResult, ...subResults].filter(p => p.ok).map((p, i) => {
          const ex = extractData(p.html, website.url);
          return `Page ${i}: ${ex.title || ''} | ${ex.wordCount} words | CTAs: ${ex.ctaCount} | Forms: ${ex.formCount} | Analytics: ${ex.hasAnalytics} | Trust: ${JSON.stringify(ex.trustSignals)}`;
        });
        crawlContext = `Website: ${website.url}\nTech stack: ${techStack.join(', ') || 'unknown'}\nPages:\n${pageSummaries.join('\n')}`;
      }
    }

    const findingsSummary = existingFindings.slice(0, 10).map(f => `- ${f.title} (${f.severity}, ${f.category}): ${f.description?.substring(0, 120)}`).join('\n');

    // Phase 1: AI infers the company's operational system map
    const mapResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a business systems architect. Based on the website crawl and findings below, infer the operational systems this company likely uses. This is the SYSTEM CLONE FOR AI ENHANCEMENT pillar — you are cloning their system map to show where AI can plug leaks and enhance operations.

COMPANY: ${company.name} (${company.industry || 'unknown industry'})

WEBSITE CRAWL:
${crawlContext}

EXISTING FINDINGS:
${findingsSummary || '(none yet)'}

Infer 5-8 operational system nodes this company likely has. Common types: website/cms, crm, billing/invoicing, scheduling/booking, inventory, communications/email, customer_support, marketing/ads, analytics, document_management, hr/payroll.

For each node provide:
- name: The system name (e.g. "Website (WordPress)", "CRM (likely HubSpot)")
- node_type: One of: website, crm, billing, scheduling, inventory, communications, support, marketing, analytics, documents, hr, other
- owner_role: Who likely owns it (e.g. "Marketing Lead", "Ops Manager", "IT")
- health_status: healthy, at_risk, or critical based on the findings
- description: 1-2 sentences about what this system does for them
- leak_points: Array of 1-3 specific revenue/efficiency leaks in this system (e.g. "No automated follow-up on leads after 24h", "Manual invoice entry causes billing delays")
- ai_enhancement: 1-2 sentences describing how AI could enhance or fix this system
- confidence: 0-100 how confident you are this system exists

Also infer 3-6 edges (connections between nodes) showing how data flows between systems. For each edge:
- source: index of source node (0-based)
- target: index of target node (0-based)
- relationship: e.g. "leads flow", "invoice sync", "customer data", "support tickets"
- risk_status: healthy, friction, or broken — how well these systems connect

Be specific and evidence-based. If the website uses WordPress, they likely have WP plugins. If they have HubSpot CMS, they likely use HubSpot CRM. Infer from signals.`,
      response_json_schema: {
        type: 'object',
        properties: {
          nodes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                node_type: { type: 'string' },
                owner_role: { type: 'string' },
                health_status: { type: 'string' },
                description: { type: 'string' },
                leak_points: { type: 'array', items: { type: 'string' } },
                ai_enhancement: { type: 'string' },
                confidence: { type: 'number' }
              }
            }
          },
          edges: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                source: { type: 'number' },
                target: { type: 'number' },
                relationship: { type: 'string' },
                risk_status: { type: 'string' }
              }
            }
          }
        }
      }
    });

    const nodes = mapResponse.nodes || [];
    const edges = mapResponse.edges || [];

    // Phase 2: Clear old system map for this company, then create new nodes
    const oldNodes = await base44.asServiceRole.entities.SystemNode.filter({ organization_id: orgId, company_id: companyId });
    const oldNodeIds = oldNodes.map(n => n.id);
    if (oldNodeIds.length > 0) {
      await base44.asServiceRole.entities.SystemNode.deleteMany({ id: { $in: oldNodeIds } });
    }
    const oldEdges = await base44.asServiceRole.entities.SystemEdge.filter({ organization_id: orgId });
    const oldEdgesForCompany = oldEdges.filter(e => oldNodeIds.includes(e.source_node_id) || oldNodeIds.includes(e.target_node_id));
    if (oldEdgesForCompany.length > 0) {
      await base44.asServiceRole.entities.SystemEdge.deleteMany({ id: { $in: oldEdgesForCompany.map(e => e.id) } });
    }

    // Create new nodes
    const createdNodes = [];
    for (const node of nodes) {
      const created = await base44.asServiceRole.entities.SystemNode.create({
        organization_id: orgId,
        company_id: companyId,
        node_type: node.node_type,
        name: node.name,
        owner_role: node.owner_role,
        health_status: node.health_status,
        description: node.description,
        leak_points: node.leak_points || [],
        ai_enhancement: node.ai_enhancement,
        confidence: node.confidence
      });
      createdNodes.push(created);
    }

    // Create edges
    const createdEdges = [];
    for (const edge of edges) {
      if (edge.source >= 0 && edge.source < createdNodes.length && edge.target >= 0 && edge.target < createdNodes.length) {
        const created = await base44.asServiceRole.entities.SystemEdge.create({
          organization_id: orgId,
          source_node_id: createdNodes[edge.source].id,
          target_node_id: createdNodes[edge.target].id,
          relationship: edge.relationship,
          risk_status: edge.risk_status
        });
        createdEdges.push(created);
      }
    }

    // Phase 3: Create a receipt
    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'system_cloner',
      action: 'map_company_systems',
      status: 'success',
      summary: `Cloned ${company.name}'s system map: ${createdNodes.length} nodes, ${createdEdges.length} edges. ${nodes.filter(n => n.leak_points?.length).reduce((a, n) => a + n.leak_points.length, 0)} leak points identified.`,
      evidence: { company_id: companyId, node_count: createdNodes.length, edge_count: createdEdges.length, node_types: createdNodes.map(n => n.node_type) }
    });

    return Response.json({
      status: 'success',
      company_id: companyId,
      nodes: createdNodes,
      edges: createdEdges,
      leak_point_count: nodes.reduce((a, n) => a + (n.leak_points?.length || 0), 0)
    });
  } catch (error) {
    console.error('mapCompanySystems error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}