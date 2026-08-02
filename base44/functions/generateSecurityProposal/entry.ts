import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { runMandatoryQA } from '../../shared/mandatoryQA.ts';

// Generates automated pricing + a full security proposal document for a company.
// Combines: audit findings, system clone, enhanced system, and pricing into a
// client-ready proposal. Stores it in the SecurityProposal entity.
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

    // Gather all data: findings, system nodes, enhanced system data (passed in body)
    const nodes = await base44.asServiceRole.entities.SystemNode.filter({ organization_id: orgId, company_id: companyId });
    const audits = await base44.asServiceRole.entities.Audit.filter({ organization_id: orgId, company_id: companyId });
    let allFindings: any[] = [];
    for (const a of audits) {
      const fs = await base44.asServiceRole.entities.Finding.filter({ organization_id: orgId, audit_id: a.id });
      allFindings = allFindings.concat(fs);
    }
    const snapshots = await base44.asServiceRole.entities.ScanSnapshot.filter({ organization_id: orgId, company_id: companyId }, '-scanned_at', 1);
    const originalHealthScore = snapshots[0]?.health_score ?? 0;

    const enhancedData = body.enhanced_system || {};
    const enhancedHealthScore = enhancedData.enhanced_health_score || Math.min(100, originalHealthScore + 30);
    const resolvedCount = enhancedData.resolved_count || 0;
    const remainingCount = enhancedData.remaining_count || 0;
    const enhancedSummary = enhancedData.enhanced_system_summary || '';

    const criticalCount = allFindings.filter(f => f.severity === 'critical').length;
    const highCount = allFindings.filter(f => f.severity === 'high').length;
    const mediumCount = allFindings.filter(f => f.severity === 'medium').length;
    const lowCount = allFindings.filter(f => f.severity === 'low').length;
    const leakPointCount = nodes.reduce((sum, n) => sum + (n.leak_points?.length || 0), 0);
    const enhancementCount = nodes.filter(n => n.ai_enhancement).length;

    const findingsSummary = allFindings.slice(0, 10).map(f =>
      `- [${f.severity}] ${f.title}: ${f.business_impact}`
    ).join('\n');

    const systemsSummary = nodes.map(n =>
      `- ${n.name} (${n.node_type}, ${n.health_status}): Leaks: ${(n.leak_points || []).join('; ')}. Enhancement: ${n.ai_enhancement}`
    ).join('\n');

    // LLM generates pricing + full proposal
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the FaultLine AI proposal generator. Create a complete, client-ready security and enhancement proposal with automated pricing.

COMPANY: ${company.name} (${company.industry || 'unknown industry'})
DOMAIN: ${company.domain || 'unknown'}

CURRENT SECURITY POSTURE:
- Health Score: ${originalHealthScore}/100
- Total Findings: ${allFindings.length} (${criticalCount} critical, ${highCount} high, ${mediumCount} medium, ${lowCount} low)
- Systems Mapped: ${nodes.length}
- Leak Points Identified: ${leakPointCount}
- AI Enhancements Available: ${enhancementCount}

KEY FINDINGS:
${findingsSummary || '(none)'}

SYSTEM MAP:
${systemsSummary || '(none)'}

ENHANCED SYSTEM PROJECTION:
- Projected Health Score: ${enhancedHealthScore}/100
- Findings Resolved: ${resolvedCount}
- Findings Remaining: ${remainingCount}
- Summary: ${enhancedSummary}

Generate a complete proposal with:

1. PRICING BREAKDOWN — itemized costs for:
   - Security remediation (fixing critical/high findings): base $2,000-$8,000 depending on severity count
   - AI system enhancements (per system enhanced): $1,500-$5,000 per system
   - Ongoing monitoring (monthly): $500-$2,000/month
   - Implementation & onboarding: $1,000-$3,000
   - Training & documentation: $500-$1,500
   Calculate realistic totals based on the actual finding/system counts above.

2. RECOMMENDED PLAN — recommend either:
   - "Growth Plan" ($299/month) for companies with <5 findings and <4 systems
   - "Operating System Plan" ($699/month) for companies with 5+ findings or 4+ systems
   Plus the one-time implementation fee.

3. PROPOSAL TEXT — a full client-ready proposal in markdown with sections:
   - Executive Summary
   - Current Security Posture
   - Identified Vulnerabilities & Business Impact
   - System Map & Leak Points
   - Proposed AI Enhancements
   - Enhanced Security Projection (before/after)
   - Investment & Pricing
   - Recommended Plan
   - Implementation Timeline (30/60/90 days)
   - Next Steps

Be specific, professional, and evidence-based. Use the actual numbers above.`,
      response_json_schema: {
        type: 'object',
        properties: {
          pricing_breakdown: {
            type: 'object',
            properties: {
              security_remediation: { type: 'number' },
              ai_enhancements: { type: 'number' },
              ongoing_monitoring_monthly: { type: 'number' },
              implementation: { type: 'number' },
              training: { type: 'number' },
              one_time_total: { type: 'number' }
            }
          },
          total_price: { type: 'number' },
          recommended_plan: { type: 'string' },
          proposal_text: { type: 'string' }
        }
      }
    });

    const pricing = llmResponse.pricing_breakdown || {};
    const totalPrice = llmResponse.total_price || 0;
    const recommendedPlan = llmResponse.recommended_plan || 'Operating System Plan';
    const proposalText = llmResponse.proposal_text || '';

    // Store the proposal
    const proposal = await base44.asServiceRole.entities.SecurityProposal.create({
      organization_id: orgId,
      company_id: companyId,
      audit_id: audits[0]?.id || '',
      original_health_score: originalHealthScore,
      enhanced_health_score: enhancedHealthScore,
      original_findings_count: allFindings.length,
      resolved_findings_count: resolvedCount,
      remaining_findings_count: remainingCount,
      systems_count: nodes.length,
      leak_points_count: leakPointCount,
      enhancement_count: enhancementCount,
      pricing_breakdown: pricing,
      total_price: totalPrice,
      recommended_plan: recommendedPlan,
      proposal_text: proposalText,
      enhanced_system_summary: enhancedSummary,
      status: 'draft'
    });

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'proposal_generator',
      action: 'generate_security_proposal',
      status: 'success',
      summary: `Generated security proposal for ${company.name}: $${totalPrice} total, ${recommendedPlan}, health ${originalHealthScore}→${enhancedHealthScore}`,
      evidence: { company_id: companyId, proposal_id: proposal.id, total_price: totalPrice, plan: recommendedPlan }
    });

    // MANDATORY QA GATE — validate the proposal before it reaches the client
    const qa = await runMandatoryQA(base44, orgId, {
      target_type: 'repair_plan', target_id: proposal.id, target_title: `Security Proposal — ${company.name}`,
      content: proposalText, auto: true
    });
    if (!qa.passed) {
      await base44.asServiceRole.entities.SecurityProposal.update(proposal.id, { status: 'needs_revision' });
    }

    return Response.json({
      status: 'success',
      proposal_id: proposal.id,
      pricing_breakdown: pricing,
      total_price: totalPrice,
      recommended_plan: recommendedPlan,
      proposal_text: proposalText,
      qa
    });
  } catch (error) {
    console.error('generateSecurityProposal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}