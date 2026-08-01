import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found on user profile' }, { status: 400 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('hubspot');

    // Get all discovered/scanned companies
    const companies = await base44.asServiceRole.entities.Company.filter({ organization_id: orgId });
    let synced = 0;
    let errors = 0;

    for (const company of companies) {
      try {
        // Create company in HubSpot
        const companyRes = await fetch('https://api.hubapi.com/crm/v3/objects/companies', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            properties: {
              name: company.name,
              domain: company.domain || '',
              industry: company.industry || '',
              description: `FaultLine AI discovered company — status: ${company.status}`
            }
          })
        });

        if (companyRes.ok) {
          const hubCompany = await companyRes.json();
          // Create a deal for this company
          await fetch('https://api.hubapi.com/crm/v3/objects/deals', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              properties: {
                dealname: `FaultLine Diagnostic — ${company.name}`,
                dealstage: 'appointmentscheduled',
                pipeline: 'default',
                amount: '299'
              },
              associations: [{ to: { id: hubCompany.id }, types: [{ category: 'HUBSPOT_DEFINED', typeId: 5 }] }]
            })
          });
          synced++;
        } else {
          errors++;
        }
      } catch {
        errors++;
      }
    }

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'hubspot',
      action: 'sync_companies',
      status: 'success',
      summary: `Synced ${synced} companies to HubSpot CRM (${errors} errors)`,
      evidence: { total: companies.length, synced, errors }
    });

    return Response.json({ status: 'success', synced, errors, total: companies.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}