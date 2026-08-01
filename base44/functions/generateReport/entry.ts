import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

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
(2-3 paragraphs summarizing the overall state and most critical issues)

## Key Findings
(Prioritized by severity — critical first. For each: title, severity, impact, and recommended repair)

## Business Impact Assessment
(Assess the cumulative financial and operational risk)

## Recommended Repair Plan
(30-day quick wins, 60-day priorities, 90-day strategic improvements)

## Confidence Notes
(Which findings are verified vs. inferred, and what additional evidence would increase confidence)

Be specific, evidence-based, and actionable. No placeholder text.`,
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

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'report_generator',
      action: 'generate_report',
      status: 'success',
      summary: `Generated executive report for ${company?.name || 'audit'} — ${findings.length} findings`,
      evidence: { audit_id: auditId, report_url: reportUrl, finding_count: findings.length }
    });

    return Response.json({ status: 'success', audit_id: auditId, report_url: reportUrl, finding_count: findings.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}