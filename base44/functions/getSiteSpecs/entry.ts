import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Get Site Specs — returns the full specification data for a cloned site:
// the benchmark discovery report (financial, strategy, niche, stack, target
// market, AI enhancement, profit margin, customer base, monetization), the
// LaunchProject metadata, and the CloneQueue audit data.
//
// Powers the "Site Specs" button on each Clone Gallery card.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const url = new URL(req.url);
    const launchProjectId = url.searchParams.get('launch_project_id');
    const cloneQueueId = url.searchParams.get('clone_queue_id');

    if (!launchProjectId && !cloneQueueId) {
      return Response.json({ error: 'launch_project_id or clone_queue_id required' }, { status: 400 });
    }

    let launchProject = null;
    let cloneQueue = null;

    if (launchProjectId) {
      try {
        launchProject = await base44.asServiceRole.entities.LaunchProject.get(launchProjectId);
      } catch (e) { /* not found */ }
    }

    // Find the CloneQueue item that produced this launch project
    if (launchProject) {
      const queueItems = await base44.asServiceRole.entities.CloneQueue.filter(
        { organization_id: orgId, launch_project_id: launchProjectId }, '-created_date', 1
      );
      if (queueItems.length > 0) cloneQueue = queueItems[0];
    } else if (cloneQueueId) {
      try {
        cloneQueue = await base44.asServiceRole.entities.CloneQueue.get(cloneQueueId);
      } catch (e) { /* not found */ }
    }

    // Build the specs object
    const targetUrl = launchProject?.benchmark_url || cloneQueue?.target_url || launchProject?.metadata?.target_url || '';
    const industry = launchProject?.industry || cloneQueue?.industry || 'Uncategorized';
    const siteName = launchProject?.project_name || cloneQueue?.site_name || 'Unknown';
    const vercelUrl = launchProject?.vercel_deployment_url || cloneQueue?.vercel_url || '';

    // The benchmark report — stored on either the CloneQueue or the LaunchProject metadata
    const benchmarkReport = cloneQueue?.benchmark_report ||
      launchProject?.benchmark_report ||
      launchProject?.metadata?.benchmark_report ||
      null;

    // If we don't have a benchmark report yet, generate one on the fly
    let report = benchmarkReport;
    if (!report && targetUrl) {
      try {
        const benchRes = await base44.functions.invoke('discoverBenchmarkSite', {
          target_url: targetUrl,
          industry,
          business_name: siteName,
          launch_project_id: launchProjectId,
        });
        const benchData = benchRes?.data || benchRes;
        report = benchData?.report || benchData || null;

        // Cache it on the launch project for next time
        if (report && launchProjectId) {
          base44.asServiceRole.entities.LaunchProject.update(launchProjectId, {
            benchmark_report: report,
          }).catch(() => {});
        }
      } catch (e) {
        console.error('discoverBenchmarkSite failed:', e.message);
      }
    }

    // Assemble the full specs
    const specs = {
      site_name: siteName,
      industry,
      target_url: targetUrl,
      vercel_url: vercelUrl,
      parity_score: launchProject?.parity_score || cloneQueue?.final_score || 0,
      operational_score: launchProject?.operational_score || 0,
      test_score: launchProject?.test_score || 0,
      audit_passed: cloneQueue?.audit_passed || false,
      audit_summary: cloneQueue?.audit_summary || '',
      tech_stack: launchProject?.metadata?.target_dna?.techStack ||
        launchProject?.metadata?.target_dna?.stack || [],
      full_stack: {
        frontend: launchProject?.metadata?.target_dna?.frontend || 'Unknown',
        backend: launchProject?.metadata?.target_dna?.backend || 'Inferred (Base44)',
        database: launchProject?.metadata?.target_dna?.database || 'Supabase',
        hosting: 'Vercel',
        cms: launchProject?.metadata?.target_dna?.cms || 'None',
      },
      benchmark: report || {
        overview: 'Benchmark report not yet generated for this site.',
        industry,
        target_url: targetUrl,
      },
      estimated_roi: report?.estimated_roi || report?.profit_margin || 'Not yet calculated',
      target_market: report?.target_market || launchProject?.metadata?.target_dna?.target_audience || 'Unknown',
      monetization: report?.monetization || report?.revenue_model || 'Unknown',
      profit_margin: report?.profit_margin || 'Not yet calculated',
      customer_base: report?.customer_base || 'Not yet analyzed',
      key_features: launchProject?.metadata?.target_dna?.features || report?.key_features || [],
      nav_structure: launchProject?.metadata?.target_dna?.nav || [],
      colors: {
        primary: launchProject?.metadata?.target_dna?.primary,
        secondary: launchProject?.metadata?.target_dna?.secondary,
      },
      created_date: launchProject?.created_date || cloneQueue?.created_date,
    };

    return Response.json({ status: 'success', specs });
  } catch (error) {
    console.error('getSiteSpecs error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}