import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found on user profile' }, { status: 400 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('hubspot');
    const authHeaders = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    // Get all discovered/scanned companies
    const companies = await base44.asServiceRole.entities.Company.filter({ organization_id: orgId });
    let synced = 0;
    let skipped = 0;
    let errors = 0;
    const errorDetails = [];

    for (const company of companies) {
      try {
        const domain = (company.domain || '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');

        // Search HubSpot for an existing company by domain to avoid duplicates
        let existingCompanyId = null;
        if (domain) {
          const searchRes = await fetch('https://api.hubapi.com/crm/v3/objects/companies/search', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ filters: [{ propertyName: 'domain', operator: 'EQ', value: domain }], properties: ['name', 'domain'] })
          });
          if (searchRes.ok) {
            const searchJson = await searchRes.json();
            if (searchJson.results && searchJson.results.length > 0) {
              existingCompanyId = searchJson.results[0].id;
            }
          }
        }

        let hubCompanyId = existingCompanyId;
        if (existingCompanyId) {
          // Update the existing company record
          await fetch(`https://api.hubapi.com/crm/v3/objects/companies/${existingCompanyId}`, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({
              properties: {
                name: company.name,
                description: `FaultLine AI discovered company — industry: ${company.industry || 'unknown'} — status: ${company.status}`
              }
            })
          });
          skipped++;
        } else {
          // Create a new company in HubSpot
          const companyRes = await fetch('https://api.hubapi.com/crm/v3/objects/companies', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              properties: {
                name: company.name,
                domain: domain || '',
                description: `FaultLine AI discovered company — industry: ${company.industry || 'unknown'} — status: ${company.status}`
              }
            })
          });
          if (companyRes.ok) {
            const hubCompany = await companyRes.json();
            hubCompanyId = hubCompany.id;
            synced++;
          } else {
            const errBody = await companyRes.text().catch(() => '');
            errors++;
            errorDetails.push({ company: company.name, status: companyRes.status, body: errBody.substring(0, 200) });
            continue;
          }
        }

        // Create a deal for this company (only for newly created companies)
        if (hubCompanyId && !existingCompanyId) {
          await fetch('https://api.hubapi.com/crm/v3/objects/deals', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              properties: {
                dealname: `FaultLine Diagnostic — ${company.name}`,
                dealstage: 'appointmentscheduled',
                pipeline: 'default',
                amount: '299'
              },
              associations: [{ to: { id: hubCompanyId }, types: [{ category: 'HUBSPOT_DEFINED', typeId: 5 }] }]
            })
          });
        }
      } catch (e) {
        errors++;
        errorDetails.push({ company: company.name, error: e.message });
      }
    }

    const overallStatus = errors === 0 ? 'success' : (synced > 0 || skipped > 0 ? 'partial' : 'failed');
    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'hubspot',
      action: 'sync_companies',
      status: overallStatus,
      summary: `Synced ${synced} companies, updated ${skipped} existing, ${errors} errors`,
      evidence: { total: companies.length, synced, skipped, errors, error_details: errorDetails.slice(0, 10) }
    });

    return Response.json({ status: overallStatus, synced, skipped, errors, total: companies.length, error_details: errorDetails.slice(0, 10) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}