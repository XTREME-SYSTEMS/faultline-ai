import { fetchPage, discoverPageLinks, detectTechStack, extractData } from './scraper.ts';

// Shared system mapping logic — used by both mapCompanySystems and the pipeline orchestrator.
export async function runSystemMap(base44, orgId, companyId) {
  const company = await base44.asServiceRole.entities.Company.get(companyId);
  if (!company || company.organization_id !== orgId) throw new Error('Company not found');

  const websites = await base44.asServiceRole.entities.Website.filter({ organization_id: orgId, company_id: companyId });
  const existingFindings = await base44.asServiceRole.entities.Finding.filter({ organization_id: orgId });

  let crawlContext = '(no website crawl available)';
  let techStack = [];

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
- leak_points: Array of 1-3 specific revenue/efficiency leaks in this system
- ai_enhancement: 1-2 sentences describing how AI could enhance or fix this system
- confidence: 0-100 how confident you are this system exists

Also infer 3-6 edges (connections between nodes) showing how data flows between systems. For each edge:
- source: index of source node (0-based)
- target: index of target node (0-based)
- relationship: e.g. "leads flow", "invoice sync", "customer data", "support tickets"
- risk_status: healthy, friction, or broken — how well these systems connect

Be specific and evidence-based.`,
    response_json_schema: {
      type: 'object',
      properties: {
        nodes: { type: 'array', items: { type: 'object', properties: {
          name: { type: 'string' }, node_type: { type: 'string' }, owner_role: { type: 'string' },
          health_status: { type: 'string' }, description: { type: 'string' },
          leak_points: { type: 'array', items: { type: 'string' } },
          ai_enhancement: { type: 'string' }, confidence: { type: 'number' }
        }}},
        edges: { type: 'array', items: { type: 'object', properties: {
          source: { type: 'number' }, target: { type: 'number' },
          relationship: { type: 'string' }, risk_status: { type: 'string' }
        }}}
      }
    }
  });

  const nodes = mapResponse.nodes || [];
  const edges = mapResponse.edges || [];

  // Clear old system map
  const oldNodes = await base44.asServiceRole.entities.SystemNode.filter({ organization_id: orgId, company_id: companyId });
  const oldNodeIds = oldNodes.map(n => n.id);
  if (oldNodeIds.length > 0) await base44.asServiceRole.entities.SystemNode.deleteMany({ id: { $in: oldNodeIds } });
  const oldEdges = await base44.asServiceRole.entities.SystemEdge.filter({ organization_id: orgId });
  const oldEdgesForCompany = oldEdges.filter(e => oldNodeIds.includes(e.source_node_id) || oldNodeIds.includes(e.target_node_id));
  if (oldEdgesForCompany.length > 0) await base44.asServiceRole.entities.SystemEdge.deleteMany({ id: { $in: oldEdgesForCompany.map(e => e.id) } });

  const createdNodes = [];
  for (const node of nodes) {
    const created = await base44.asServiceRole.entities.SystemNode.create({
      organization_id: orgId, company_id: companyId, node_type: node.node_type, name: node.name,
      owner_role: node.owner_role, health_status: node.health_status, description: node.description,
      leak_points: node.leak_points || [], ai_enhancement: node.ai_enhancement, confidence: node.confidence
    });
    createdNodes.push(created);
  }

  const createdEdges = [];
  for (const edge of edges) {
    if (edge.source >= 0 && edge.source < createdNodes.length && edge.target >= 0 && edge.target < createdNodes.length) {
      const created = await base44.asServiceRole.entities.SystemEdge.create({
        organization_id: orgId, source_node_id: createdNodes[edge.source].id,
        target_node_id: createdNodes[edge.target].id, relationship: edge.relationship, risk_status: edge.risk_status
      });
      createdEdges.push(created);
    }
  }

  return { nodes: createdNodes, edges: createdEdges, leak_point_count: nodes.reduce((a, n) => a + (n.leak_points?.length || 0), 0) };
}