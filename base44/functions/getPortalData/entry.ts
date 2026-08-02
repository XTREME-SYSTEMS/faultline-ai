import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = user.data?.organization_id;
    if (!orgId) {
      return Response.json({ error: 'No organization assigned to your account.' }, { status: 403 });
    }

    const [companies, audits, findings, receipts] = await Promise.all([
      base44.asServiceRole.entities.Company.filter({ organization_id: orgId }, '-created_date', 200),
      base44.asServiceRole.entities.Audit.filter({ organization_id: orgId }, '-created_date', 100),
      base44.asServiceRole.entities.Finding.filter({ organization_id: orgId }, '-created_date', 100),
      base44.asServiceRole.entities.Receipt.filter({ organization_id: orgId }, '-created_date', 50)
    ]);

    return Response.json({ companies, audits, findings, receipts, orgId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}