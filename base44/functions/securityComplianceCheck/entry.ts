import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Security & Compliance Check — autonomously audits the organization's systems,
// deliverables, and generated outputs for compliance gaps across frameworks
// (SOC 2, GDPR, HIPAA, PCI-DSS, CCPA). Returns a compliance status, issues, and
// maintenance recommendations so the system stays in compliance autonomously.

const FRAMEWORKS = ['SOC 2', 'GDPR', 'HIPAA', 'PCI-DSS', 'CCPA'];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const frameworks = body.frameworks?.length ? body.frameworks : FRAMEWORKS;

    // Gather org context: recent deliverables, findings, monitoring rules, receipts
    const [deliverables, findings, monitoringRules, receipts] = await Promise.all([
      base44.asServiceRole.entities.Deliverable.filter({ organization_id: orgId }, '-created_date', 20),
      base44.asServiceRole.entities.Finding.filter({ organization_id: orgId }, '-created_date', 30),
      base44.asServiceRole.entities.MonitoringRule.filter({ organization_id: orgId }),
      base44.asServiceRole.entities.Receipt.filter({ organization_id: orgId }, '-created_date', 20)
    ]);

    const orgContext = `
DELIVERABLES (recent ${deliverables.length}): ${deliverables.map(d => `${d.title} [${d.deliverable_type}]`).join('; ')}
FINDINGS (${findings.length}): ${findings.slice(0, 15).map(f => `[${f.severity}] ${f.title}`).join('; ')}
MONITORING RULES (${monitoringRules.length}): ${monitoringRules.map(m => `${m.name} [${m.rule_type}] active=${m.active}`).join('; ')}
RECENT ACTIONS (${receipts.length}): ${receipts.map(r => `${r.system}/${r.action}=${r.status}`).join('; ')}
`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the FaultLine AI Security & Compliance Agent. You autonomously audit the organization's systems and generated outputs to maintain compliance. Be rigorous — flag anything that could cause a compliance failure.

FRAMEWORKS TO CHECK AGAINST: ${frameworks.join(', ')}

ORGANIZATION CONTEXT:
${orgContext}

Perform a compliance audit:
1. For EACH framework, check whether the org's current state meets its requirements:
   - SOC 2: access controls, audit logging, encryption, change management, incident response
   - GDPR: data subject rights, consent, data minimization, breach notification, DPA
   - HIPAA: PHI safeguards, BAA requirements, access logs, encryption at rest/transit
   - PCI-DSS: card data handling, network segmentation, vulnerability scanning
   - CCPA: consumer rights, privacy policy, data sale opt-out
2. Identify compliance GAPS — specific controls that are missing or weak
3. Identify SECURITY risks in the generated systems/deliverables
4. Check monitoring coverage — are critical systems being watched?
5. Provide maintenance actions to bring/keep the org in compliance

For each issue, assign severity (critical/high/medium/low), category (the framework or security domain), description, and recommendation.

Compute a compliance score (0-100) and status:
- "passed" if score >= 85 and no critical issues
- "warnings" if score >= 65 and no critical issues
- "failed" if score < 65 OR any critical issue

List which frameworks are currently compliant vs non-compliant. Provide a summary and prioritized maintenance recommendations.`,
      response_json_schema: {
        type: 'object',
        properties: {
          score: { type: 'number' },
          status: { type: 'string', enum: ['passed', 'failed', 'warnings'] },
          summary: { type: 'string' },
          framework_status: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                framework: { type: 'string' },
                compliant: { type: 'boolean' },
                gaps: { type: 'number' }
              }
            }
          },
          issues: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                category: { type: 'string' },
                description: { type: 'string' },
                recommendation: { type: 'string' }
              }
            }
          },
          recommendations: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    const report = await base44.asServiceRole.entities.QAReport.create({
      organization_id: orgId,
      target_type: 'system', target_id: '', target_title: 'Organization Compliance Audit',
      check_type: 'security_compliance',
      status: result.status || 'warnings',
      score: result.score || 0,
      issues: result.issues || [],
      summary: result.summary || '',
      recommendations: result.recommendations || [],
      compliance_frameworks: frameworks,
      auto_generated: !!body.auto
    });

    return Response.json({
      status: 'success',
      report_id: report.id,
      score: result.score, compliance_status: result.status,
      summary: result.summary,
      framework_status: result.framework_status || [],
      issues: result.issues, recommendations: result.recommendations,
      frameworks_checked: frameworks
    });
  } catch (error) {
    console.error('securityComplianceCheck error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}