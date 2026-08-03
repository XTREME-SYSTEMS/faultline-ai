import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const companyId = body.company_id;

    if (!companyId) {
      return Response.json({ error: 'Missing company_id parameter.' }, { status: 400 });
    }

    // Authenticate the caller before returning any sensitive data
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the company
    const company = await base44.asServiceRole.entities.Company.get(companyId);
    if (!company) {
      return Response.json({ error: 'Company not found.' }, { status: 404 });
    }

    // Verify the caller belongs to the organization that owns this company
    const userOrgId = user.data?.organization_id;
    if (!userOrgId || userOrgId !== company.organization_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch audits, findings, scan snapshots, and websites in parallel
    const [audits, findings, scanSnapshots, websites] = await Promise.all([
      base44.asServiceRole.entities.Audit.filter({ company_id: companyId }, '-created_date', 50),
      base44.asServiceRole.entities.Finding.filter({ organization_id: company.organization_id }, '-created_date', 200),
      base44.asServiceRole.entities.ScanSnapshot.filter({ company_id: companyId }, '-scanned_at', 20),
      base44.asServiceRole.entities.Website.filter({ company_id: companyId }, '-created_date', 20)
    ]);

    // Filter findings to those belonging to this company's audits
    const auditIds = audits.map(a => a.id);
    const companyFindings = findings.filter(f => auditIds.includes(f.audit_id));

    // Fetch repair plans for this company's audits
    let repairPlans = [];
    if (auditIds.length > 0) {
      repairPlans = await base44.asServiceRole.entities.RepairPlan.filter({ audit_id: { $in: auditIds } }, '-created_date', 50);
    }

    // Calculate health score from latest scan snapshot
    const latestSnapshot = scanSnapshots[0];
    const healthScore = latestSnapshot?.health_score ?? null;

    // Severity counts
    const severityCounts = {
      critical: companyFindings.filter(f => f.severity === 'critical').length,
      high: companyFindings.filter(f => f.severity === 'high').length,
      medium: companyFindings.filter(f => f.severity === 'medium').length,
      low: companyFindings.filter(f => f.severity === 'low').length
    };

    return Response.json({
      company,
      audits,
      findings: companyFindings,
      repairPlans,
      scanSnapshots,
      websites,
      healthScore,
      severityCounts,
      totalFindings: companyFindings.length
    });
  } catch (error) {
    console.error('getCustomerPortalData error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}