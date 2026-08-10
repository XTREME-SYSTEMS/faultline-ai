import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    const projects = await base44.asServiceRole.entities.SEOProject.filter({
      autonomous_enabled: true,
    }, '-created_date', 50);

    const results = [];

    for (const project of projects) {
      try {
        const result: Record<string, any> = { site_url: project.site_url, site_name: project.site_name, steps: [] };

        // Step 1: Crawl site
        const crawlRes = await base44.functions.invoke('seoCrawlSite', {
          site_url: project.site_url,
          seo_project_id: project.id,
        });
        result.steps.push({ step: 'crawl', success: !crawlRes.data?.error });
        if (crawlRes.data?.error) result.steps[0].error = crawlRes.data.error;

        // Step 2: Generate tags
        const tagsRes = await base44.functions.invoke('seoGenerateTags', {
          site_url: project.site_url,
          site_name: project.site_name,
          description: project.description,
          target_keywords: project.target_keywords,
          seo_project_id: project.id,
          crawl_report: crawlRes.data?.audit,
        });
        result.steps.push({ step: 'generate_tags', success: !tagsRes.data?.error });

        // Step 3: Setup GA (if not done)
        let measurementId = project.ga_measurement_id;
        if (!measurementId) {
          const gaRes = await base44.functions.invoke('seoSetupAnalytics', {
            site_url: project.site_url,
            site_name: project.site_name,
            seo_project_id: project.id,
          });
          result.steps.push({ step: 'setup_analytics', success: !gaRes.data?.error });
          if (gaRes.data?.measurementId) measurementId = gaRes.data.measurementId;
        }

        // Step 4: Inject tags (if GitHub repo available)
        if (project.github_repo_url) {
          const injectRes = await base44.functions.invoke('seoInjectTags', {
            seo_project_id: project.id,
            github_repo_url: project.github_repo_url,
            site_url: project.site_url,
            generated_tags: tagsRes.data?.generatedTags,
            ga_measurement_id: measurementId,
          });
          result.steps.push({ step: 'inject_tags', success: !injectRes.data?.error });
        }

        // Step 5: Submit to Search Console
        const scRes = await base44.functions.invoke('seoSubmitToSearchConsole', {
          site_url: project.site_url,
          sitemap_url: project.sitemap_url || project.site_url.replace(/\/$/, '') + '/sitemap.xml',
          seo_project_id: project.id,
        });
        result.steps.push({ step: 'submit_search_console', success: !scRes.data?.error });

        // Step 6: Track rankings
        const rankRes = await base44.functions.invoke('seoTrackRankings', {
          site_url: project.site_url,
          seo_project_id: project.id,
        });
        result.steps.push({ step: 'track_rankings', success: !rankRes.data?.error });

        results.push(result);
      } catch (err: any) {
        results.push({ site_url: project.site_url, site_name: project.site_name, error: err.message });
      }
    }

    return Response.json({
      processed: results.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('autonomousSEOEngine error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}