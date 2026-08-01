import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found on user profile' }, { status: 400 });

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get findings from last 7 days
    const findings = await base44.asServiceRole.entities.Finding.filter({ organization_id: orgId }, '-created_date', 200);
    const recentFindings = findings.filter(f => new Date(f.created_date) >= new Date(oneWeekAgo));

    // Get recent snapshots for score changes
    const snapshots = await base44.asServiceRole.entities.ScanSnapshot.filter({ organization_id: orgId }, '-scanned_at', 50);
    const companies = await base44.asServiceRole.entities.Company.filter({ organization_id: orgId });
    const companyMap = {};
    for (const c of companies) companyMap[c.id] = c;

    // Get top repair actions
    const repairActions = await base44.asServiceRole.entities.RepairAction.filter({ organization_id: orgId, status: 'pending' }, '-priority', 5);

    // Build digest
    const criticalCount = recentFindings.filter(f => f.severity === 'critical').length;
    const highCount = recentFindings.filter(f => f.severity === 'high').length;

    const findingsList = recentFindings.slice(0, 10).map(f => `• [${f.severity.toUpperCase()}] ${f.title} — ${f.business_impact || 'Impact not quantified'}`).join('\n');

    const scoreChanges = snapshots.slice(0, 10).map(s => {
      const company = companyMap[s.company_id];
      return `• ${company?.name || 'Unknown'}: score ${s.health_score}, ${s.finding_count} findings (${s.critical_count} critical)`;
    }).join('\n');

    const actionsList = repairActions.slice(0, 5).map(a => `• [P${a.priority}] ${a.title} (Owner: ${a.owner_role || 'Unassigned'})`).join('\n');

    const emailBody = `Weekly FaultLine AI Digest — ${new Date().toLocaleDateString()}

NEW FINDINGS THIS WEEK: ${recentFindings.length}
(${criticalCount} critical, ${highCount} high)

TOP FINDINGS:
${findingsList || 'No new findings this week.'}

SCORE UPDATES:
${scoreChanges || 'No scans this week.'}

TOP RECOMMENDED ACTIONS:
${actionsList || 'No pending actions.'}

Log in to the FaultLine AI portal to review details and approve actions.`;

    // Send email to the user (registered app user)
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user.email,
      subject: `FaultLine AI Weekly Digest — ${recentFindings.length} new findings`,
      body: emailBody
    });

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'digest',
      action: 'weekly_digest',
      status: 'success',
      summary: `Sent weekly digest to ${user.email} — ${recentFindings.length} new findings, ${repairActions.length} pending actions`,
      evidence: { findings_count: recentFindings.length, critical: criticalCount, high: highCount, sent_to: user.email }
    });

    return Response.json({ status: 'success', sent_to: user.email, findings_count: recentFindings.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}