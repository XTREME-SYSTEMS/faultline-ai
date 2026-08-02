import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { company_id } = body;

    let companies;
    if (company_id) {
      const c = await base44.asServiceRole.entities.Company.get(company_id);
      companies = [c];
    } else {
      companies = await base44.asServiceRole.entities.Company.filter({ organization_id: orgId }, '-created_date', 200);
    }

    const results = [];
    for (const company of companies) {
      // Get findings for this company
      const audits = await base44.asServiceRole.entities.Audit.filter({ organization_id: orgId, company_id: company.id }, '-created_date', 50);
      let allFindings = [];
      for (const a of audits) {
        const fs = await base44.asServiceRole.entities.Finding.filter({ organization_id: orgId, audit_id: a.id }, '-created_date', 100);
        allFindings = allFindings.concat(fs);
      }

      // Get repair actions
      const repairActions = await base44.asServiceRole.entities.RepairAction.filter({ organization_id: orgId }, '-created_date', 200);
      const companyActionIds = new Set(allFindings.map(f => f.id));
      const companyActions = repairActions.filter(ra => ra.finding_id && companyActionIds.has(ra.finding_id));

      // Get scan snapshots
      const snapshots = await base44.asServiceRole.entities.ScanSnapshot.filter({ organization_id: orgId, company_id: company.id }, '-created_date', 10);

      // Calculate metrics
      const totalFindings = allFindings.length;
      const resolvedFindings = companyActions.filter(ra => ra.status === 'resolved').length;
      const openFindings = totalFindings - resolvedFindings;
      const findingResolutionRate = totalFindings > 0 ? Math.round((resolvedFindings / totalFindings) * 100) : 0;

      // Days since last scan
      const lastScan = snapshots[0];
      const daysSinceLastScan = lastScan
        ? Math.floor((Date.now() - new Date(lastScan.created_date).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      // Login frequency — count receipts from portal access in last 30 days (proxy)
      const receipts = await base44.asServiceRole.entities.Receipt.filter({ organization_id: orgId }, '-created_date', 50);
      const portalAccessReceipts = receipts.filter(r =>
        r.system === 'portal_access' &&
        r.evidence?.company_id === company.id &&
        Date.now() - new Date(r.created_date).getTime() < 30 * 24 * 60 * 60 * 1000
      );
      const loginFrequency = portalAccessReceipts.length;

      // Churn risk calculation
      let riskScore = 0;
      if (findingResolutionRate < 25) riskScore += 30;
      else if (findingResolutionRate < 50) riskScore += 15;
      if (daysSinceLastScan > 90) riskScore += 35;
      else if (daysSinceLastScan > 60) riskScore += 20;
      else if (daysSinceLastScan > 30) riskScore += 10;
      if (loginFrequency === 0) riskScore += 25;
      else if (loginFrequency < 3) riskScore += 15;
      if (openFindings > 10) riskScore += 10;

      riskScore = Math.min(100, riskScore);
      const riskLevel = riskScore >= 75 ? 'critical' : riskScore >= 50 ? 'high' : riskScore >= 25 ? 'medium' : 'low';

      let recommendation;
      if (riskLevel === 'critical') recommendation = 'Immediate outreach required — client is likely to churn. Schedule a check-in call this week.';
      else if (riskLevel === 'high') recommendation = 'Proactive outreach recommended — schedule a review call within 2 weeks.';
      else if (riskLevel === 'medium') recommendation = 'Monitor closely — include in next weekly digest with personalized update.';
      else recommendation = 'Healthy engagement — continue current cadence.';

      // Persist
      const existing = await base44.asServiceRole.entities.ClientSuccessScore.filter({ organization_id: orgId, company_id: company.id }, '-created_date', 1);
      const scoreData = {
        organization_id: orgId,
        company_id: company.id,
        login_frequency: loginFrequency,
        finding_resolution_rate: findingResolutionRate,
        days_since_last_scan: daysSinceLastScan,
        total_findings: totalFindings,
        resolved_findings: resolvedFindings,
        open_findings: openFindings,
        churn_risk_score: riskScore,
        churn_risk_level: riskLevel,
        recommendation
      };

      let record;
      if (existing.length > 0) {
        await base44.asServiceRole.entities.ClientSuccessScore.update(existing[0].id, scoreData);
        record = { id: existing[0].id, ...scoreData };
      } else {
        record = await base44.asServiceRole.entities.ClientSuccessScore.create(scoreData);
      }

      results.push({ company_id: company.id, company_name: company.name, ...scoreData });
    }

    return Response.json({
      status: 'success',
      computed: results.length,
      results: company_id ? results[0] : results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}