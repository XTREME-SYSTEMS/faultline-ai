// ===== Automation Steps =====
// HubSpot deal sync, Stripe payment link, monitoring rules, client portal auto-config, RAG indexing, team notification.

export async function syncHubSpotDeal(base44, orgId, company, proposalResult) {
  try {
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('hubspot');
    const companyRes = await fetch('https://api.hubapi.com/crm/v3/objects/companies', {
      method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties: { name: company.name, domain: company.domain || '', industry: company.industry || '', description: `FaultLine AI security audit — ${proposalResult.total_price ? '$' + proposalResult.total_price : 'proposal'}` } })
    });
    if (!companyRes.ok) return { synced: false, error: 'Failed to create company' };
    const hubCompany = await companyRes.json();
    await fetch('https://api.hubapi.com/crm/v3/objects/deals', {
      method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties: { dealname: `FaultLine Security Audit — ${company.name}`, dealstage: 'appointmentscheduled', pipeline: 'default', amount: String(proposalResult.total_price || 299) },
        associations: [{ to: { id: hubCompany.id }, types: [{ category: 'HUBSPOT_DEFINED', typeId: 5 }] }] })
    });
    return { synced: true, hubspot_company_id: hubCompany.id };
  } catch (e) { return { synced: false, error: e.message }; }
}

export async function createStripePaymentLink(base44, orgId, company, proposalResult) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return { created: false, error: 'Stripe key not configured' };
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        'mode': 'payment',
        'line_items[0][quantity]': '1',
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][unit_amount]': String((proposalResult.total_price || 0) * 100),
        'line_items[0][price_data][product_data][name]': `FaultLine AI Security Audit — ${company.name}`,
        'metadata[base44_app_id]': process.env.BASE44_APP_ID || '',
        'metadata[company_id]': company.id,
        'metadata[proposal_id]': proposalResult.proposal_id || '',
        'success_url': `${process.env.BASE44_APP_URL || ''}/portal/${company.id}?payment=success`,
        'cancel_url': `${process.env.BASE44_APP_URL || ''}/portal/${company.id}?payment=cancelled`
      })
    });
    const session = await res.json();
    if (session.url) return { created: true, checkout_url: session.url, session_id: session.id };
    return { created: false, error: session.error?.message || 'Unknown error' };
  } catch (e) { return { created: false, error: e.message }; }
}

export async function setupMonitoringRules(base44, orgId, companyId) {
  const rules = [
    { name: 'Website Uptime Monitor', rule_type: 'uptime', configuration: { company_id: companyId, check_interval: '5m', alert_threshold: '1m' } },
    { name: 'Security Header Monitor', rule_type: 'security_headers', configuration: { company_id: companyId, check_interval: 'daily', headers: ['csp', 'hsts', 'x-frame-options'] } },
    { name: 'SSL Certificate Monitor', rule_type: 'ssl_expiry', configuration: { company_id: companyId, check_interval: 'daily', alert_days: 30 } },
    { name: 'New Finding Alert', rule_type: 'finding_threshold', configuration: { company_id: companyId, check_interval: 'daily', severity: 'high' } }
  ];
  const created = [];
  for (const r of rules) {
    const rule = await base44.asServiceRole.entities.MonitoringRule.create({ organization_id: orgId, name: r.name, rule_type: r.rule_type, configuration: r.configuration, active: true });
    created.push(rule.id);
  }
  return { rules_created: created.length };
}

export async function autoConfigClientPortal(base44, orgId, companyId, auditId) {
  const existing = await base44.asServiceRole.entities.ClientPortalConfig.filter({ organization_id: orgId, company_id: companyId });
  if (existing.length > 0) return { portal_config_id: existing[0].id, already_existed: true };

  const company = await base44.asServiceRole.entities.Company.get(companyId);
  const config = await base44.asServiceRole.entities.ClientPortalConfig.create({
    organization_id: orgId, company_id: companyId, portal_name: `${company.name} — Security Portal`,
    welcome_message: `Welcome to your FaultLine AI security portal. We've completed a comprehensive security audit and prepared your enhancement roadmap.`,
    expose_findings: true, expose_repair_plans: true, expose_reports: true, expose_health_score: true,
    guide_tone: 'professional', guide_focus: 'security_enhancement', setup_complete: true, current_phase: 4
  });
  return { portal_config_id: config.id, portal_url: `/portal/${companyId}` };
}

export async function indexFindingsInRAG(base44, orgId, auditId) {
  try {
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('supabase');
    if (!accessToken) return { indexed: false, error: 'Supabase not connected' };

    const findings = await base44.asServiceRole.entities.Finding.filter({ organization_id: orgId, audit_id: auditId });
    const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';

    let indexed = 0;
    for (const f of findings) {
      const searchText = `${f.title} ${f.description} ${f.category} ${f.severity} ${f.business_impact || ''} ${f.recommended_repair || ''}`;
      try {
        await fetch(`${supabaseUrl}/rest/v1/findings_index`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'apikey': accessToken, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({ organization_id: orgId, audit_id: auditId, finding_id: f.id, search_text: searchText, severity: f.severity, category: f.category, title: f.title })
        });
        indexed++;
      } catch {}
    }
    return { indexed: true, count: indexed };
  } catch (e) { return { indexed: false, error: e.message }; }
}

export async function notifyTeam(base44, user, company, summary) {
  try {
    if (!user?.email) return { notified: false, error: 'No user email' };
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user.email,
      subject: `⚡ Security Pipeline Complete — ${company.name}`,
      body: `The full security pipeline has completed for ${company.name}.\n\nSummary:\n${summary}\n\nView results in your FaultLine AI dashboard.`
    });
    return { notified: true, email: user.email };
  } catch (e) { return { notified: false, error: e.message }; }
}