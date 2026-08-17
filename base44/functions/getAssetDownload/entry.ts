import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Returns a signed download URL for an asset, after verifying the caller has
// an active license. Called by the cloned site's download buttons.
// Looks up the license by (customer_email + asset_id) or by license_key.

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
    const { asset_id, customer_email, license_key } = body;

    if (!asset_id || (!customer_email && !license_key)) {
      return Response.json({ error: 'asset_id and (customer_email or license_key) required' }, { status: 400, headers: CORS });
    }

    // Find the license
    let licenses: any[] = [];
    if (license_key) {
      licenses = await base44.asServiceRole.entities.AssetLicense.filter({ license_key, asset_id });
    }
    if ((!licenses || licenses.length === 0) && customer_email) {
      licenses = await base44.asServiceRole.entities.AssetLicense.filter({ asset_id, customer_email });
    }

    if (!licenses || licenses.length === 0) {
      return Response.json({ error: 'No active license found for this asset. Purchase required.' }, { status: 403, headers: CORS });
    }

    const license = licenses[0];
    if (license.status !== 'active') {
      return Response.json({ error: `License is ${license.status}. Purchase required.` }, { status: 403, headers: CORS });
    }
    if (license.expires_at && new Date(license.expires_at) < new Date()) {
      return Response.json({ error: 'License expired. Please renew your subscription.' }, { status: 403, headers: CORS });
    }
    if (license.download_count >= license.max_downloads) {
      return Response.json({ error: 'Download limit reached for this license.' }, { status: 403, headers: CORS });
    }

    // Get the asset
    const asset = await base44.asServiceRole.entities.EnvatoAsset.get(asset_id);
    if (!asset || !asset.file_url) {
      return Response.json({ error: 'Asset file not available' }, { status: 404, headers: CORS });
    }

    // Refresh the signed URL (existing one may have expired)
    let downloadUrl = asset.file_url;
    if (downloadUrl.startsWith('media://')) {
      try {
        const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
          file_uri: downloadUrl,
          expires_in: 3600, // 1 hour
        });
        downloadUrl = signed.signed_url || downloadUrl;
      } catch {}
    }

    // Increment download count on the license
    await base44.asServiceRole.entities.AssetLicense.update(license.id, {
      download_count: (license.download_count || 0) + 1,
      last_downloaded_at: new Date().toISOString(),
    }).catch(() => {});

    return Response.json({
      download_url: downloadUrl,
      license_key: license.license_key,
      asset_name: asset.name,
      file_format: asset.file_format,
      file_size_mb: asset.file_size_mb,
      downloads_remaining: license.max_downloads - (license.download_count || 0) - 1,
    }, { headers: CORS });
  } catch (e) {
    console.error('getAssetDownload error:', e.message);
    return Response.json({ error: e.message }, { status: 500, headers: CORS });
  }
}