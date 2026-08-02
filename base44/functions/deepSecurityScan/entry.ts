import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { runSecurityScan } from '../../shared/securityScanner.ts';

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

    const result = await runSecurityScan(base44, orgId, companyId);

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId, system: 'security_scanner', action: 'deep_security_scan',
      status: 'success',
      summary: `Deep security scan: ${result.findings_created} findings, health score ${result.health_score}`,
      evidence: { company_id: companyId, audit_id: result.audit_id, findings: result.findings_created }
    });

    return Response.json({ status: 'success', company_id: companyId, ...result });
  } catch (error) {
    console.error('deepSecurityScan error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}