import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { site_url, seo_project_id, days_back } = body;

    if (!site_url) return Response.json({ error: 'site_url required' }, { status: 400 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('google_search_console');

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    const cleanUrl = site_url.replace(/\/$/, '');
    const encodedUrl = encodeURIComponent(cleanUrl);
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - (days_back || 28) * 86400000).toISOString().split('T')[0];

    // Query search analytics by query (keywords)
    const queryRes = await fetch(`https://searchconsole.googleapis.com/v1/sites/${encodedUrl}/searchAnalytics/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: 100,
      }),
    });

    const queryData = await queryRes.json();
    const rows = queryData.rows || [];

    let totalClicks = 0, totalImpressions = 0, totalPosition = 0;
    const topQueries = rows.map((row: any) => ({
      query: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: (row.ctr * 100).toFixed(2) + '%',
      position: parseFloat(row.position.toFixed(1)),
    }));

    rows.forEach((row: any) => {
      totalClicks += row.clicks;
      totalImpressions += row.impressions;
      totalPosition += row.position * row.impressions;
    });

    const avgPosition = totalImpressions > 0 ? parseFloat((totalPosition / totalImpressions).toFixed(1)) : 0;
    const ctr = totalImpressions > 0 ? parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;

    // Get page-level data
    const pagesRes = await fetch(`https://searchconsole.googleapis.com/v1/sites/${encodedUrl}/searchAnalytics/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ['page'],
        rowLimit: 50,
      }),
    });
    const pagesData = await pagesRes.json();
    const topPages = (pagesData.rows || []).map((row: any) => ({
      page: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      position: parseFloat(row.position.toFixed(1)),
    }));

    const indexedPages = topPages.length;

    const rankingData = {
      totalClicks,
      totalImpressions,
      avgPosition,
      ctr,
      topQueries: topQueries.slice(0, 20),
      topPages,
      indexedPages,
      startDate,
      endDate,
    };

    if (seo_project_id) {
      await base44.asServiceRole.entities.SEOProject.update(seo_project_id, {
        ranking_data: rankingData,
        last_ranking_check: new Date().toISOString(),
        pages_indexed: indexedPages,
        total_clicks: totalClicks,
        total_impressions: totalImpressions,
        avg_position: avgPosition,
        ctr,
        status: 'ranking',
      });
    }

    return Response.json({ rankingData, site_url });
  } catch (error) {
    console.error('seoTrackRankings error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}