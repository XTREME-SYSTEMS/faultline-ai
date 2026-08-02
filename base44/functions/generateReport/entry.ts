import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { runMandatoryQA } from '../../shared/mandatoryQA.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found on user profile' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const auditId = body.audit_id;
    if (!auditId) return Response.json({ error: 'audit_id required' }, { status: 400 });

    const audit = await base44.asServiceRole.entities.Audit.get(auditId);
    if (!audit || audit.organization_id !== orgId) {
      return Response.json({ error: 'Audit not found' }, { status: 404 });
    }

    const findings = await base44.asServiceRole.entities.Finding.filter({ organization_id: orgId, audit_id: auditId });
    let company = null;
    if (audit.company_id) {
      company = await base44.asServiceRole.entities.Company.get(audit.company_id);
    }

    const findingsSummary = findings.map((f, i) =>
      `${i + 1}. [${(f.severity || 'medium').toUpperCase()}] ${f.title}\n   Category: ${f.category || 'general'}\n   Impact: ${f.business_impact || 'Not quantified'}\n   Repair: ${f.recommended_repair || 'Not specified'}\n   Confidence: ${f.confidence || 0}%`
    ).join('\n\n');

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are an executive report writer for FaultLine AI. Generate a professional, board-ready executive report from the following audit data.

Company: ${company?.name || 'Unknown'}
Industry: ${company?.industry || 'Unknown'}
Website: ${audit.scope?.url || 'Unknown'}
Audit Type: ${audit.audit_type || 'website_intelligence'}
Date: ${new Date().toLocaleDateString()}

FINDINGS (${findings.length} total):
${findingsSummary}

Generate a structured executive report in markdown with these sections:
## Executive Summary
(2-3 paragraphs summarizing the overall state, most critical issues, and the quantified business risk)

## Key Findings
(Prioritized by severity — critical first. For each: title, severity, confidence level, specific evidence/observation, business impact, and recommended repair)

## Business Impact Assessment
(Quantify the cumulative financial and operational risk — include estimated annual revenue exposure ranges, operational cost, and risk of inaction. Use specific dollar ranges where possible.)

## Recommended Repair Plan
(30-day quick wins, 60-day priorities, 90-day strategic improvements. For EACH initiative include: a named owner role (e.g., "IT Lead", "Marketing Director"), a measurable success metric / KPI with a target value, and an effort estimate.)

## KPIs & Success Metrics
(A dedicated table or list of 5-8 measurable KPIs with current baseline, target value, and measurement method — e.g., "Health Score: 62 → 85+ (via re-scan)", "Critical findings: 4 → 0 (via remediation audit)")

## Compliance & Risk Notes
(Relevant compliance considerations — GDPR, CCPA, SOC 2, accessibility/WCAG — and any regulatory exposure identified in the findings. Note where compliance gaps exist and the remediation priority.)

## Confidence Notes
(Which findings are verified vs. inferred, the evidence state for each, and what additional evidence would increase confidence. Be explicit about any assumptions made.)

Be specific, evidence-based, and actionable. Include named owner roles, measurable KPIs with target values, and quantified impact estimates throughout. No placeholder text, no vague language, no unowned recommendations.`,
    });

    const reportContent = typeof llmResponse === 'string' ? llmResponse : JSON.stringify(llmResponse);

    // Upload report as a file
    const fileName = `faultline-report-${auditId}-${Date.now()}.md`;
    const fileBlob = new Blob([reportContent], { type: 'text/markdown' });
    const file = new File([fileBlob], fileName, { type: 'text/markdown' });

    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });
    const reportUrl = uploadResult.file_url;

    // Update audit with report URL
    await base44.asServiceRole.entities.Audit.update(auditId, {
      status: 'reported',
      report_url: reportUrl,
      scope: { ...audit.scope, report_generated_at: new Date().toISOString() }
    });

    // MANDATORY QA GATE — validate the report before it reaches anyone
    const qa = await runMandatoryQA(base44, orgId, {
      target_type: 'report', target_id: auditId, target_title: `Executive Report — ${company?.name || 'Audit'}`,
      content: reportContent, auto: true
    });

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'report_generator',
      action: 'generate_report',
      status: 'success',
      summary: `Generated executive report for ${company?.name || 'audit'} — ${findings.length} findings — QA ${qa.status} (${qa.score}/100)`,
      evidence: { audit_id: auditId, report_url: reportUrl, finding_count: findings.length, qa_report_id: qa.report_id, qa_status: qa.status }
    });

    return Response.json({ status: 'success', audit_id: auditId, report_url: reportUrl, finding_count: findings.length, qa });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}