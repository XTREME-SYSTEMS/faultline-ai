// ===== Deliverable Generators =====
// Risk register, AI readiness score, 30/60/90 repair plan, branded PDF proposal, follow-up email sequence.

export async function generateRiskRegister(base44, orgId, auditId, company) {
  const findings = await base44.asServiceRole.entities.Finding.filter({ organization_id: orgId, audit_id: auditId });
  if (findings.length === 0) return { risks_created: 0 };

  const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `You are a risk analyst. Create a formal risk register from these findings for ${company.name}.
FINDINGS: ${JSON.stringify(findings.map(f => ({ id: f.id, title: f.title, severity: f.severity, category: f.category, business_impact: f.business_impact })))}
For each finding, generate: title, likelihood (1-5), impact (1-5), controls (array of mitigation controls), status ("open").`,
    response_json_schema: { type: 'object', properties: { risks: { type: 'array', items: { type: 'object', properties: {
      finding_id: { type: 'string' }, title: { type: 'string' }, likelihood: { type: 'number' }, impact: { type: 'number' },
      controls: { type: 'array', items: { type: 'string' } }, status: { type: 'string' }
    }}}}}
  });

  const risks = llmResponse.risks || [];
  for (const r of risks) {
    await base44.asServiceRole.entities.Risk.create({ organization_id: orgId, finding_id: r.finding_id, title: r.title, likelihood: r.likelihood, impact: r.impact, controls: r.controls || [], status: r.status || 'open' });
  }
  return { risks_created: risks.length };
}

export async function scoreAIReadiness(base44, orgId, companyId, auditId, company) {
  const findings = await base44.asServiceRole.entities.Finding.filter({ organization_id: orgId, audit_id: auditId });
  const nodes = await base44.asServiceRole.entities.SystemNode.filter({ organization_id: orgId, company_id: companyId });

  const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `You are an AI readiness assessor. Score ${company.name}'s readiness for AI automation across 6 dimensions.
FINDINGS: ${JSON.stringify(findings.map(f => ({ title: f.title, category: f.category, severity: f.severity })))}
SYSTEMS: ${JSON.stringify(nodes.map(n => ({ name: n.name, type: n.node_type, health: n.health_status, ai_enhancement: n.ai_enhancement })))}
Score each dimension 0-100: data_quality, process_stability, technology_stack, governance, security_posture, team_readiness.
Also provide: overall_score (0-100), top_gaps (array of 3-5 strings), preparation_steps (array of 3-5 strings).`,
    response_json_schema: { type: 'object', properties: {
      dimensions: { type: 'object', properties: {
        data_quality: { type: 'number' }, process_stability: { type: 'number' }, technology_stack: { type: 'number' },
        governance: { type: 'number' }, security_posture: { type: 'number' }, team_readiness: { type: 'number' }
      }},
      overall_score: { type: 'number' }, top_gaps: { type: 'array', items: { type: 'string' } }, preparation_steps: { type: 'array', items: { type: 'string' } }
    }}
  });

  await base44.asServiceRole.entities.Audit.update(auditId, { scope: { ai_readiness: llmResponse } });
  return { ai_readiness_score: llmResponse.overall_score || 0, top_gaps: llmResponse.top_gaps || [] };
}

export async function generateRepairRoadmap(base44, orgId, auditId, company) {
  const findings = await base44.asServiceRole.entities.Finding.filter({ organization_id: orgId, audit_id: auditId });
  if (findings.length === 0) return { plan_id: null, actions: 0 };

  const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `Create a prioritized 30/60/90 repair plan for ${company.name}.
FINDINGS: ${JSON.stringify(findings.map(f => ({ id: f.id, title: f.title, severity: f.severity, recommended_repair: f.recommended_repair })))}
Generate: title, horizon_days (90), actions (5-15 items with title, priority 1-5, owner_role, effort_estimate, validation_criteria, finding_id). Prioritize critical first, quick wins first.`,
    response_json_schema: { type: 'object', properties: { title: { type: 'string' }, horizon_days: { type: 'number' },
      actions: { type: 'array', items: { type: 'object', properties: {
        title: { type: 'string' }, priority: { type: 'number' }, owner_role: { type: 'string' }, effort_estimate: { type: 'string' }, validation_criteria: { type: 'string' }, finding_id: { type: 'string' }
      }}}}}
  });

  const plan = await base44.asServiceRole.entities.RepairPlan.create({ organization_id: orgId, audit_id: auditId, title: llmResponse.title || `Repair Plan — ${company.name}`, horizon_days: llmResponse.horizon_days || 90, status: 'active' });
  const actions = llmResponse.actions || [];
  for (const a of actions) {
    await base44.asServiceRole.entities.RepairAction.create({ organization_id: orgId, repair_plan_id: plan.id, finding_id: a.finding_id, title: a.title, priority: a.priority, owner_role: a.owner_role, status: 'pending', validation_result: a.validation_criteria });
  }
  return { plan_id: plan.id, actions: actions.length };
}

