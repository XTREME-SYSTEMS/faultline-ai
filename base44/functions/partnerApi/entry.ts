import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Partner API — public endpoint for partners to access audit data programmatically.
// Authenticates via X-API-Key header. Enforces scopes and rate limits.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) return Response.json({ error: 'X-API-Key header required' }, { status: 401 });

    // Find the partner API key
    const keys = await base44.asServiceRole.entities.PartnerApiKey.filter({ api_key: apiKey, active: true });
    if (keys.length === 0) return Response.json({ error: 'Invalid API key' }, { status: 401 });

    const partner = keys[0];

    // Rate limit check
    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;
    const lastUsed = partner.last_used ? new Date(partner.last_used).getTime() : 0;
    if (lastUsed < hourAgo) {
      // Reset counter if new hour
      partner.requests_this_hour = 0;
    }
    if (partner.requests_this_hour >= partner.rate_limit_per_hour) {
      return Response.json({ error: 'Rate limit exceeded', limit: partner.rate_limit_per_hour }, { status: 429 });
    }

    // Update usage
    await base44.asServiceRole.entities.PartnerApiKey.update(partner.id, {
      requests_this_hour: (partner.requests_this_hour || 0) + 1,
      last_used: new Date().toISOString()
    });

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'list_audits';
    const orgId = partner.organization_id;

    // Check scopes
    const hasScope = (scope) => partner.scopes?.includes(scope);

    let result;

    if (action === 'list_audits') {
      if (!hasScope('read_audits')) return Response.json({ error: 'Missing scope: read_audits' }, { status: 403 });
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const audits = await base44.asServiceRole.entities.Audit.filter({ organization_id: orgId }, '-created_date', limit);
      result = { audits: audits.map(a => ({ id: a.id, title: a.title, type: a.audit_type, status: a.status, created_date: a.created_date })) };
    }
    else if (action === 'list_findings') {
      if (!hasScope('read_findings')) return Response.json({ error: 'Missing scope: read_findings' }, { status: 403 });
      const auditId = url.searchParams.get('audit_id');
      if (!auditId) return Response.json({ error: 'audit_id required' }, { status: 400 });
      const findings = await base44.asServiceRole.entities.Finding.filter({ organization_id: orgId, audit_id: auditId }, '-created_date', 200);
      result = { findings: findings.map(f => ({ id: f.id, title: f.title, severity: f.severity, category: f.category, confidence: f.confidence, business_impact: f.business_impact, recommended_repair: f.recommended_repair })) };
    }
    else if (action === 'list_companies') {
      if (!hasScope('read_companies')) return Response.json({ error: 'Missing scope: read_companies' }, { status: 403 });
      const companies = await base44.asServiceRole.entities.Company.filter({ organization_id: orgId }, '-created_date', 200);
      result = { companies: companies.map(c => ({ id: c.id, name: c.name, industry: c.industry, domain: c.domain, status: c.status })) };
    }
    else if (action === 'get_scores') {
      if (!hasScope('read_scores')) return Response.json({ error: 'Missing scope: read_scores' }, { status: 403 });
      const snapshots = await base44.asServiceRole.entities.ScanSnapshot.filter({ organization_id: orgId }, '-created_date', 200);
      result = { scores: snapshots.map(s => ({ company_id: s.company_id, health_score: s.health_score, finding_count: s.finding_count, critical_count: s.critical_count, scanned_at: s.scanned_at })) };
    }
    else if (action === 'create_lead') {
      if (!hasScope('create_leads')) return Response.json({ error: 'Missing scope: create_leads' }, { status: 403 });
      const body = await req.json().catch(() => ({}));
      if (!body.email || !body.company) return Response.json({ error: 'email and company required' }, { status: 400 });
      const lead = await base44.asServiceRole.entities.AuditLead.create({
        name: body.name || body.company,
        email: body.email,
        company: body.company,
        website: body.website || '',
        concern: body.concern || 'partner_referral',
        plan: body.plan || 'Diagnostic',
        status: 'new',
        source: `partner_api:${partner.partner_name}`
      });
      result = { lead_id: lead.id, status: 'created' };
    }
    else {
      return Response.json({ error: 'Unknown action. Available: list_audits, list_findings, list_companies, get_scores, create_lead' }, { status: 400 });
    }

    return Response.json({ status: 'success', partner: partner.partner_name, ...result });
  } catch (error) {
    console.error('partnerApi error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}