// Download Asset — provides download access for subscribers and one-time
// purchasers. This is the backend for the "Unlimited Downloads" workflow:
// subscribers (Growth Plan / Operating System Plan) can download ANY asset
// without individual checkout. One-time purchasers can download assets
// they've specifically purchased.
//
// Flow:
// 1. Check if the user has an active subscription (AssetLicense with
//    license_type='subscription' and status='active')
// 2. If subscriber → provide download URL, increment download_count
// 3. If not → check for one-time purchase (AssetLicense with asset_id match)
// 4. If purchased → provide download URL, increment download_count
// 5. If neither → return 402 with checkout URL

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { asset_id, customer_email } = body;

    if (!asset_id) return Response.json({ error: 'asset_id required' }, { status: 400 });
    if (!customer_email) return Response.json({ error: 'customer_email required' }, { status: 400 });

    // 1. Find the asset
    let asset: any = null;
    try {
      const assets = await base44.asServiceRole.entities.EnvatoAsset.filter({ id: asset_id });
      asset = assets[0];
    } catch (e) {
      // Invalid ID format or not found
    }
    if (!asset) return Response.json({ error: 'Asset not found', asset_id }, { status: 404 });

    // 2. Check for active subscription (blanket access to all assets)
    const subscriptionLicenses = await base44.asServiceRole.entities.AssetLicense.filter({
      customer_email,
      license_type: 'subscription',
      status: 'active',
    });
    const hasSubscription = subscriptionLicenses.length > 0;

    // 3. Check for one-time purchase of this specific asset
    const oneTimeLicenses = await base44.asServiceRole.entities.AssetLicense.filter({
      customer_email,
      asset_id,
      license_type: 'one_time',
      status: 'active',
    });
    const hasOneTimePurchase = oneTimeLicenses.length > 0;

    if (!hasSubscription && !hasOneTimePurchase) {
      // No access — return checkout URL
      const appId = Deno.env.get('BASE44_APP_ID');
      const checkoutUrl = `https://base44.app/api/apps/${appId}/functions/createStoreCheckout`;
      return Response.json({
        error: 'No active license',
        checkout_url: checkoutUrl,
        asset_name: asset.name,
        asset_price: asset.price || 29,
        status: 'payment_required',
      }, { status: 402 });
    }

    // 4. Grant download — increment download count on the license
    const license = hasSubscription ? subscriptionLicenses[0] : oneTimeLicenses[0];
    await base44.asServiceRole.entities.AssetLicense.update(license.id, {
      download_count: (license.download_count || 0) + 1,
      last_downloaded_at: new Date().toISOString(),
    });

    // 5. Return download URL
    // For subscription downloads, use the asset's file_url directly.
    // For one-time purchases, use the asset's file_url.
    // In production, this would be a signed URL with expiry.
    const downloadUrl = asset.file_url || asset.preview_url || asset.thumbnail_url || '';

    return Response.json({
      status: 'success',
      download_url: downloadUrl,
      asset_name: asset.name,
      asset_category: asset.category,
      license_type: hasSubscription ? 'subscription' : 'one_time',
      download_count: (license.download_count || 0) + 1,
      max_downloads: license.max_downloads || 999999,
      remaining_downloads: hasSubscription ? 'unlimited' : Math.max(0, (license.max_downloads || 50) - ((license.download_count || 0) + 1)),
    });
  } catch (error) {
    console.error('[downloadAsset] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}