export async function generateBrandedProposal(base44, proposal, company, enhancedResult) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>FaultLine AI — Security Proposal for ${company.name}</title>
<style>
  body { font-family: 'DM Sans', Arial, sans-serif; color: #111; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.6; }
  .header { text-align: center; border-bottom: 3px solid #C89B3C; padding-bottom: 30px; margin-bottom: 30px; }
  .header h1 { font-family: 'Libre Caslon Display', Georgia, serif; font-size: 36px; margin: 0; }
  .header .subtitle { color: #C89B3C; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-top: 8px; }
  .score-box { display: flex; justify-content: space-around; background: #0b0b0b; color: #fff; padding: 30px; border-radius: 12px; margin: 30px 0; }
  .score-box .score { text-align: center; }
  .score-box .score b { font-size: 48px; font-family: 'Libre Caslon Display', Georgia, serif; display: block; }
  .score-box .score small { color: #C89B3C; text-transform: uppercase; font-size: 10px; letter-spacing: 1px; }
  .section { margin: 30px 0; }
  .section h2 { font-family: 'Libre Caslon Display', Georgia, serif; font-size: 24px; border-bottom: 1px solid #e5e1da; padding-bottom: 8px; }
  .pricing { background: #f8f7f4; border: 1px solid #e5e1da; border-radius: 8px; padding: 24px; margin: 20px 0; }
  .pricing table { width: 100%; border-collapse: collapse; }
  .pricing td { padding: 10px 0; border-bottom: 1px solid #e5e1da; }
  .pricing .total { font-weight: bold; font-size: 18px; border-top: 2px solid #C89B3C; border-bottom: none; padding-top: 14px; }
  .footer { text-align: center; margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e1da; color: #888; font-size: 12px; }
  .gold { color: #C89B3C; }
</style></head><body>
  <div class="header"><h1>Security & Enhancement Proposal</h1><div class="subtitle">Prepared by FaultLine AI for ${company.name}</div></div>
  <div class="score-box">
    <div class="score"><b>${proposal.original_health_score}</b><small>Current Score</small></div>
    <div class="score"><b style="color:#237A4B">${proposal.enhanced_health_score}</b><small>Enhanced Score</small></div>
    <div class="score"><b style="color:#C89B3C">$${proposal.total_price?.toLocaleString()}</b><small>Investment</small></div>
  </div>
  ${proposal.proposal_text ? `<div class="section"><h2>Executive Summary</h2><div>${proposal.proposal_text.replace(/\n/g, '<br>')}</div></div>` : ''}
  ${enhancedResult.enhanced_system_summary ? `<div class="section"><h2>Enhanced System Projection</h2><p>${enhancedResult.enhanced_system_summary}</p></div>` : ''}
  <div class="section"><h2>Investment Breakdown</h2><div class="pricing"><table>
    ${Object.entries(proposal.pricing_breakdown || {}).map(([k, v]) => `<tr><td>${k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</td><td style="text-align:right">$${Number(v).toLocaleString()}</td></tr>`).join('')}
    <tr class="total"><td>Total Investment</td><td style="text-align:right">$${proposal.total_price?.toLocaleString()}</td></tr>
  </table></div></div>
  <div class="section"><h2>Recommended Plan</h2><p><b class="gold">${proposal.recommended_plan}</b></p></div>
  <div class="footer">Generated by FaultLine AI · ${new Date().toLocaleDateString()} · Confidential</div>
</body></html>`;

  const fileBlob = new Blob([html], { type: 'text/html' });
  const file = new File([fileBlob], `faultline-proposal-${company.name.replace(/\s/g, '-')}-${Date.now()}.html`, { type: 'text/html' });
  const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });
  return { proposal_url: uploadResult.file_url };
}

export async function generateFollowUpSequence(base44, orgId, companyId, auditId, company, proposalResult, originalHealthScore, enhancedHealthScore) {
  const findings = await base44.asServiceRole.entities.Finding.filter({ organization_id: orgId, audit_id: auditId });
  const topFindings = findings.slice(0, 5);

  const sequenceResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `Create a 3-touch follow-up email sequence for ${company.name} (${company.industry || 'general'}).
Context: Health score ${originalHealthScore}/100 → ${enhancedHealthScore}/100 with FaultLine AI. ${findings.length} findings. Investment: $${proposalResult.total_price}. Plan: ${proposalResult.recommended_plan}.
Top findings: ${JSON.stringify(topFindings.map(f => ({ title: f.title, severity: f.severity })))}
Generate 3 emails: Touch 1 (value-first intro, references findings), Touch 2 (case study/social proof, 5-7 days later), Touch 3 (final offer/urgency, 5-7 days after touch 2).
Each: subject, body (100-200 words), send_delay_days (0, 5, 12).`,
    response_json_schema: { type: 'object', properties: { emails: { type: 'array', items: { type: 'object', properties: {
      subject: { type: 'string' }, body: { type: 'string' }, send_delay_days: { type: 'number' }
    }}}}}
  });

  const emails = sequenceResponse.emails || [];
  const draftIds = [];
  for (const email of emails) {
    const draft = await base44.asServiceRole.entities.OutreachDraft.create({
      organization_id: orgId, company_id: companyId, subject: email.subject, body: email.body,
      evidence_refs: topFindings.map(f => f.id), approval_status: 'pending', send_status: 'draft_only'
    });
    draftIds.push(draft.id);
  }
  return { sequence_emails: emails.length, draft_ids: draftIds };
}