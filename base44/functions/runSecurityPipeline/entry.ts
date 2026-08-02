import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { runSecurityScan } from '../../shared/securityScanner.ts';
import { runSystemMap } from '../../shared/systemMapper.ts';

// Full automated security pipeline orchestrator:
// 1. Deep security scan → 2. Generate report → 3. Clone system map →
// 4. Generate enhanced system → 5. Generate pricing + proposal → 6. Draft outreach email
// Calls shared logic directly (not functions.invoke) to avoid auth context issues.
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

    const steps = [];

    // Step 1: Deep Security Scan
    let scanResult;
    try {
      scanResult = await runSecurityScan(base44, orgId, companyId);
      steps.push({ step: 'deep_security_scan', status: 'success', findings: scanResult.findings_created, audit_id: scanResult.audit_id });
    } catch (e) {
      steps.push({ step: 'deep_security_scan', status: 'error', error: e.message });
      return Response.json({ error: 'Pipeline failed at deep security scan', steps }, { status: 500 });
    }
    const auditId = scanResult.audit_id;
    const originalHealthScore = scanResult.health_score;

    // Step 2: Generate Report
    try {
      const findings = await base44.asServiceRole.entities.Finding.filter({ organization_id: orgId, audit_id: auditId });
      const findingsSummary = findings.map((f, i) =>
        `${i + 1}. [${(f.severity || 'medium').toUpperCase()}] ${f.title}\n   Impact: ${f.business_impact || 'Not quantified'}\n   Repair: ${f.recommended_repair || 'Not specified'}`
      ).join('\n\n');

      const reportResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are an executive report writer for FaultLine AI. Generate a professional, board-ready executive report.

Company: ${company.name}
Industry: ${company.industry || 'Unknown'}
Audit Type: Deep Security Scan
Date: ${new Date().toLocaleDateString()}

FINDINGS (${findings.length} total):
${findingsSummary}

Generate a structured executive report in markdown with sections:
## Executive Summary
## Key Findings
## Business Impact Assessment
## Recommended Repair Plan (30/60/90 day)
## Confidence Notes

Be specific, evidence-based, and actionable.`
      });

      const reportContent = typeof reportResponse === 'string' ? reportResponse : JSON.stringify(reportResponse);
      const fileBlob = new Blob([reportContent], { type: 'text/markdown' });
      const file = new File([fileBlob], `faultline-report-${auditId}-${Date.now()}.md`, { type: 'text/markdown' });
      const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });

      await base44.asServiceRole.entities.Audit.update(auditId, {
        status: 'reported', report_url: uploadResult.file_url,
        scope: { ...scanResult.findings ? { findings_count: scanResult.findings_created } : {}, report_generated_at: new Date().toISOString() }
      });
      steps.push({ step: 'generate_report', status: 'success' });
    } catch (e) {
      steps.push({ step: 'generate_report', status: 'error', error: e.message });
    }

    // Step 3: Clone System Map
    let cloneResult;
    try {
      cloneResult = await runSystemMap(base44, orgId, companyId);
      steps.push({ step: 'map_systems', status: 'success', nodes: cloneResult.nodes.length, edges: cloneResult.edges.length, leak_points: cloneResult.leak_point_count });
    } catch (e) {
      steps.push({ step: 'map_systems', status: 'error', error: e.message });
      cloneResult = { nodes: [], edges: [], leak_point_count: 0 };
    }

    // Step 4: Generate Enhanced System
    let enhancedResult = { original_health_score: originalHealthScore, enhanced_health_score: Math.min(100, originalHealthScore + 30), resolved_count: 0, remaining_count: 0, enhanced_system_summary: '' };
    try {
      const nodes = await base44.asServiceRole.entities.SystemNode.filter({ organization_id: orgId, company_id: companyId });
      const allFindings = await base44.asServiceRole.entities.Finding.filter({ organization_id: orgId });
      const companyFindings = allFindings.filter(f => f.audit_id === auditId);

      const nodesSummary = nodes.map((n, i) =>
        `Node ${i}: ${n.name} (${n.node_type}, health: ${n.health_status})\n  Leak points: ${(n.leak_points || []).join('; ')}\n  AI Enhancement: ${n.ai_enhancement}`
      ).join('\n\n');
      const findingsSummary = companyFindings.slice(0, 15).map(f => `- [${f.severity}] ${f.title}: ${f.recommended_repair}`).join('\n');

      const enhancedResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are the FaultLine AI enhancement architect. Generate the ENHANCED version of this company's system — what it looks like AFTER FaultLine AI applies all enhancements.

COMPANY: ${company.name}
CURRENT SYSTEM MAP (${nodes.length} nodes):
${nodesSummary}

CURRENT FINDINGS (${companyFindings.length}):
${findingsSummary}

CURRENT HEALTH SCORE: ${originalHealthScore}/100

Generate the enhanced system map. For each node: name, node_type, enhanced_health_status, enhancements_applied (array), remaining_leaks (array), impact_description.
Also: resolved_findings (array of titles), remaining_findings (array), enhanced_health_score (85-98), security_improvements (array), enhanced_system_summary (string).`,
        response_json_schema: {
          type: 'object',
          properties: {
            enhanced_nodes: { type: 'array', items: { type: 'object', properties: {
              name: { type: 'string' }, node_type: { type: 'string' }, enhanced_health_status: { type: 'string' },
              enhancements_applied: { type: 'array', items: { type: 'string' } },
              remaining_leaks: { type: 'array', items: { type: 'string' } },
              impact_description: { type: 'string' }
            }}},
            resolved_findings: { type: 'array', items: { type: 'string' } },
            remaining_findings: { type: 'array', items: { type: 'string' } },
            enhanced_health_score: { type: 'number' },
            security_improvements: { type: 'array', items: { type: 'string' } },
            enhanced_system_summary: { type: 'string' }
          }
        }
      });

      enhancedResult = {
        original_health_score: originalHealthScore,
        enhanced_health_score: enhancedResponse.enhanced_health_score || Math.min(100, originalHealthScore + 30),
        resolved_count: (enhancedResponse.resolved_findings || []).length,
        remaining_count: (enhancedResponse.remaining_findings || []).length,
        enhanced_system_summary: enhancedResponse.enhanced_system_summary || '',
        enhanced_nodes: enhancedResponse.enhanced_nodes || [],
        security_improvements: enhancedResponse.security_improvements || []
      };
      steps.push({ step: 'enhanced_system', status: 'success', original_score: enhancedResult.original_health_score, enhanced_score: enhancedResult.enhanced_health_score, resolved: enhancedResult.resolved_count });
    } catch (e) {
      steps.push({ step: 'enhanced_system', status: 'error', error: e.message });
    }

    // Step 5: Generate Pricing + Proposal
    let proposalResult = { proposal_id: null, total_price: 0, recommended_plan: 'Operating System Plan' };
    try {
      const nodes = await base44.asServiceRole.entities.SystemNode.filter({ organization_id: orgId, company_id: companyId });
      const allFindings = await base44.asServiceRole.entities.Finding.filter({ organization_id: orgId });
      const companyFindings = allFindings.filter(f => f.audit_id === auditId);
      const criticalCount = companyFindings.filter(f => f.severity === 'critical').length;
      const highCount = companyFindings.filter(f => f.severity === 'high').length;
      const leakPointCount = nodes.reduce((sum, n) => sum + (n.leak_points?.length || 0), 0);
      const enhancementCount = nodes.filter(n => n.ai_enhancement).length;

      const findingsSummary = companyFindings.slice(0, 10).map(f => `- [${f.severity}] ${f.title}: ${f.business_impact}`).join('\n');
      const systemsSummary = nodes.map(n => `- ${n.name} (${n.node_type}, ${n.health_status}): ${(n.leak_points || []).join('; ')}. Enhancement: ${n.ai_enhancement}`).join('\n');

      const proposalResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are the FaultLine AI proposal generator. Create a complete, client-ready security and enhancement proposal with automated pricing.

COMPANY: ${company.name} (${company.industry || 'unknown industry'})
DOMAIN: ${company.domain || 'unknown'}

CURRENT SECURITY POSTURE:
- Health Score: ${originalHealthScore}/100
- Total Findings: ${companyFindings.length} (${criticalCount} critical, ${highCount} high)
- Systems Mapped: ${nodes.length}
- Leak Points: ${leakPointCount}
- AI Enhancements Available: ${enhancementCount}

KEY FINDINGS:
${findingsSummary}

ENHANCED PROJECTION:
- Projected Health Score: ${enhancedResult.enhanced_health_score}/100
- Findings Resolved: ${enhancedResult.resolved_count}
- Summary: ${enhancedResult.enhanced_system_summary}

Generate: 1) PRICING_BREAKDOWN with security_remediation, ai_enhancements, ongoing_monitoring_monthly, implementation, training, and one_time_total. 2) TOTAL_PRICE. 3) RECOMMENDED_PLAN ("Growth Plan" $299/mo for <5 findings/<4 systems, "Operating System Plan" $699/mo otherwise). 4) PROPOSAL_TEXT — full markdown proposal with Executive Summary, Current Posture, Vulnerabilities, System Map, AI Enhancements, Enhanced Projection, Investment, Recommended Plan, Timeline, Next Steps.`,
        response_json_schema: {
          type: 'object',
          properties: {
            pricing_breakdown: { type: 'object', properties: {
              security_remediation: { type: 'number' }, ai_enhancements: { type: 'number' },
              ongoing_monitoring_monthly: { type: 'number' }, implementation: { type: 'number' },
              training: { type: 'number' }, one_time_total: { type: 'number' }
            }},
            total_price: { type: 'number' },
            recommended_plan: { type: 'string' },
            proposal_text: { type: 'string' }
          }
        }
      });

      const pricing = proposalResponse.pricing_breakdown || {};
      const totalPrice = proposalResponse.total_price || 0;
      const recommendedPlan = proposalResponse.recommended_plan || 'Operating System Plan';

      const proposal = await base44.asServiceRole.entities.SecurityProposal.create({
        organization_id: orgId, company_id: companyId, audit_id: auditId,
        original_health_score: originalHealthScore, enhanced_health_score: enhancedResult.enhanced_health_score,
        original_findings_count: companyFindings.length, resolved_findings_count: enhancedResult.resolved_count,
        remaining_findings_count: enhancedResult.remaining_count, systems_count: nodes.length,
        leak_points_count: leakPointCount, enhancement_count: enhancementCount,
        pricing_breakdown: pricing, total_price: totalPrice, recommended_plan: recommendedPlan,
        proposal_text: proposalResponse.proposal_text || '', enhanced_system_summary: enhancedResult.enhanced_system_summary,
        status: 'draft'
      });

      proposalResult = { proposal_id: proposal.id, total_price: totalPrice, recommended_plan: recommendedPlan, pricing_breakdown: pricing };
      steps.push({ step: 'generate_proposal', status: 'success', proposal_id: proposal.id, total_price: totalPrice, plan: recommendedPlan });
    } catch (e) {
      steps.push({ step: 'generate_proposal', status: 'error', error: e.message });
    }

    // Step 6: Draft Outreach Email
    let outreachResult = { draft_id: null, subject: null };
    try {
      const allFindings = await base44.asServiceRole.entities.Finding.filter({ organization_id: orgId });
      const companyFindings = allFindings.filter(f => f.audit_id === auditId);
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const topFindings = [...companyFindings].sort((a, b) => (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4)).slice(0, 5);

      if (topFindings.length > 0) {
        const outreachResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Draft a value-first, evidence-based outreach email to ${company.name} (${company.industry || 'general'} company).

TOP FINDINGS:
${JSON.stringify(topFindings.map(f => ({ title: f.title, severity: f.severity, business_impact: f.business_impact })), null, 2)}

Also mention: Health score ${originalHealthScore}/100, ${companyFindings.length} findings, projected improvement to ${enhancedResult.enhanced_health_score}/100 with FaultLine AI. Total investment: $${proposalResult.total_price}.

Requirements: Subject line specific and value-focused. Body 150-250 words, conversational, references 2-3 findings. Soft CTA for diagnostic call. Use [First Name] placeholder.

Return: subject, body, evidence_refs (array of finding IDs).`,
          response_json_schema: {
            type: 'object',
            properties: {
              subject: { type: 'string' }, body: { type: 'string' },
              evidence_refs: { type: 'array', items: { type: 'string' } }
            }
          }
        });

        const draft = await base44.asServiceRole.entities.OutreachDraft.create({
          organization_id: orgId, company_id: companyId,
          subject: outreachResponse.subject, body: outreachResponse.body,
          evidence_refs: outreachResponse.evidence_refs || [],
          approval_status: 'pending', send_status: 'draft_only'
        });

        if (proposalResult.proposal_id) {
          await base44.asServiceRole.entities.SecurityProposal.update(proposalResult.proposal_id, { outreach_draft_id: draft.id });
        }

        outreachResult = { draft_id: draft.id, subject: outreachResponse.subject };
        steps.push({ step: 'draft_outreach', status: 'success', draft_id: draft.id, subject: outreachResponse.subject });
      } else {
        steps.push({ step: 'draft_outreach', status: 'skipped', error: 'No findings to reference' });
      }
    } catch (e) {
      steps.push({ step: 'draft_outreach', status: 'error', error: e.message });
    }

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId, system: 'security_pipeline', action: 'run_full_pipeline',
      status: 'success',
      summary: `Full security pipeline for ${company.name}: ${steps.filter(s => s.status === 'success').length}/${steps.length} steps. Proposal: $${proposalResult.total_price} (${proposalResult.recommended_plan})`,
      evidence: { company_id: companyId, steps, proposal_id: proposalResult.proposal_id, outreach_draft_id: outreachResult.draft_id }
    });

    return Response.json({
      status: 'success', company_id: companyId, company_name: company.name, steps, audit_id: auditId,
      scan_findings: scanResult.findings_created, system_nodes: cloneResult.nodes.length,
      leak_points: cloneResult.leak_point_count,
      original_health_score: originalHealthScore, enhanced_health_score: enhancedResult.enhanced_health_score,
      resolved_findings: enhancedResult.resolved_count,
      proposal_id: proposalResult.proposal_id, total_price: proposalResult.total_price,
      recommended_plan: proposalResult.recommended_plan,
      outreach_draft_id: outreachResult.draft_id, outreach_subject: outreachResult.subject
    });
  } catch (error) {
    console.error('runSecurityPipeline error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}