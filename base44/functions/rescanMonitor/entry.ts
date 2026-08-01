import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found on user profile' }, { status: 400 });

    // Get all scanned companies (limit to 5 per run to avoid timeout)
    const companies = await base44.asServiceRole.entities.Company.filter({ organization_id: orgId, status: 'scanned' }, '-created_date', 5);
    let rescanned = 0;
    let newCriticalEvents = 0;

    for (const company of companies) {
      // Get previous snapshot for comparison
      const prevSnapshots = await base44.asServiceRole.entities.ScanSnapshot.filter({ organization_id: orgId, company_id: company.id }, '-scanned_at', 1);
      const prevScore = prevSnapshots.length > 0 ? prevSnapshots[0].health_score : null;

      // Re-scan by invoking scanCompany
      try {
        const scanResult = await base44.asServiceRole.functions.invoke('scanCompany', { company_id: company.id });
        rescanned++;

        // Get the new snapshot
        const newSnapshots = await base44.asServiceRole.entities.ScanSnapshot.filter({ organization_id: orgId, company_id: company.id }, '-scanned_at', 1);
        if (newSnapshots.length > 0) {
          const newSnapshot = newSnapshots[0];
          // Check for score drop or new critical findings
          if (prevScore !== null && newSnapshot.health_score < prevScore) {
            const rules = await base44.asServiceRole.entities.MonitoringRule.filter({ organization_id: orgId, active: true });
            const rule = rules.length > 0 ? rules[0] : null;
            await base44.asServiceRole.entities.MonitoringEvent.create({
              organization_id: orgId,
              monitoring_rule_id: rule?.id || 'manual',
              event_type: 'score_drop',
              severity: newSnapshot.critical_count > 0 ? 'critical' : 'high',
              payload: { company_id: company.id, company_name: company.name, prev_score: prevScore, new_score: newSnapshot.health_score, drop: prevScore - newSnapshot.health_score }
            });
            newCriticalEvents++;
          }
          if (newSnapshot.critical_count > 0 && (prevScore === null || newSnapshot.critical_count > (prevSnapshots[0]?.critical_count || 0))) {
            const rules = await base44.asServiceRole.entities.MonitoringRule.filter({ organization_id: orgId, active: true });
            const rule = rules.length > 0 ? rules[0] : null;
            await base44.asServiceRole.entities.MonitoringEvent.create({
              organization_id: orgId,
              monitoring_rule_id: rule?.id || 'manual',
              event_type: 'new_critical_findings',
              severity: 'critical',
              payload: { company_id: company.id, company_name: company.name, critical_count: newSnapshot.critical_count }
            });
            newCriticalEvents++;
          }
        }
      } catch (e) {
        // Continue to next company on error
      }
    }

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'monitor',
      action: 'rescan_companies',
      status: 'success',
      summary: `Re-scanned ${rescanned} companies — ${newCriticalEvents} monitoring events created`,
      evidence: { rescanned, new_critical_events: newCriticalEvents }
    });

    return Response.json({ status: 'success', rescanned, new_critical_events: newCriticalEvents });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}