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
    const companyId = body.company_id;
    if (!companyId) return Response.json({ error: 'company_id required' }, { status: 400 });

    const company = await base44.asServiceRole.entities.Company.get(companyId);
    if (!company || company.organization_id !== orgId) return Response.json({ error: 'Company not found' }, { status: 404 });

    // Get top findings for this company
    const audits = await base44.asServiceRole.entities.Audit.filter({ organization_id: orgId, company_id: companyId });
    let topFindings = [];
    for (const a of audits) {
      const fs = await base44.asServiceRole.entities.Finding.filter({ organization_id: orgId, audit_id: a.id });
      topFindings = topFindings.concat(fs);
    }
    // Sort by severity and take top 5
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    topFindings.sort((a, b) => (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4));
    topFindings = topFindings.slice(0, 5);

    if (topFindings.length === 0) return Response.json({ error: 'No findings available to draft outreach' }, { status: 400 });

    // LLM drafts value-first outreach
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Draft a value-first, evidence-based outreach email to ${company.name} (a ${company.industry || 'general'} company).

TOP FINDINGS:
${JSON.stringify(topFindings.map(f => ({ title: f.title, severity: f.severity, business_impact: f.business_impact, recommended_repair: f.recommended_repair })), null, 2)}

Requirements:
- Subject line: Specific, value-focused, not salesy (no spam-trigger words like "free", "guarantee", "urgent", "security research")
- Body: 150-250 words, conversational and consultative (partnership-oriented, NOT fear-based or accusatory)
- Reference 2-3 findings as general OBSERVATIONS about opportunities to improve — do NOT make specific security accusations, do NOT claim exposed keys or vulnerabilities, do NOT use alarmist language. Frame everything as "we noticed an opportunity to improve X" not "you have a critical security flaw"
- Include at least ONE concrete, verifiable, non-alarmist observation from the findings (e.g., a specific page name, a specific missing element like a lead form, a performance observation) to establish credibility
- Tone: Helpful expert offering a consultative diagnostic, not aggressive sales; no false urgency
- Include a soft, specific call to action offering a brief diagnostic call or a summary report, with a clear low-friction next step
- Include a professional email signature with a human sender name (e.g., "Jordan Avery, Diagnostic Lead at FaultLine AI"), role, and contact placeholder
- Include a CAN-SPAM compliant footer with: sender contact info, a one-click opt-out / unsubscribe line, and a physical mailing address placeholder
- No false claims — only reference the actual findings above, framed constructively
- Do NOT include recipient name (use a placeholder [First Name])

Return:
- subject: Email subject line
- body: Full email body text INCLUDING the signature and CAN-SPAM compliant opt-out footer
- evidence_refs: Array of finding IDs referenced`,
      response_json_schema: {
        type: 'object',
        properties: {
          subject: { type: 'string' },
          body: { type: 'string' },
          evidence_refs: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    // Create OutreachDraft — approval-gated, draft-only
    const draft = await base44.asServiceRole.entities.OutreachDraft.create({
      organization_id: orgId,
      company_id: companyId,
      subject: llmResponse.subject,
      body: llmResponse.body,
      evidence_refs: llmResponse.evidence_refs || [],
      approval_status: 'pending',
      send_status: 'draft_only'
    });

    // MANDATORY QA GATE — validate the email before anyone sees it
    const emailContent = `Subject: ${llmResponse.subject}\n\nBody:\n${llmResponse.body}`;
    const qa = await runMandatoryQA(base44, orgId, {
      target_type: 'outreach', target_id: draft.id, target_title: llmResponse.subject,
      content: emailContent, auto: true
    });
    const approvalStatus = qa.passed ? 'pending' : 'needs_revision';
    await base44.asServiceRole.entities.OutreachDraft.update(draft.id, {
      approval_status: approvalStatus,
      evidence_refs: [...(llmResponse.evidence_refs || []), `_qa_report:${qa.report_id}`]
    });

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'outreach',
      action: 'draft_outreach',
      status: 'success',
      summary: `Drafted outreach to ${company.name} — ${qa.status} (QA ${qa.score}/100)`,
      evidence: { company_id: companyId, draft_id: draft.id, findings_referenced: (llmResponse.evidence_refs || []).length, qa_report_id: qa.report_id, qa_status: qa.status }
    });

    return Response.json({
      status: 'success', draft_id: draft.id, subject: llmResponse.subject,
      approval_status: approvalStatus, qa
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}