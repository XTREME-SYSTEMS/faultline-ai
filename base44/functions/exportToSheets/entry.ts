import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found on user profile' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');

    // Get all findings with company names
    const findings = await base44.asServiceRole.entities.Finding.filter({ organization_id: orgId }, '-created_date', 200);
    const audits = await base44.asServiceRole.entities.Audit.filter({ organization_id: orgId });
    const auditMap = {};
    for (const a of audits) auditMap[a.id] = a;
    const companies = await base44.asServiceRole.entities.Company.filter({ organization_id: orgId });
    const companyMap = {};
    for (const c of companies) companyMap[c.id] = c;

    // Create a new spreadsheet
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        properties: { title: `FaultLine Findings — ${new Date().toLocaleDateString()}` },
        sheets: [{ properties: { title: 'Findings' } }]
      })
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      return Response.json({ error: `Sheets create failed: ${errText}` }, { status: 502 });
    }

    const sheet = await createRes.json();
    const spreadsheetId = sheet.spreadsheetId;
    const spreadsheetUrl = sheet.spreadsheetUrl;

    // Build values: header row + finding rows
    const values = [
      ['Title', 'Severity', 'Category', 'Confidence', 'Business Impact', 'Recommended Repair', 'Company', 'Audit', 'Date']
    ];
    for (const f of findings) {
      const audit = auditMap[f.audit_id];
      const company = audit ? companyMap[audit.company_id] : null;
      values.push([
        f.title || '',
        f.severity || '',
        f.category || '',
        String(f.confidence || ''),
        f.business_impact || '',
        f.recommended_repair || '',
        company?.name || '',
        audit?.title || '',
        new Date(f.created_date).toLocaleDateString()
      ]);
    }

    // Append values
    const appendRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Findings!A1:append?valueInputOption=RAW`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values })
    });

    if (!appendRes.ok) {
      const errText = await appendRes.text();
      return Response.json({ error: `Sheets append failed: ${errText}` }, { status: 502 });
    }

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'sheets',
      action: 'export_findings',
      status: 'success',
      summary: `Exported ${findings.length} findings to Google Sheets`,
      evidence: { spreadsheet_id: spreadsheetId, spreadsheet_url: spreadsheetUrl, finding_count: findings.length }
    });

    return Response.json({ status: 'success', spreadsheet_url: spreadsheetUrl, findings_exported: findings.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}