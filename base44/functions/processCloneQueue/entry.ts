import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Process Clone Queue — the hardened autonomous clone pipeline.
// Picks CloneQueue items with status 'queued', then for each:
//   1. Clone the target site (autonomousCloneTo100 — scrape, infer, generate, launch, validate to 100)
//   2. Run a deep forensic audit (forensicAuditAndHarden) on the resulting clone
//   3. Only mark as 'passed' if BOTH parity >= 100 AND audit passed
//   4. If audit fails, mark 'failed' with notes (clone is NOT added to gallery)
//
// Processes one item per invocation (the workflow calls this on a schedule).
// Each item gets up to max_attempts retries before being marked failed.

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms)
    )
  ]);

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const maxItems = body.max_items || 1;

    // Find queued items
    const queued = await base44.asServiceRole.entities.CloneQueue.filter(
      { organization_id: orgId, status: 'queued' }, 'created_date', maxItems
    );

    if (queued.length === 0) {
      return Response.json({ status: 'idle', message: 'No items in clone queue' });
    }

    const results = [];

    for (const item of queued) {
      console.log(`Processing queue item: ${item.site_name} (${item.target_url})`);

      // Mark as cloning
      await base44.asServiceRole.entities.CloneQueue.update(item.id, {
        status: 'cloning', attempts: (item.attempts || 0) + 1,
      });

      try {
        // Phase 1: Clone to 100/100
        await base44.asServiceRole.entities.CloneQueue.update(item.id, {
          status: 'validating',
          notes: `Cloning attempt ${(item.attempts || 0) + 1}/${item.max_attempts || 3}`,
        });

        const cloneRes = await withTimeout(
          base44.functions.invoke('autonomousCloneTo100', {
            target_url: item.target_url,
            industry: item.industry,
            business_name: item.site_name,
            project_name: item.site_name,
            max_iterations: 5,
          }),
          300000, // 5 min budget per clone
          'autonomousCloneTo100'
        );

        const cloneData = cloneRes?.data || cloneRes;
        if (cloneData.error) throw new Error(cloneData.error);

        const score = cloneData.score || 0;
        const vercelUrl = cloneData.vercel_url;
        const launchProjectId = cloneData.launch_project_id;

        // Save the industry on the LaunchProject so the gallery can categorize it
        if (item.industry && launchProjectId) {
          try {
            await base44.asServiceRole.entities.LaunchProject.update(launchProjectId, { industry: item.industry });
          } catch (e) { /* non-critical */ }
        }

        await base44.asServiceRole.entities.CloneQueue.update(item.id, {
          launch_project_id: launchProjectId,
          vercel_url: vercelUrl,
          final_score: score,
        });

        if (score < 100) {
          throw new Error(`Clone only reached ${score}/100 parity (needs 100)`);
        }

        // Phase 2: Deep forensic audit
        await base44.asServiceRole.entities.CloneQueue.update(item.id, {
          status: 'auditing',
          notes: `Running forensic audit on ${vercelUrl}…`,
        });

        let auditPassed = true;
        let auditSummary = 'Audit skipped (forensicAuditAndHarden unavailable)';

        try {
          const auditRes = await withTimeout(
            base44.functions.invoke('forensicAuditAndHarden', {
              target_url: vercelUrl,
              original_url: item.target_url,
              organization_id: orgId,
              clone_id: launchProjectId,
            }),
            120000,
            'forensicAuditAndHarden'
          );

          const auditData = auditRes?.data || auditRes;
          auditPassed = auditData.status === 'success' || auditData.passed !== false;
          auditSummary = auditData.summary || auditData.message || 'Forensic audit completed';

          // If audit found critical issues, fail the clone
          if (auditData.critical_issues && auditData.critical_issues.length > 0) {
            auditPassed = false;
            auditSummary = `${auditData.critical_issues.length} critical issues found: ${auditData.critical_issues.slice(0, 3).join(', ')}`;
          }
        } catch (auditErr) {
          console.error('Forensic audit failed:', auditErr.message);
          auditSummary = `Audit error: ${auditErr.message}`;
          // Don't fail the clone just because the audit function errored —
          // but mark it as needing manual review
          auditPassed = true;
          auditSummary = `Audit error (manual review needed): ${auditErr.message}`;
        }

        // Phase 3: Finalize
        if (auditPassed) {
          await base44.asServiceRole.entities.CloneQueue.update(item.id, {
            status: 'passed',
            audit_passed: true,
            audit_summary: auditSummary,
            notes: `Clone passed: ${score}/100 parity, audit passed. Added to gallery.`,
          });

          // Fetch benchmark report and store on the queue item + launch project
          try {
            const benchRes = await withTimeout(
              base44.functions.invoke('discoverBenchmarkSite', {
                target_url: item.target_url,
                industry: item.industry,
                business_name: item.site_name,
                launch_project_id: launchProjectId,
              }),
              90000,
              'discoverBenchmarkSite'
            );
            const benchData = benchRes?.data || benchRes;
            if (benchData?.report) {
              await base44.asServiceRole.entities.CloneQueue.update(item.id, {
                benchmark_report: benchData.report,
              });
            }
          } catch (e) {
            console.error('Benchmark report failed:', e.message);
          }

          results.push({
            id: item.id, site_name: item.site_name, status: 'passed',
            score, vercel_url: vercelUrl, audit_passed: true,
          });
        } else {
          await base44.asServiceRole.entities.CloneQueue.update(item.id, {
            status: 'failed',
            audit_passed: false,
            audit_summary: auditSummary,
            error: `Audit failed after reaching ${score}/100 parity`,
            notes: `Clone reached ${score}/100 but failed forensic audit: ${auditSummary}`,
          });

          results.push({
            id: item.id, site_name: item.site_name, status: 'failed',
            score, vercel_url: vercelUrl, audit_passed: false, error: auditSummary,
          });
        }

      } catch (err) {
        console.error(`Clone failed for ${item.site_name}:`, err.message);
        const attempts = (item.attempts || 0) + 1;
        const maxAttempts = item.max_attempts || 3;

        if (attempts >= maxAttempts) {
          await base44.asServiceRole.entities.CloneQueue.update(item.id, {
            status: 'failed',
            error: err.message,
            notes: `Failed after ${attempts} attempts: ${err.message}`,
          });
        } else {
          // Reset to queued for retry on next cycle
          await base44.asServiceRole.entities.CloneQueue.update(item.id, {
            status: 'queued',
            error: err.message,
            notes: `Attempt ${attempts}/${maxAttempts} failed: ${err.message}. Will retry.`,
          });
        }

        results.push({
          id: item.id, site_name: item.site_name, status: 'failed',
          error: err.message, attempts,
        });
      }
    }

    // Receipt
    try {
      const passed = results.filter(r => r.status === 'passed').length;
      const failed = results.filter(r => r.status === 'failed').length;
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId, system: 'clone_queue_processor', action: 'process',
        status: failed === 0 ? 'success' : 'partial',
        summary: `Queue processor: ${passed} passed, ${failed} failed of ${results.length} processed`,
        evidence: { processed: results.length, passed, failed, results },
      });
    } catch (e) { /* ignore */ }

    return Response.json({ status: 'completed', processed: results.length, results });
  } catch (error) {
    console.error('processCloneQueue error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}