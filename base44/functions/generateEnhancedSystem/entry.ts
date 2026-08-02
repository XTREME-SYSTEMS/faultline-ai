import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Generates an "enhanced" version of the company's system map showing what
// their systems would look like AFTER FaultLine AI enhancements are applied,
// plus a revised security report showing improved health scores.
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

    // Gather current system map + findings + latest health score
    const nodes = await base44.asServiceRole.entities.SystemNode.filter({ organization_id: orgId, company_id: companyId });
    const edges = await base44.asServiceRole.entities.SystemEdge.filter({ organization_id: orgId });
    const companyEdges = edges.filter(e => nodes.some(n => n.id === e.source_node_id));
    const audits = await base44.asServiceRole.entities.Audit.filter({ organization_id: orgId, company_id: companyId });
    let allFindings: any[] = [];
    for (const a of audits) {
      const fs = await base44.asServiceRole.entities.Finding.filter({ organization_id: orgId, audit_id: a.id });
      allFindings = allFindings.concat(fs);
    }
    const snapshots = await base44.asServiceRole.entities.ScanSnapshot.filter({ organization_id: orgId, company_id: companyId }, '-scanned_at', 1);
    const originalHealthScore = snapshots[0]?.health_score ?? 0;

    if (nodes.length === 0) return Response.json({ error: 'No system map found. Run mapCompanySystems first.' }, { status: 400 });

    const nodesSummary = nodes.map((n, i) => 
      `Node ${i}: ${n.name} (${n.node_type}, health: ${n.health_status})\n  Owner: ${n.owner_role}\n  Description: ${n.description}\n  Leak points: ${(n.leak_points || []).join('; ')}\n  AI Enhancement: ${n.ai_enhancement}`
    ).join('\n\n');

    const edgesSummary = companyEdges.map(e => {
      const src = nodes.find(n => n.id === e.source_node_id);
      const tgt = nodes.find(n => n.id === e.target_node_id);
      return `${src?.name} → ${tgt?.name}: ${e.relationship} (${e.risk_status})`;
    }).join('\n');

    const findingsSummary = allFindings.slice(0, 15).map(f => 
      `- [${f.severity}] ${f.title}: ${f.recommended_repair}`
    ).join('\n');

    // LLM generates the enhanced system + revised security report
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the FaultLine AI enhancement architect. You are given a company's CURRENT system map and security findings. Your job is to generate the ENHANCED version — what their systems would look like AFTER FaultLine AI applies all recommended enhancements and security fixes.

COMPANY: ${company.name} (${company.industry || 'unknown industry'})

CURRENT SYSTEM MAP (${nodes.length} nodes):
${nodesSummary}

CURRENT DATA FLOWS:
${edgesSummary || '(none)'}

CURRENT SECURITY FINDINGS (${allFindings.length} total):
${findingsSummary || '(none)'}

CURRENT HEALTH SCORE: ${originalHealthScore}/100

Generate the ENHANCED system map. For each current node, create an enhanced version showing:
- name: Same or updated name (e.g. "Website (WordPress)" → "AI-Optimized Website")
- node_type: Same as original
- enhanced_health_status: What the health would be after enhancement (healthy, at_risk, or critical — should improve)
- enhancements_applied: Array of specific AI enhancements that were applied to this system
- remaining_leaks: Any leaks that still exist after enhancement (should be fewer or empty)
- impact_description: 1-2 sentences describing the measurable improvement

Also generate a revised security report:
- resolved_findings: Array of finding titles that are now resolved
- remaining_findings: Array of finding titles that still need attention
- enhanced_health_score: The new projected health score (should be significantly higher, 85-98 range)
- security_improvements: Array of specific security improvements made

Be realistic but optimistic — FaultLine AI fixes most issues but some require client action. The enhanced score should show dramatic improvement.`,
      response_json_schema: {
        type: 'object',
        properties: {
          enhanced_nodes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                node_type: { type: 'string' },
                enhanced_health_status: { type: 'string' },
                enhancements_applied: { type: 'array', items: { type: 'string' } },
                remaining_leaks: { type: 'array', items: { type: 'string' } },
                impact_description: { type: 'string' }
              }
            }
          },
          resolved_findings: { type: 'array', items: { type: 'string' } },
          remaining_findings: { type: 'array', items: { type: 'string' } },
          enhanced_health_score: { type: 'number' },
          security_improvements: { type: 'array', items: { type: 'string' } },
          enhanced_system_summary: { type: 'string' }
        }
      }
    });

    const enhancedNodes = llmResponse.enhanced_nodes || [];
    const resolvedFindings = llmResponse.resolved_findings || [];
    const remainingFindings = llmResponse.remaining_findings || [];
    const enhancedHealthScore = llmResponse.enhanced_health_score || Math.min(100, originalHealthScore + 30);
    const securityImprovements = llmResponse.security_improvements || [];
    const enhancedSystemSummary = llmResponse.enhanced_system_summary || '';

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'enhanced_system_generator',
      action: 'generate_enhanced_system',
      status: 'success',
      summary: `Generated enhanced system for ${company.name}: ${enhancedNodes.length} enhanced nodes, ${resolvedFindings.length} findings resolved, health ${originalHealthScore}→${enhancedHealthScore}`,
      evidence: { company_id: companyId, original_score: originalHealthScore, enhanced_score: enhancedHealthScore, resolved_count: resolvedFindings.length }
    });

    return Response.json({
      status: 'success',
      company_id: companyId,
      original_health_score: originalHealthScore,
      enhanced_health_score: enhancedHealthScore,
      enhanced_nodes: enhancedNodes,
      resolved_findings: resolvedFindings,
      remaining_findings: remainingFindings,
      security_improvements: securityImprovements,
      enhanced_system_summary: enhancedSystemSummary,
      original_findings_count: allFindings.length,
      resolved_count: resolvedFindings.length,
      remaining_count: remainingFindings.length
    });
  } catch (error) {
    console.error('generateEnhancedSystem error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}