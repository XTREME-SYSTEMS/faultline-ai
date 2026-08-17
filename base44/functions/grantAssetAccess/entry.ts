import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

// Called by stripeWebhook after a successful checkout.session.completed.
// Grants the customer download access to the purchased asset(s).
// Creates an AssetLicense record with a unique license key and returns the
// download URL. Also increments the asset's download count.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const {
      asset_id,
      customer_email,
      customer_name,
      stripe_session_id,
      stripe_customer_id,
      license_type = 'one_time',
      organization_id,
    } = body;

    if (!asset_id || !customer_email) {
      return Response.json({ error: 'asset_id and customer_email required' }, { status: 400, headers: CORS });
    }

    // Look up the asset
    const asset = await base44.asServiceRole.entities.EnvatoAsset.get(asset_id);
    if (!asset) {
      return Response.json({ error: 'Asset not found' }, { status: 404, headers: CORS });
    }

    // Check if a license already exists for this email + asset (avoid duplicates on webhook retries)
    const existing = await base44.asServiceRole.entities.AssetLicense.filter({
      asset_id,
      customer_email,
    });
    if (existing && existing.length > 0) {
      const lic = existing[0];
      return Response.json({
        status: 'already_licensed',
        license_key: lic.license_key,
        download_url: lic.download_url,
        asset_name: asset.name,
      }, { headers: CORS });
    }

    // Generate a unique license key
    const licenseKey = `AIAF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    // Create a signed download URL from the asset's file_url (if it's a private file)
    let downloadUrl = asset.file_url || '';
    if (downloadUrl && downloadUrl.startsWith('media://')) {
      try {
        const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
          file_uri: downloadUrl,
          expires_in: 86400, // 24 hours
        });
        downloadUrl = signed.signed_url || downloadUrl;
      } catch {}
    }

    // Create the license record
    const license = await base44.asServiceRole.entities.AssetLicense.create({
      organization_id: organization_id || asset.organization_id || 'stripe',
      asset_id,
      asset_name: asset.name,
      asset_category: asset.category,
      customer_email,
      customer_name: customer_name || '',
      stripe_session_id: stripe_session_id || '',
      stripe_customer_id: stripe_customer_id || '',
      license_type,
      license_key: licenseKey,
      download_url: downloadUrl,
      download_count: 0,
      max_downloads: license_type === 'subscription' ? 9999 : 50,
      status: 'active',
      activated_at: new Date().toISOString(),
      expires_at: license_type === 'subscription'
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // Increment the asset's download count
    await base44.asServiceRole.entities.EnvatoAsset.update(asset_id, {
      downloads_count: (asset.downloads_count || 0) + 1,
    }).catch(() => {});

    // Send the customer their license key + download link via email
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: customer_email,
        subject: `Your download: ${asset.name}`,
        body: `Hi ${customer_name || 'there'},

Your purchase is complete! Here are your download details:

Asset: ${asset.name}
Category: ${asset.category}
License Key: ${licenseKey}
License Type: ${license_type}

Download Link: ${downloadUrl}

Your license key is valid for ${license_type === 'subscription' ? '30 days' : '365 days'} and allows up to ${license_type === 'subscription' ? 'unlimited' : '50'} downloads.

Thank you for your purchase!

— AI App Factory`,
      });
    } catch (e) {
      console.error('License email failed:', e.message);
    }

    return Response.json({
      status: 'granted',
      license_id: license.id,
      license_key: licenseKey,
      download_url: downloadUrl,
      asset_name: asset.name,
      expires_at: license.expires_at,
    }, { headers: CORS });
  } catch (e) {
    console.error('grantAssetAccess error:', e.message);
    return Response.json({ error: e.message }, { status: 500, headers: CORS });
  }
}