import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Creates a HubSpot deal from an IndustryOpportunity record.
// Called by the "Opportunity to HubSpot Deal" workflow on every new opportunity,
// or manually from the UI. Idempotent: skips if the opportunity already has a hubspot_deal_id.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found on user profile' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { opportunity_id } = body;
    if (!opportunity_id) return Response.json({ error: 'opportunity_id required' }, { status: 400 });

    const opportunity = await base44.asServiceRole.entities.IndustryOpportunity.get(opportunity_id);
    if (!opportunity) return Response.json({ error: 'Opportunity not found' }, { status: 404 });
    if (opportunity.organization_id !== orgId) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Idempotency: skip if already pushed
    if (opportunity.hubspot_deal_id) {
      return Response.json({ status: 'skipped', deal_id: opportunity.hubspot_deal_id, reason: 'already_synced' });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('hubspot');

    // Create the deal directly from the opportunity
    const dealRes = await fetch('https://api.hubapi.com/crm/v3/objects/deals', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        properties: {
          dealname: `${opportunity.opportunity_title} — ${opportunity.industry}${opportunity.location ? ` (${opportunity.location})` : ''}`,
          dealstage: 'appointmentscheduled',
          pipeline: 'default',
          amount: String(Math.round((opportunity.revenue_impact_estimate || 0) / 1000)),
          description: opportunity.opportunity_description || '',
          dealtype: 'newbusiness'
        }
      })
    });

    if (!dealRes.ok) {
      const errText = await dealRes.text();
      console.error('HubSpot deal creation failed:', dealRes.status, errText);
      return Response.json({ error: `HubSpot API error: ${dealRes.status}`, details: errText }, { status: 502 });
    }

    const deal = await dealRes.json();

    // Stamp the opportunity so we never duplicate it
    await base44.asServiceRole.entities.IndustryOpportunity.update(opportunity_id, {
      hubspot_deal_id: deal.id,
      status: 'pushed_to_crm'
    });

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'hubspot',
      action: 'push_opportunity_deal',
      status: 'success',
      summary: `Pushed opportunity "${opportunity.opportunity_title}" to HubSpot as deal ${deal.id}`,
      evidence: { opportunity_id, deal_id: deal.id, industry: opportunity.industry }
    });

    return Response.json({ status: 'success', deal_id: deal.id, opportunity_id });
  } catch (error) {
    console.error('pushOpportunityToHubSpot error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}