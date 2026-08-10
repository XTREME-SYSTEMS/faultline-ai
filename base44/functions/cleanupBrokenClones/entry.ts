import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { deriveNameFromUrl, findParentId, traceBenchmarkUrl } from '../../shared/cloneUtils.ts';

// Cleanup Broken Clones — deletes all LaunchProjects below 100/100 parity,
// saving their target URLs + metadata to CloneQueue records so they can be
// re-cloned later through the hardened queue system.
// Keeps only clones at 100/100 (the "good" ones).

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const dryRun = !!body.dry_run;

    const projects = await base44.asServiceRole.entities.LaunchProject.filter(
      { organization_id: orgId }, '-created_date', 500
    );

    const projectMap = new Map(projects.map(p => [p.id, p]));

    const good = [];
    const broken = [];

    for (const p of projects) {
      const hasUrl = p.vercel_deployment_url || p.metadata?.vercel_deployment_url;
      const score = p.parity_score || 0;
      const targetUrl = p.benchmark_url || traceBenchmarkUrl(p, projectMap) || p.metadata?.target_url;

      if (score >= 100 && hasUrl) {
        good.push({ id: p.id, name: p.project_name, score, url: hasUrl, target_url: targetUrl });
      } else {
        broken.push({
          id: p.id,
          name: p.project_name,
          score,
          url: hasUrl,
          target_url: targetUrl,
          industry: p.industry || p.metadata?.target_dna?.industry || 'Uncategorized',
          business_name: p.business_name,
        });
      }
    }

    if (dryRun) {
      return Response.json({
        status: 'dry_run',
        good_count: good.length,
        broken_count: broken.length,
        good: good.map(g => ({ name: g.name, score: g.score, url: g.url })),
        broken: broken.map(b => ({ name: b.name, score: b.score, target_url: b.target_url, industry: b.industry })),
      });
    }

    // Save broken clones to CloneQueue (only those with a target_url)
    const queueItems = broken
      .filter(b => b.target_url)
      .map(b => ({
        organization_id: orgId,
        target_url: b.target_url,
        site_name: b.business_name || deriveNameFromUrl(b.target_url) || b.name || 'Unknown',
        industry: b.industry || 'Uncategorized',
        priority: 'medium',
        status: 'queued',
        source: 'cleanup',
        original_clone_id: b.id,
        notes: `Re-clone from cleanup. Original score: ${b.score}/100. Original name: ${b.name}`,
      }));

    let savedToQueue = [];
    if (queueItems.length > 0) {
      try {
        const created = await base44.asServiceRole.entities.CloneQueue.bulkCreate(queueItems);
        savedToQueue = Array.isArray(created) ? created : [created];
      } catch (e) {
        console.error('bulkCreate CloneQueue failed:', e.message);
      }
    }

    const deletedWithoutUrl = broken.filter(b => !b.target_url);

    // Delete all broken LaunchProjects
    const brokenIds = broken.map(b => b.id);
    let deletedCount = 0;
    if (brokenIds.length > 0) {
      try {
        for (let i = 0; i < brokenIds.length; i += 50) {
          const batch = brokenIds.slice(i, i + 50);
          await base44.asServiceRole.entities.LaunchProject.deleteMany({ id: { $in: batch } });
          deletedCount += batch.length;
        }
      } catch (e) {
        console.error('deleteMany failed:', e.message);
      }
    }

    try {
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId, system: 'cleanup_broken_clones', action: 'cleanup',
        status: 'success',
        summary: `Cleanup: kept ${good.length} good clones, deleted ${deletedCount} broken, saved ${savedToQueue.length} to re-clone queue`,
        evidence: { good_count: good.length, broken_count: broken.length, deleted: deletedCount, saved_to_queue: savedToQueue.length, deleted_without_url: deletedWithoutUrl.length },
      });
    } catch (e) { /* ignore */ }

    return Response.json({
      status: 'completed',
      good_count: good.length,
      broken_count: broken.length,
      deleted: deletedCount,
      saved_to_queue: savedToQueue.length,
      deleted_without_url: deletedWithoutUrl.length,
      good_clones: good.map(g => ({ id: g.id, name: g.name, score: g.score, url: g.url, target_url: g.target_url })),
      saved_to_queue_list: savedToQueue.map(q => ({ id: q.id, target_url: q.target_url, site_name: q.site_name, industry: q.industry })),
    });
  } catch (error) {
    console.error('cleanupBrokenClones error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}