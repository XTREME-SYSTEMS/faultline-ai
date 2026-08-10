import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { site_url, site_name, seo_project_id } = body;

    if (!site_url) return Response.json({ error: 'site_url required' }, { status: 400 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('google_analytics');

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    // Step 1: List accounts
    const accountsRes = await fetch('https://analyticsadmin.googleapis.com/v1beta/accounts', { headers });
    const accountsData = await accountsRes.json();
    const accounts = accountsData.accounts || [];

    if (accounts.length === 0) {
      return Response.json({
        error: 'No Google Analytics accounts found. Create one at analytics.google.com first.',
      }, { status: 400 });
    }

    const account = accounts[0];
    const accountName = account.name;

    // Step 2: Create GA4 property
    const propertyRes = await fetch('https://analyticsadmin.googleapis.com/v1beta/properties', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        parent: accountName,
        displayName: (site_name || site_url.replace(/^https?:\/\//, '').replace(/\/$/, '')).slice(0, 50),
        timeZone: 'America/New_York',
        currencyCode: 'USD',
      }),
    });

    if (!propertyRes.ok) {
      const err = await propertyRes.json().catch(() => ({}));
      return Response.json({ error: `Failed to create GA4 property: ${err.error?.message || propertyRes.status}` }, { status: 500 });
    }

    const property = await propertyRes.json();
    const propertyId = property.name.split('/')[1];

    // Step 3: Create web data stream
    const streamRes = await fetch(`https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}/dataStreams`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type: 'WEB_DATA_STREAM',
        displayName: 'Web Stream',
        webStreamData: {
          defaultUri: site_url.replace(/^https?:\/\//, '').replace(/\/$/, ''),
        },
      }),
    });

    if (!streamRes.ok) {
      const err = await streamRes.json().catch(() => ({}));
      return Response.json({ error: `Failed to create data stream: ${err.error?.message || streamRes.status}` }, { status: 500 });
    }

    const stream = await streamRes.json();
    const measurementId = stream.webStreamData?.measurementId;

    if (seo_project_id) {
      await base44.asServiceRole.entities.SEOProject.update(seo_project_id, {
        ga_property_id: propertyId,
        ga_measurement_id: measurementId,
      });
    }

    return Response.json({
      success: true,
      propertyId,
      measurementId,
      propertyName: property.displayName,
      streamId: stream.name,
    });
  } catch (error) {
    console.error('seoSetupAnalytics error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}