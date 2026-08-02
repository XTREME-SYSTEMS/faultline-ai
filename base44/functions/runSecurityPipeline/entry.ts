import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { runSecurityScan } from '../../shared/securityScanner.ts';
import { runSystemMap } from '../../shared/systemMapper.ts';
import { runExtendedDiagnostics, quantifyRevenueLeaks, benchmarkCompetitors } from '../../shared/extendedDiagnostics.ts';
import { generateRiskRegister, scoreAIReadiness, generateRepairRoadmap, generateBrandedProposal, generateFollowUpSequence } from '../../shared/deliverableGenerators.ts';
import { syncHubSpotDeal, createStripePaymentLink, setupMonitoringRules, autoConfigClientPortal, indexFindingsInRAG, notifyTeam } from '../../shared/automationSteps.ts';

// Full automated security pipeline orchestrator (20 steps):
// 1. Deep security scan → 2. Extended diagnostics → 3. Revenue quantification → 4. Competitor benchmark →
// 5. Executive report → 6. System clone → 7. Enhanced system → 8. Risk register → 9. AI readiness →
// 10. Repair plan → 11. Pricing + proposal → 12. Branded PDF → 13. Outreach email → 14. Follow-up sequence →
// 15. HubSpot deal → 16. Stripe payment link → 17. Monitoring rules → 18. Client portal config →
// 19. RAG indexing → 20. Team notification
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
    const step = async (name, fn) => {
      try {
        const r = await fn();
        steps.push({ step: name, status: 'success', ...(r || {}) });
        return r;
      } catch (e) {
        steps.push({ step: name, status: 'error', error: e.message });
        return null;
      }
    };

    // Step 1: Deep Security Scan
    const scanResult = await step('deep_security_scan', () => runSecurityScan(base44, orgId, companyId));
    if (!scanResult) return Response.json({ error: 'Pipeline failed at deep security scan', steps }, { status: 500 });
    const auditId = scanResult.audit_id;
    const originalHealthScore = scanResult.health_score;

    // Step 2: Extended Diagnostics (compliance, email security, SEO, subdomains, credentials)
    await step('extended_diagnostics', () => runExtendedDiagnostics(base44, orgId, companyId, auditId));

    // Step 3: Revenue Leak Quantification
    const revenueResult = await step('revenue_quantification', () => quantifyRevenueLeaks(base44, orgId, auditId, company));

    // Step 4: Competitor Benchmark
    await step('competitor_benchmark', () => benchmarkCompetitors(base44, orgId, company));

    // Step 5: Generate Executive Report
    await step('generate_report', async () => {
      const findings = await base44.asServiceRole.entities.Finding.filter({ organization_id: orgId, audit_id: auditId });
      const findingsSummary = findings.map((f, i) =>
        `${i + 1}. [${(f.severity || 'medium').toUpperCase()}] ${f.title}\n   Impact: ${f.business_impact || 'N/A'}\n   Repair: ${f.recommended_repair || 'N/A'}`
      ).join('\n\n');
      const reportResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Generate a board-ready executive report for ${company.name} (${company.industry || 'Unknown'}). Audit: Deep Security Scan. Date: ${new Date().toLocaleDateString()}. Findings (${findings.length}): ${findingsSummary}. Include: Executive Summary, Key Findings, Business Impact, Repair Plan (30/60/90), Confidence Notes.`
      });
      const reportContent = typeof reportResponse === 'string' ? reportResponse : JSON.stringify(reportResponse);
      const fileBlob = new Blob([reportContent], { type: 'text/markdown' });
      const file = new File([fileBlob], `faultline-report-${auditId}-${Date.now()}.md`, { type: 'text/markdown' });
      const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });
      await base44.asServiceRole.entities.Audit.update(auditId, { status: 'reported', report_url: uploadResult.file_url });
      return {};
    });

    // Step 6: Clone System Map
    const cloneResult = await step('map_systems', () => runSystemMap(base44, orgId, companyId));

    // Step 7: Generate Enhanced System
    let enhancedResult = {
      original_health_score: originalHealthScore,
      enhanced_health_score: Math.min(100, originalHealthScore + 30),
      resolved_count: 0, remaining_count: 0, enhanced_system_summary: ''
    };
    await step('enhanced_system', async () => {
      const nodes = await base44.asServiceRole.entities.SystemNode.filter({ organization_id: orgId, company_id: companyId });
      const allFindings = await base44.asServiceRole.entities.Finding.filter({ organization_id: orgId });
      const companyFindings = allFindings.filter(f => f.audit_id === auditId);
      const nodesSummary = nodes.map((n, i) =>
        `Node ${i}: ${n.name} (${n.node_type}, health: ${n.health_status})\n  Leaks: ${(n.leak_points || []).join('; ')}\n  AI Enhancement: ${n.ai_enhancement}`
      ).join('\n\n');
      const findingsSummary = companyFindings.slice(0, 15).map(f => `- [${f.severity}] ${f.title}: ${f.recommended_repair}`).join('\n');

      const enhancedResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Generate the ENHANCED version of ${company.name}'s system after FaultLine AI applies all enhancements.\nCURRENT SYSTEM MAP (${nodes.length} nodes):\n${nodesSummary}\nCURRENT FINDINGS (${companyFindings.length}):\n${findingsSummary}\nCURRENT HEALTH: ${originalHealthScore}/100\nGenerate: enhanced_nodes, resolved_findings, remaining_findings, enhanced_health_score (85-98), security_improvements, enhanced_system_summary.`,
        response_json_schema: { type: 'object', properties: {
          enhanced_nodes: { type: 'array', items: { type: 'object' } },
          resolved_findings: { type: 'array', items: { type: 'string' } },
          remaining_findings: { type: 'array', items: { type: 'string' } },
          enhanced_health_score: { type: 'number' },
          security_improvements: { type: 'array', items: { type: 'string' } },
          enhanced_system_summary: { type: 'string' }
        }}
      });
      enhancedResult = {
        original_health_score: originalHealthScore,
        enhanced_health_score: enhancedResponse.enhanced_health_score || Math.min(100, originalHealthScore + 30),
        resolved_count: (enhancedResponse.resolved_findings || []).length,
        remaining_count: (enhancedResponse.remaining_findings || []).length,
        enhanced_system_summary: enhancedResponse.enhanced_system_summary || ''
      };
      return { original_score: enhancedResult.original_health_score, enhanced_score: enhancedResult.enhanced_health_score, resolved: enhancedResult.resolved_count };
    });

    // Step 8: Risk Register
    await step('risk_register', () => generateRiskRegister(base44, orgId, auditId, company));

    // Step 9: AI Readiness Score
    const aiReadinessResult = await step('ai_readiness', () => scoreAIReadiness(base44, orgId, companyId, auditId, company));

    // Step 10: 30/60/90 Repair Plan
    await step('repair_plan', () => generateRepairRoadmap(base44, orgId, auditId, company));

    // Step 11: Pricing + Proposal
    let proposalResult = { proposal_id: null, total_price: 0, recommended_plan: 'Operating System Plan', pricing_breakdown: {}, proposal_text: '' };
    await step('generate_proposal', async () => {
      const nodes = await base44.asServiceRole.entities.SystemNode.filter({ organization_id: orgId, company_id: companyId });
      const allFindings = await base44.asServiceRole.entities.Finding.filter({ organization_id: orgId });
      const companyFindings = allFindings.filter(f => f.audit_id === auditId);
      const criticalCount = companyFindings.filter(f => f.severity === 'critical').length;
      const leakPointCount = nodes.reduce((sum, n) => sum + (n.leak_points?.length || 0), 0);
      const enhancementCount = nodes.filter(n => n.ai_enhancement).length;

      const proposalResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Create a security and enhancement proposal for ${company.name}. Current: ${originalHealthScore}/100, ${companyFindings.length} findings (${criticalCount} critical), ${nodes.length} systems, ${leakPointCount} leaks, ${enhancementCount} enhancements. Enhanced: ${enhancedResult.enhanced_health_score}/100, ${enhancedResult.resolved_count} resolved. Generate: pricing_breakdown (security_remediation, ai_enhancements, ongoing_monitoring_monthly, implementation, training, one_time_total), total_price, recommended_plan ("Growth Plan" $299/mo if <5 findings and <4 systems, else "Operating System Plan" $699/mo), proposal_text (full markdown).`,
        response_json_schema: { type: 'object', properties: {
          pricing_breakdown: { type: 'object' }, total_price: { type: 'number' }, recommended_plan: { type: 'string' }, proposal_text: { type: 'string' }
        }}
      });

      const proposal = await base44.asServiceRole.entities.SecurityProposal.create({
        organization_id: orgId, company_id: companyId, audit_id: auditId,
        original_health_score: originalHealthScore, enhanced_health_score: enhancedResult.enhanced_health_score,
        original_findings_count: companyFindings.length, resolved_findings_count: enhancedResult.resolved_count,
        remaining_findings_count: enhancedResult.remaining_count, systems_count: nodes.length,
        leak_points_count: leakPointCount, enhancement_count: enhancementCount,
        pricing_breakdown: proposalResponse.pricing_breakdown || {}, total_price: proposalResponse.total_price || 0,
        recommended_plan: proposalResponse.recommended_plan || 'Operating System Plan',
        proposal_text: proposalResponse.proposal_text || '', enhanced_system_summary: enhancedResult.enhanced_system_summary, status: 'draft'
      });
      proposalResult = {
        proposal_id: proposal.id, total_price: proposalResponse.total_price || 0,
        recommended_plan: proposalResponse.recommended_plan || 'Operating System Plan',
        pricing_breakdown: proposalResponse.pricing_breakdown || {}, proposal_text: proposalResponse.proposal_text || ''
      };
      return { proposal_id: proposal.id, total_price: proposalResult.total_price, plan: proposalResult.recommended_plan };
    });

    // Step 12: Branded PDF Proposal
    let brandedPdfResult = { proposal_url: null };
    if (proposalResult.proposal_id) {
      const pdfRes = await step('branded_proposal', async () => {
        const proposal = await base44.asServiceRole.entities.SecurityProposal.get(proposalResult.proposal_id);
        const result = await generateBrandedProposal(base44, proposal, company, enhancedResult);
        return { proposal_url: result.proposal_url };
      });
      if (pdfRes) brandedPdfResult = pdfRes;
    }

    // Step 13: Draft Outreach Email
    let outreachResult = { draft_id: null, subject: null };
    await step('draft_outreach', async () => {
      const allFindings = await base44.asServiceRole.entities.Finding.filter({ organization_id: orgId });
      const companyFindings = allFindings.filter(f => f.audit_id === auditId);
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const topFindings = [...companyFindings].sort((a, b) => (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4)).slice(0, 5);
      if (topFindings.length === 0) return { skipped: true };

      const outreachResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Draft a value-first outreach email to ${company.name}. Top findings: ${JSON.stringify(topFindings.map(f => ({ title: f.title, severity: f.severity, business_impact: f.business_impact })))}. Health: ${originalHealthScore}/100 to ${enhancedResult.enhanced_health_score}/100. Investment: $${proposalResult.total_price}. Subject + body (150-250 words) + evidence_refs. Use [First Name] placeholder.`,
        response_json_schema: { type: 'object', properties: { subject: { type: 'string' }, body: { type: 'string' }, evidence_refs: { type: 'array', items: { type: 'string' } } } }
      });
      const draft = await base44.asServiceRole.entities.OutreachDraft.create({
        organization_id: orgId, company_id: companyId, subject: outreachResponse.subject, body: outreachResponse.body,
        evidence_refs: outreachResponse.evidence_refs || [], approval_status: 'pending', send_status: 'draft_only'
      });
      if (proposalResult.proposal_id) {
        await base44.asServiceRole.entities.SecurityProposal.update(proposalResult.proposal_id, { outreach_draft_id: draft.id });
      }
      outreachResult = { draft_id: draft.id, subject: outreachResponse.subject };
      return { draft_id: draft.id, subject: outreachResponse.subject };
    });

    // Step 14: Follow-up Email Sequence
    await step('follow_up_sequence', () => generateFollowUpSequence(base44, orgId, companyId, auditId, company, proposalResult, originalHealthScore, enhancedResult.enhanced_health_score));

    // Step 15: HubSpot Deal Sync
    await step('hubspot_sync', () => syncHubSpotDeal(base44, orgId, company, proposalResult));

    // Step 16: Stripe Payment Link
    const stripeResult = await step('stripe_payment_link', () => createStripePaymentLink(base44, orgId, company, proposalResult));

    // Step 17: Monitoring Rules
    await step('monitoring_setup', () => setupMonitoringRules(base44, orgId, companyId));

    // Step 18: Client Portal Auto-Config
    const portalResult = await step('client_portal_config', () => autoConfigClientPortal(base44, orgId, companyId, auditId));

    // Step 19: RAG Indexing
    await step('rag_indexing', () => indexFindingsInRAG(base44, orgId, auditId));

    // Step 20: Team Notification
    const summary = `Company: ${company.name}\nFindings: ${scanResult.findings_created}+ extended\nHealth: ${originalHealthScore} to ${enhancedResult.enhanced_health_score}/100\nRevenue impact: $${revenueResult?.total_annual_impact_max?.toLocaleString() || 'N/A'}/yr\nAI readiness: ${aiReadinessResult?.ai_readiness_score || 'N/A'}/100\nProposal: $${proposalResult.total_price} (${proposalResult.recommended_plan})\nPortal: ${portalResult?.portal_url || 'N/A'}\nStripe: ${stripeResult?.checkout_url ? 'Created' : 'N/A'}`;
    await step('team_notification', () => notifyTeam(base44, user, company, summary));

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId, system: 'security_pipeline', action: 'run_full_pipeline_v2',
      status: 'success',
      summary: `Full 20-step pipeline for ${company.name}: ${steps.filter(s => s.status === 'success').length}/${steps.length} steps. Proposal: $${proposalResult.total_price}`,
      evidence: { company_id: companyId, steps, audit_id: auditId, proposal_id: proposalResult.proposal_id }
    });

    return Response.json({
      status: 'success', company_id: companyId, company_name: company.name, steps, audit_id: auditId,
      scan_findings: scanResult.findings_created, system_nodes: cloneResult?.nodes?.length || 0,
      leak_points: cloneResult?.leak_point_count || 0,
      original_health_score: originalHealthScore, enhanced_health_score: enhancedResult.enhanced_health_score,
      resolved_findings: enhancedResult.resolved_count,
      revenue_impact_max: revenueResult?.total_annual_impact_max || 0,
      ai_readiness_score: aiReadinessResult?.ai_readiness_score || 0,
      proposal_id: proposalResult.proposal_id, total_price: proposalResult.total_price,
      recommended_plan: proposalResult.recommended_plan,
      branded_proposal_url: brandedPdfResult?.proposal_url || null,
      outreach_draft_id: outreachResult.draft_id, outreach_subject: outreachResult.subject,
      stripe_checkout_url: stripeResult?.checkout_url || null,
      client_portal_url: portalResult?.portal_url || null
    });
  } catch (error) {
    console.error('runSecurityPipeline error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}