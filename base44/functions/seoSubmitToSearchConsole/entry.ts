import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { site_url, sitemap_url, seo_project_id } = body;

    if (!site_url) return Response.json({ error: 'site_url required' }, { status: 400 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('google_search_console');

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    const cleanUrl = site_url.replace(/\/$/, '');
    const encodedUrl = encodeURIComponent(cleanUrl);
    const results: Record<string, any> = { added: false, sitemapSubmitted: false, indexingRequested: false };

    // Step 1: Add site to Search Console
    const addRes = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodedUrl}`, {
      method: 'PUT',
      headers,
    });
    results.added = addRes.ok;
    if (!addRes.ok) {
      const err = await addRes.json().catch(() => ({}));
      results.addError = err.error?.message || `HTTP ${addRes.status}`;
    }

    // Step 2: Submit sitemap
    const sitemapPath = (sitemap_url || cleanUrl + '/sitemap.xml').replace(cleanUrl + '/', '').replace(cleanUrl, '');
    const cleanSitemapPath = sitemapPath.replace(/^\/+/, '');
    const submitSitemapRes = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodedUrl}/sitemaps/${encodeURIComponent(cleanSitemapPath)}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({ path: cleanSitemapPath }),
      }
    );
    results.sitemapSubmitted = submitSitemapRes.ok;
    if (!submitSitemapRes.ok) {
      const err = await submitSitemapRes.json().catch(() => ({}));
      results.sitemapError = err.error?.message || `HTTP ${submitSitemapRes.status}`;
    }

    // Step 3: Request indexing for the homepage
    const inspectRes = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        inspectionUrl: cleanUrl,
        siteUrl: cleanUrl,
        languageCode: 'en-US',
      }),
    });
    results.indexingRequested = inspectRes.ok;
    if (inspectRes.ok) {
      const inspectData = await inspectRes.json();
      results.indexStatus = inspectData.inspectionResult?.indexStatusResult;
    }

    if (seo_project_id) {
      await base44.asServiceRole.entities.SEOProject.update(seo_project_id, {
        search_console_verified: results.added,
        sitemap_submitted: results.sitemapSubmitted,
        status: 'monitoring',
      });
    }

    return Response.json({ success: true, results, site_url });
  } catch (error) {
    console.error('seoSubmitToSearchConsole error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}