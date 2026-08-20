import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { computeClosureMetrics, getLowestCategory, getValidOfficialNavigableNodes } from '../../shared/closureMetricEngine.ts';

// Overnight Heartbeat — the autonomous operating loop's central pulse.
// Runs every 5 minutes via the Continuous Improvement Heartbeat workflow.
//
// Each beat executes the full P1-P14 directive cycle:
//   DISCOVER → NORMALIZE → CLASSIFY → VALIDATE → GAP → REPAIR → POPULATE → TEST → RECEIPT → REPEAT
//
// Reports INDEPENDENT coverage scores (P6) — no blended headline:
//   ROUTE_DISCOVERY_COVERAGE
//   ROUTE_TO_TAXONOMY_MATCH
//   TAXONOMY_NODE_VALIDATION
//   TAXONOMY_ROUTE_COVERAGE
//   CONTENT_FAMILY_COVERAGE
//   BACKEND_CAPABILITY_COVERAGE
//   INTERACTION_COVERAGE
//
// Builds a prioritized gap queue (P11) and dispatches the highest safe work packet.
// Tracks delta from previous heartbeat (P13) and opens regression defects (P14).

const BUILD_ID = 'v75-taxonomy-closure-001';
const SOURCE_URL = 'https://elements.envato.com';

const NON_CONTENT_TYPES = new Set(['homepage', 'auth', 'legal', 'help', 'pricing', 'search', 'other']);

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const orgId = body.organization_id || user?.data?.organization_id || 'default';
    const authHeader = req.headers.get('Authorization') || '';

    console.log(`[overnightHeartbeat] Beat at ${new Date().toISOString()} for org ${orgId}`);

    // ─── 0. RECONCILE CANONICAL SOURCE TRUTH (P0) ───────────────────
    let canonicalState: any = null;
    try {
      const appId = Deno.env.get('BASE44_APP_ID');
      const reconcileRes = await fetch(`https://base44.app/api/apps/${appId}/functions/reconcileCanonicalState`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: orgId }),
        signal: AbortSignal.timeout(10000),
      }).catch((e: any) => { console.log(`[overnightHeartbeat] Canonical reconcile skipped: ${e.message}`); return null; });
      if (reconcileRes && reconcileRes.ok) {
        const rData = await reconcileRes.json();
        canonicalState = rData;
        console.log(`[overnightHeartbeat] Canonical state: build=${rData.canonical_build_id}, drift=${rData.drift_detected}`);
      }
    } catch (e) { console.log(`[overnightHeartbeat] Canonical reconcile error: ${e.message}`); }

    // ─── 1. FETCH LATEST CLONE URL ──────────────────────────────────
    const latestProjects = await base44.asServiceRole.entities.LaunchProject.filter(
      { organization_id: orgId }, '-created_date', 5
    ).catch(() => []);
    const passedClone = latestProjects.find(p => p.status === 'passed' && p.vercel_deployment_url);
    const cloneUrl = passedClone?.vercel_deployment_url || latestProjects[0]?.vercel_deployment_url || '';

    // ─── 2. FETCH ALL DATA ───────────────────────────────────────────
    const [routes, taxonomy, capabilities, scores, heartbeats, exclusions, canonical] = await Promise.all([
      base44.asServiceRole.entities.EnvatoPublicSurfaceManifest.filter({ organization_id: orgId }).catch(() => []),
      base44.asServiceRole.entities.EnvatoTaxonomyLedger.filter({ organization_id: orgId }).catch(() => []),
      base44.asServiceRole.entities.BackendCapabilityLedger.filter({ organization_id: orgId }).catch(() => []),
      base44.asServiceRole.entities.MasterQualityScore.filter({ organization_id: orgId }).catch(() => []),
      base44.asServiceRole.entities.HeartbeatReceipt.filter({ organization_id: orgId }).catch(() => []),
      base44.asServiceRole.entities.ExclusionRecord.filter({ organization_id: orgId }).catch(() => []),
      base44.asServiceRole.entities.CanonicalState.filter({ organization_id: orgId }).catch(() => []),
    ]);

    const latestScore = scores.sort((a, b) => new Date(b.run_at || b.created_date).getTime() - new Date(a.run_at || a.created_date).getTime())[0];
    const lastHeartbeat = heartbeats.sort((a, b) => new Date(b.heartbeat_time || b.created_date).getTime() - new Date(a.heartbeat_time || a.created_date).getTime())[0];

    // ─── 3. RUN NORMALIZATION (P1) — inline, fast ───────────────────
    // Normalize routes if any haven't been normalized yet
    const unnormalizedRoutes = routes.filter(r => !r.normalized);
    let preNormMatchRate = lastHeartbeat?.pre_normalization_match_rate || 0;
    let postNormMatchRate = lastHeartbeat?.post_normalization_match_rate || 0;

    if (unnormalizedRoutes.length > 0) {
      console.log(`[overnightHeartbeat] ${unnormalizedRoutes.length} routes need normalization — dispatching normalizeRoutes`);
      await dispatchFunction('normalizeRoutes', { organization_id: orgId }, authHeader);
      // Re-fetch after normalization
      const refetchedRoutes = await base44.asServiceRole.entities.EnvatoPublicSurfaceManifest.filter({ organization_id: orgId }).catch(() => []);
      routes.length = 0;
      routes.push(...refetchedRoutes);
    }

    // ─── 4. RUN ORPHAN CLASSIFICATION (P3) — inline, fast ───────────
    const unclassifiedOrphans = taxonomy.filter(t => !t.orphan_classification || t.orphan_classification === '');
    if (unclassifiedOrphans.length > 0) {
      console.log(`[overnightHeartbeat] ${unclassifiedOrphans.length} orphan nodes need classification — dispatching classifyOrphanTaxonomy`);
      await dispatchFunction('classifyOrphanTaxonomy', { organization_id: orgId }, authHeader);
      const refetchedTaxonomy = await base44.asServiceRole.entities.EnvatoTaxonomyLedger.filter({ organization_id: orgId }).catch(() => []);
      taxonomy.length = 0;
      taxonomy.push(...refetchedTaxonomy);
    }

    // ─── 5. BUILD TAXONOMY GRAPH (P5) — inline, fast ─────────────────
    const ungraphedNodes = taxonomy.filter(t => !t.children || !t.ancestors);
    if (ungraphedNodes.length > 0) {
      console.log(`[overnightHeartbeat] ${ungraphedNodes.length} taxonomy nodes need graph building — dispatching buildTaxonomyGraph`);
      await dispatchFunction('buildTaxonomyGraph', { organization_id: orgId }, authHeader);
      const refetchedTaxonomy = await base44.asServiceRole.entities.EnvatoTaxonomyLedger.filter({ organization_id: orgId }).catch(() => []);
      taxonomy.length = 0;
      taxonomy.push(...refetchedTaxonomy);
    }

    // ─── 6. RUN ROUTE-TAXONOMY VALIDATION (existing) ─────────────────
    let routeTaxonomyMatchRate = 0;
    if (routes.length > 0 && taxonomy.length > 0) {
      try {
        const appId = Deno.env.get('BASE44_APP_ID');
        const validateUrl = `https://base44.app/api/apps/${appId}/functions/validateRoutesAgainstTaxonomy`;
        const validateRes = await fetch(validateUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organization_id: orgId }),
          signal: AbortSignal.timeout(15000),
        }).catch((e: any) => { console.log(`[overnightHeartbeat] Taxonomy validation skipped: ${e.message}`); return null; });
        if (validateRes && validateRes.ok) {
          const vData = await validateRes.json();
          routeTaxonomyMatchRate = vData.validation_rate || 0;
          preNormMatchRate = preNormMatchRate || routeTaxonomyMatchRate;
          postNormMatchRate = routeTaxonomyMatchRate;
          console.log(`[overnightHeartbeat] Route-taxonomy match: ${routeTaxonomyMatchRate}% (${vData.routes_matched} matched, ${vData.routes_no_match} no match)`);
        }
      } catch (e) { console.log(`[overnightHeartbeat] Taxonomy validation error: ${e.message}`); }
    }

    // ─── 7. COMPUTE COVERAGE SCORES VIA SHARED CLOSURE_METRIC_ENGINE ───
    // Single scoring engine shared with updateClosureBoard — no duplicated formulas.
    const validRoutes = routes.filter(r => r.valid !== false);
    const contentRoutes = validRoutes.filter(r => !NON_CONTENT_TYPES.has(r.page_type) && r.route_type === 'content');
    const matchedRoutes = contentRoutes.filter(r => r.taxonomy_validation_status === 'matched');
    const unmatchedRoutes = contentRoutes.filter(r => r.taxonomy_validation_status === 'no_taxonomy_match');

    // Reconcile result has canonical_build_id; entity has canonical_envato_build_id — normalize
    const canonicalStateEntity = canonical[0] || (canonicalState ? {
      ...canonicalState,
      canonical_envato_build_id: canonicalState.canonical_build_id || canonicalState.canonical_envato_build_id,
    } : null);
    const sharedBuildId = canonicalStateEntity?.canonical_envato_build_id || BUILD_ID;

    const categoryMetrics = computeClosureMetrics({
      routes, taxonomy, capabilities, latestScore, latestHeartbeat: lastHeartbeat, canonicalState: canonicalStateEntity, exclusions, buildId: sharedBuildId,
    });

    // Extract metric values by category name
    const metricByCat = (name: string) => categoryMetrics.find(m => m.category === name);
    const routeDiscoveryMetric = metricByCat('ROUTE_DISCOVERY')!;
    const taxonomyRouteMetric = metricByCat('TAXONOMY_ROUTE_COVERAGE')!;
    const contentFamilyMetric = metricByCat('CONTENT_FAMILY_COVERAGE')!;
    const backendImplMetric = metricByCat('BACKEND_IMPLEMENTATION_COVERAGE')!;
    const backendValMetric = metricByCat('BACKEND_VALIDATION_COVERAGE')!;

    const routeDiscoveryCoverage = routeDiscoveryMetric.score;
    const taxonomyRouteCoverage = taxonomyRouteMetric.score;
    const contentFamilyCoverage = contentFamilyMetric.score;
    const backendCapabilityCoverage = backendImplMetric.score;  // implementation for worker selection
    const interactionCoverage = latestScore?.browser_interaction_score || 0;
    const visualScore = latestScore?.visual_parity_score || 0;

    // ROUTE_TO_TAXONOMY_MATCH and TAXONOMY_NODE_VALIDATION are not in the shared engine
    // (they are heartbeat-specific intermediate metrics, not MQG categories)
    const routeToTaxonomyMatch = contentRoutes.length > 0
      ? Math.round((matchedRoutes.length / contentRoutes.length) * 100) : 0;
    const validatedTaxonomyNodes = taxonomy.filter(t =>
      t.orphan_classification && t.orphan_classification !== '' && t.orphan_classification !== 'missing_crawl_evidence'
    );
    const taxonomyNodeValidation = taxonomy.length > 0
      ? Math.round((validatedTaxonomyNodes.length / taxonomy.length) * 100) : 0;

    // P0-5: current_lowest_score = MIN of all category scores with denominator > 0
    const lowestInfo = getLowestCategory(categoryMetrics);
    const currentLowest = lowestInfo.score;
    const currentLowestCategoryName = lowestInfo.category;

    // ─── 8. COMPUTE TAXONOMY NODE CLASSIFICATIONS (P3) ───────────────
    const orphanNodes = taxonomy.filter(t => t.orphan_classification && t.orphan_classification !== 'not_orphan');
    const invalidNodes = taxonomy.filter(t => t.orphan_classification === 'invalid');
    const missingRouteNodes = taxonomy.filter(t =>
      t.orphan_classification === 'valid_leaf_not_discovered' || t.orphan_classification === 'missing_route'
    );
    // P0-4: missingContentNodes uses valid official_navigable_taxonomy (truth-class + not invalid/duplicate/stale/out_of_scope)
    const validOfficialNodes = getValidOfficialNavigableNodes(taxonomy);
    const missingContentNodes = validOfficialNodes.filter(t =>
      t.orphan_classification === 'missing_content' ||
      (t.orphan_classification === 'not_orphan' && !t.content_available && t.content_count === 0)
    );

    // ─── 9. BUILD GAP QUEUE (P11) ────────────────────────────────────
    let gapQueueResult: any = null;
    try {
      const appId = Deno.env.get('BASE44_APP_ID');
      const gapUrl = `https://base44.app/api/apps/${appId}/functions/buildTaxonomyGapQueue`;
      const gapRes = await fetch(gapUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: orgId }),
        signal: AbortSignal.timeout(15000),
      }).catch((e: any) => { console.log(`[overnightHeartbeat] Gap queue skipped: ${e.message}`); return null; });
      if (gapRes && gapRes.ok) {
        gapQueueResult = await gapRes.json();
        console.log(`[overnightHeartbeat] Gap queue: ${gapQueueResult.queue_depth} gaps, next: ${gapQueueResult.next_work_packet?.gap_type || 'none'}`);
      }
    } catch (e) { console.log(`[overnightHeartbeat] Gap queue error: ${e.message}`); }

    // ─── 10. DETERMINE NEXT WORK PACKET (P11/P12) ────────────────────
    // Priority: drive the LOWEST scoring category first (anti-subset-optimization)
    // Gap queue provides the packet, but if it's stuck on already-processed items,
    // fall back to phase-based progression targeting the lowest score
    // P0-4: The LOWEST required MQG category MUST control work selection.
    // Gap queue can only override if it's working on the SAME category or a
    // proven prerequisite. Unrelated 92% route matching must not monopolize the
    // worker while 0% content family exists.
    const CATEGORY_WORKER_MAP: Record<string, { function: string; phase: string }> = {
      CONTENT_FAMILY_COVERAGE: { function: 'autonomousMarketplaceStocker', phase: 'catalog' },
      TAXONOMY_ROUTE_COVERAGE: { function: 'discoverTaxonomy', phase: 'taxonomy' },
      ROUTE_FIDELITY: { function: 'autonomousFullSiteClone', phase: 'repair' },
      ROUTE_DISCOVERY: { function: 'discoverPublicSurface', phase: 'discovery' },
      BACKEND_IMPLEMENTATION_COVERAGE: { function: 'buildBackendCapabilityLedger', phase: 'backend' },
      BACKEND_VALIDATION_COVERAGE: { function: 'proveFullStackChains', phase: 'validation' },
      ROUTE_TO_TAXONOMY_MATCH: { function: 'classifyUnmatchedRoutes', phase: 'taxonomy' },
      TAXONOMY_NODE_VALIDATION: { function: 'classifyOrphanTaxonomy', phase: 'taxonomy' },
    };

    // P0-4: Object-level prerequisites — do NOT require global TAXONOMY_ROUTE_COVERAGE >=99
    // before content-family progress. Each missing content family is evaluated individually:
    // TAXONOMY_NODE_VALID? ROUTE_REQUIRED? ROUTE_AVAILABLE? SOURCE_FAMILY_PROVEN? CONTENT_ALLOWED?
    // This allows content coverage to rise while unrelated taxonomy routes are still being discovered.
    const CATEGORY_PREREQUISITES: Record<string, string[]> = {
      // CONTENT_FAMILY_COVERAGE: no global prerequisite — use object-level checks when selecting node
      TAXONOMY_ROUTE_COVERAGE: ['ROUTE_DISCOVERY'],
      ROUTE_FIDELITY: ['ROUTE_DISCOVERY', 'TAXONOMY_ROUTE_COVERAGE'],
    };

    const lowestCatName = currentLowestCategoryName;
    const lowestCatWorker = CATEGORY_WORKER_MAP[lowestCatName] || { function: 'autonomousMarketplaceStocker', phase: 'catalog' };
    const gapQueueNext = gapQueueResult?.next_work_packet;

    // P0-11: STALLED CONVERGENCE DETECTION — if same category + same target objects +
    // same score for >=2 consecutive completed attempts, stop re-dispatching
    let stalledConvergence = false;
    if (lastHeartbeat && lastHeartbeat.next_work_packet) {
      const lastTarget = lastHeartbeat.next_work_packet?.target_id || lastHeartbeat.next_work_packet?.gap_type;
      const currTarget = gapQueueNext?.target_id || gapQueueNext?.gap_type;
      const sameCategory = lastHeartbeat.phase === lowestCatWorker.phase;
      const sameTarget = lastTarget && currTarget && lastTarget === currTarget;
      const sameScore = lastHeartbeat[currentLowestCategoryName.toLowerCase().replace(/-/g, '_')] === currentLowest;
      if (sameCategory && sameTarget && sameScore && lastHeartbeat.completed_since_last > 0) {
        stalledConvergence = true;
        console.log(`[overnightHeartbeat] STALLED_CONVERGENCE detected: ${lowestCatName} at ${currentLowest}% with same target ${currTarget}`);
      }
    }

    // Check if gap queue is working on the lowest category or its prerequisite
    const gapQueueMatchesLowest = gapQueueNext && (
      gapQueueNext.gap_type === lowestCatName.toLowerCase() ||
      (CATEGORY_PREREQUISITES[lowestCatName] || []).some(prereq =>
        gapQueueNext.gap_type === prereq.toLowerCase() ||
        gapQueueNext.gap_type === 'missing_route_for_valid_node' && prereq === 'TAXONOMY_ROUTE_COVERAGE' ||
        gapQueueNext.gap_type === 'missing_content_family' && prereq === 'CONTENT_FAMILY_COVERAGE'
      )
    );

    let workPacket;
    if (!stalledConvergence && gapQueueMatchesLowest && gapQueueNext?.target_function) {
      // Gap queue is working on the lowest category or its prerequisite — use it
      workPacket = determineWorkPacket({
        routeDiscoveryCoverage, routeToTaxonomyMatch, taxonomyNodeValidation,
        taxonomyRouteCoverage, contentFamilyCoverage, backendCapabilityCoverage,
        interactionCoverage, visualScore, currentLowest,
        routesCount: routes.length, taxonomyCount: taxonomy.length, capabilitiesCount: capabilities.length,
        unmatchedCount: unmatchedRoutes.length, missingRouteCount: missingRouteNodes.length,
        missingContentCount: missingContentNodes.length, gapQueueNext,
      });
    } else {
      // P0-4: Drive the lowest-scoring category directly
      // If stalled, try a different approach for the same category
      let taskMsg = stalledConvergence
        ? `STALLED_CONVERGENCE on ${lowestCatName} — trying alternate approach`
        : `Drive ${lowestCatName} from ${currentLowest}% toward 99%`;

      // P0-3: For CONTENT_FAMILY_COVERAGE, select a specific eligible missing-content taxonomy node
      // P0-4: Object-level prerequisites — find a node that is individually ready:
      //   TAXONOMY_NODE_VALID? (orphan_classification is not_orphan or missing_content)
      //   ROUTE_REQUIRED? (not necessarily — content can be populated without a route)
      //   SOURCE_FAMILY_PROVEN? (source_present = true)
      //   CONTENT_ALLOWED? (node_type is category or subcategory)
      let taxonomyNodeId = null;
      let contentFamilyName = null;
      if (lowestCatName === 'CONTENT_FAMILY_COVERAGE') {
        const eligibleNode = missingContentNodes.find((n: any) =>
          (n.orphan_classification === 'not_orphan' || n.orphan_classification === 'missing_content') &&
          (n.node_type === 'category' || n.node_type === 'subcategory') &&
          n.source_present !== false
        );
        if (eligibleNode) {
          taxonomyNodeId = eligibleNode.taxonomy_node_id;
          contentFamilyName = eligibleNode.node_name;
          console.log(`[overnightHeartbeat] Selected content family: ${contentFamilyName} (${taxonomyNodeId})`);
        } else {
          console.log(`[overnightHeartbeat] No eligible content family nodes ready — all missing content nodes have unmet object-level prerequisites`);
        }
      }

      // P0-1/P0-3: VALIDATE→DEFECT→REPAIR→RETEST loop for BACKEND_VALIDATION_COVERAGE
      // When the lowest category is BACKEND_VALIDATION_COVERAGE:
      //   1. Check for pending defects from previous proveFullStackChains runs
      //   2. If defects exist → dispatch repairBackendChain (not another validator run)
      //   3. If no defects → dispatch proveFullStackChains (full or targeted)
      //   4. If stalled → dispatch targeted chain only (not full validator)
      let targetChain = null;
      let repairDefectId = null;
      if (lowestCatName === 'BACKEND_VALIDATION_COVERAGE') {
        try {
          // Check for pending repair tasks (defects from previous validation)
          // RepairTask uses status='identified' for new defects
          const pendingDefects = await base44.asServiceRole.entities.RepairTask
            .filter({ organization_id: orgId, status: 'identified' })
            .catch(() => []);
          if (pendingDefects.length > 0) {
            // Dispatch repair for the first pending defect
            const firstDefect = pendingDefects[0];
            // Parse chain_id from description format: "[CHAIN-XXX] step: actual"
            const chainMatch = (firstDefect.description || '').match(/\[(CHAIN-[A-Z-]+)\]/);
            targetChain = chainMatch ? chainMatch[1] : 'CHAIN-AUTH';
            repairDefectId = firstDefect.id;
            // Mark defect as in_progress
            try {
              await base44.asServiceRole.entities.RepairTask.update(firstDefect.id, { status: 'in_progress' });
            } catch {}
            lowestCatWorker.function = 'repairBackendChain';
            lowestCatWorker.phase = 'repair';
            taskMsg = `REPAIR ${targetChain} defect ${repairDefectId} → then targeted retest`;
            console.log(`[overnightHeartbeat] Pending defect found: ${repairDefectId} for ${targetChain} — dispatching repair instead of re-validating`);
          } else if (stalledConvergence) {
            // P0-1: Don't rerun the same unchanged full validator — run targeted chain
            // Find which chain is failing from the last heartbeat
            const lastFailedChains = lastHeartbeat?.next_work_packet?.failed_chains || [];
            targetChain = lastFailedChains[0] || 'CHAIN-AUTH';
            taskMsg = `STALLED — targeted retest of ${targetChain} only (not full validator)`;
            console.log(`[overnightHeartbeat] STALLED — dispatching targeted ${targetChain} validation only`);
          }
        } catch (e) {
          console.log(`[overnightHeartbeat] Defect check error: ${e.message}`);
        }
      }

      workPacket = {
        phase: lowestCatWorker.phase,
        function: lowestCatWorker.function,
        task: taskMsg,
        safe: true,
        queueDepth: 0,
        gap_type: lowestCatName.toLowerCase(),
        gap_priority: 3,
        stalled: stalledConvergence,
        taxonomy_node_id: taxonomyNodeId,
        content_family: contentFamilyName,
        required_count: 10,
        target_chain: targetChain,
        defect_id: repairDefectId,
      };
      console.log(`[overnightHeartbeat] Driving lowest category: ${lowestCatName} at ${currentLowest}%${stalledConvergence ? ' (STALLED)' : ''}${targetChain ? ` chain=${targetChain}` : ''}${repairDefectId ? ` defect=${repairDefectId}` : ''}`);
    }

    // ─── 11. DISPATCH WORK PACKET VIA DURABLE JOB QUEUE ─────────────
    let workResult = 'skipped';
    if (workPacket.safe && workPacket.function) {
      // Create a job in the durable queue (idempotent)
      const jobId = `job-${workPacket.function}-${orgId.slice(-6)}-${Date.now()}`;
      const idempotencyKey = `${workPacket.function}-${orgId}-${new Date().getMinutes()}`;
      try {
        await base44.asServiceRole.entities.JobQueue.create({
          organization_id: orgId,
          job_id: jobId,
          job_type: workPacket.function,
          owner_agent: 'overnightHeartbeat',
          build_id: BUILD_ID,
          scope: workPacket.task,
          priority: workPacket.gap_priority || 5,
          risk_class: 'safe',
          status: 'queued',
          idempotency_key: idempotencyKey,
          attempt: 0,
          max_retries: 3,
          timeout_seconds: 120,
          backoff_seconds: 30,
          validation_plan: workPacket.task,
          rollback_plan: '',
          receipt_destination: 'HeartbeatReceipt',
          approval_required: false,
          payload: {
            organization_id: orgId,
            triggered_by: 'overnightHeartbeat',
            clone_url: cloneUrl,
            source_url: SOURCE_URL,
            ...(workPacket.taxonomy_node_id ? {
              taxonomy_node_id: workPacket.taxonomy_node_id,
              content_family: workPacket.content_family,
              required_count: workPacket.required_count || 10,
              build_id: BUILD_ID,
            } : {}),
            ...(workPacket.target_chain ? {
              target_chain: workPacket.target_chain,
              chain_id: workPacket.target_chain,
            } : {}),
            ...(workPacket.defect_id ? {
              defect_id: workPacket.defect_id,
            } : {}),
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        console.log(`[overnightHeartbeat] Created job ${jobId} for ${workPacket.function}`);
      } catch (e) {
        console.log(`[overnightHeartbeat] Job create failed (may be duplicate): ${e.message}`);
      }

      // Process the job queue (claim + execute) — use longer timeout since this runs jobs
      // P0-2: The default dispatchFunction has a 5s timeout which is too short for
      // processJobQueue which claims and executes jobs (30-60s). Use a 90s timeout.
      try {
        const appId = Deno.env.get('BASE44_APP_ID');
        await fetch(`https://base44.app/api/apps/${appId}/functions/processJobQueue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(authHeader ? { 'Authorization': authHeader } : {}) },
          body: JSON.stringify({
            organization_id: orgId,
            lease_owner: `heartbeat-${Date.now()}`,
          }),
          signal: AbortSignal.timeout(90000),
        }).catch((e: any) => console.log(`[overnightHeartbeat] processJobQueue dispatch: ${e.message}`));
      } catch (e) { console.log(`[overnightHeartbeat] processJobQueue error: ${e.message}`); }
      workResult = 'dispatched';
      console.log(`[overnightHeartbeat] Dispatched ${workPacket.function} via job queue for phase: ${workPacket.phase}`);

      // P0-12: MAINTAIN CONTENT PROGRESS IN PARALLEL
      // If the main worker is doing backend validation/repair, dispatch a bounded
      // safe content/taxonomy worker in parallel so catalog work doesn't freeze.
      if (['BACKEND_VALIDATION_COVERAGE', 'BACKEND_IMPLEMENTATION_COVERAGE'].includes(lowestCatName)) {
        if (missingContentNodes.length > 0) {
          const parallelJobId = `job-autonomousMarketplaceStocker-${orgId.slice(-6)}-${Date.now()}`;
          try {
            const eligibleNode = missingContentNodes.find((n: any) =>
              (n.orphan_classification === 'not_orphan' || n.orphan_classification === 'missing_content') &&
              (n.node_type === 'category' || n.node_type === 'subcategory') &&
              n.source_present !== false
            );
            if (eligibleNode) {
              await base44.asServiceRole.entities.JobQueue.create({
                organization_id: orgId,
                job_id: parallelJobId,
                job_type: 'autonomousMarketplaceStocker',
                owner_agent: 'overnightHeartbeat-parallel',
                build_id: BUILD_ID,
                scope: `Parallel content stocking: ${eligibleNode.node_name}`,
                priority: 5,
                risk_class: 'safe',
                status: 'queued',
                idempotency_key: `parallel-stocker-${orgId}-${eligibleNode.taxonomy_node_id}-${new Date().getMinutes()}`,
                attempt: 0,
                max_retries: 2,
                timeout_seconds: 120,
                backoff_seconds: 30,
                validation_plan: `Stock ${eligibleNode.node_name}`,
                rollback_plan: '',
                receipt_destination: 'HeartbeatReceipt',
                approval_required: false,
                payload: {
                  organization_id: orgId,
                  triggered_by: 'overnightHeartbeat-parallel',
                  taxonomy_node_id: eligibleNode.taxonomy_node_id,
                  content_family: eligibleNode.node_name,
                  required_count: 10,
                  build_id: BUILD_ID,
                },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
              console.log(`[overnightHeartbeat] Parallel content worker dispatched for ${eligibleNode.node_name}`);
            }
          } catch (e) {
            console.log(`[overnightHeartbeat] Parallel content worker skipped: ${e.message}`);
          }
        }
      }
    }

    // ─── 11b. UPDATE CLOSURE BOARD ──────────────────────────────────
    try {
      const appId = Deno.env.get('BASE44_APP_ID');
      await fetch(`https://base44.app/api/apps/${appId}/functions/updateClosureBoard`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(authHeader ? { 'Authorization': authHeader } : {}) },
          body: JSON.stringify({ organization_id: orgId }),
          signal: AbortSignal.timeout(10000),
        }).catch(() => {});
      console.log(`[overnightHeartbeat] Closure board updated`);
    } catch (e) { console.log(`[overnightHeartbeat] Closure board update skipped: ${e.message}`); }

    // ─── 11c. AUDIT INVALID TAXONOMY (P0) ────────────────────────────
    if (invalidNodes.length > 0) {
      try {
        const appId = Deno.env.get('BASE44_APP_ID');
        await fetch(`https://base44.app/api/apps/${appId}/functions/auditInvalidTaxonomy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organization_id: orgId }),
          signal: AbortSignal.timeout(10000),
        }).catch(() => {});
        console.log(`[overnightHeartbeat] Invalid taxonomy audit dispatched`);
      } catch (e) { console.log(`[overnightHeartbeat] Invalid taxonomy audit skipped: ${e.message}`); }
    }

    // ─── 12. COMPUTE DELTA FROM PREVIOUS HEARTBEAT (P13) ─────────────
    const delta: any = {};
    if (lastHeartbeat) {
      delta.route_to_taxonomy_match = routeToTaxonomyMatch - (lastHeartbeat.route_to_taxonomy_match || lastHeartbeat.route_taxonomy_validation || 0);
      delta.taxonomy_node_validation = taxonomyNodeValidation - (lastHeartbeat.taxonomy_node_validation || 0);
      delta.taxonomy_route_coverage = taxonomyRouteCoverage - (lastHeartbeat.taxonomy_route_coverage || 0);
      delta.content_family_coverage = contentFamilyCoverage - (lastHeartbeat.content_family_coverage || 0);
      delta.backend_capability_coverage = backendCapabilityCoverage - (lastHeartbeat.backend_capability_coverage || lastHeartbeat.backend_coverage || 0);
      delta.discovered_routes = routes.length - (lastHeartbeat.discovered_routes || 0);
    }

    // ─── 13. REGRESSION DETECTION (P14) ──────────────────────────────
    const regressions: string[] = [];
    if (delta.route_to_taxonomy_match < 0) regressions.push(`Route-taxonomy match regressed by ${Math.abs(delta.route_to_taxonomy_match)}%`);
    if (delta.taxonomy_node_validation < 0) regressions.push(`Taxonomy node validation regressed by ${Math.abs(delta.taxonomy_node_validation)}%`);
    if (delta.taxonomy_route_coverage < 0) regressions.push(`Taxonomy route coverage regressed by ${Math.abs(delta.taxonomy_route_coverage)}%`);
    if (delta.content_family_coverage < 0) regressions.push(`Content family coverage regressed by ${Math.abs(delta.content_family_coverage)}%`);
    if (delta.discovered_routes < 0) regressions.push(`Discovered routes decreased by ${Math.abs(delta.discovered_routes)}`);

    // ─── 14. COUNT COMPLETED SINCE LAST ──────────────────────────────
    const lastTime = lastHeartbeat ? new Date(lastHeartbeat.heartbeat_time || lastHeartbeat.created_date).getTime() : 0;
    const completedSinceLast = scores.filter(s => {
      const t = new Date(s.run_at || s.created_date).getTime();
      return t > lastTime;
    }).length;

    // ─── 15. COUNT DEFECTS ───────────────────────────────────────────
    const criticalDefects = latestScore?.open_critical_defects || 0;
    const highDefects = latestScore?.open_high_defects || 0;

    // ─── 16. IDENTIFY BLOCKERS ───────────────────────────────────────
    const blockers: string[] = [];
    if (routeDiscoveryCoverage < 100) blockers.push(`Route discovery at ${routeDiscoveryCoverage}% — ${160 - validRoutes.length} routes below baseline`);
    if (routeToTaxonomyMatch < 99) blockers.push(`Route-taxonomy match at ${routeToTaxonomyMatch}% — ${unmatchedRoutes.length} unmatched content routes`);
    if (taxonomyNodeValidation < 99) blockers.push(`Taxonomy node validation at ${taxonomyNodeValidation}% — ${orphanNodes.length} unclassified orphan nodes`);
    if (taxonomyRouteCoverage < 99) blockers.push(`Taxonomy route coverage at ${taxonomyRouteCoverage}% — ${missingRouteNodes.length} valid nodes missing routes`);
    if (contentFamilyCoverage < 99) blockers.push(`Content family coverage at ${contentFamilyCoverage}% — ${missingContentNodes.length} nodes missing content`);
    if (backendImplMetric.score < 99) blockers.push(`Backend implementation coverage at ${backendImplMetric.score}% (${backendImplMetric.numerator}/${backendImplMetric.denominator})`);
    if (backendValMetric.score < 100) blockers.push(`Backend validation coverage at ${backendValMetric.score}% (${backendValMetric.numerator}/${backendValMetric.denominator}) — release gated`);
    if (criticalDefects > 0) blockers.push(`${criticalDefects} open critical defects`);
    if (regressions.length > 0) blockers.push(...regressions);

    // ─── 17. RECORD HEARTBEAT RECEIPT (P13) ───────────────────────────
    const heartbeat = await base44.asServiceRole.entities.HeartbeatReceipt.create({
      organization_id: orgId,
      heartbeat_time: new Date().toISOString(),
      build_id: BUILD_ID,
      queue_depth: gapQueueResult?.queue_depth || 0,
      current_task: workPacket.task,
      completed_since_last: completedSinceLast,
      new_defects: criticalDefects,
      closed_defects: 0,
      current_lowest_score: currentLowest,
      // P0-7: current_lowest_category not in HeartbeatReceipt schema — persist in delta_from_previous
      // Legacy fields (backward compat)
      route_coverage: routeDiscoveryCoverage,
      taxonomy_coverage: taxonomyNodeValidation,
      backend_coverage: backendImplMetric.score,
      content_coverage: contentFamilyCoverage,
      interaction_coverage: interactionCoverage,
      visual_score: visualScore,
      route_taxonomy_validation: routeToTaxonomyMatch,
      // P6: Separate independent coverage scores (shared engine)
      route_discovery_coverage: routeDiscoveryCoverage,
      route_to_taxonomy_match: routeToTaxonomyMatch,
      taxonomy_node_validation: taxonomyNodeValidation,
      taxonomy_route_coverage: taxonomyRouteCoverage,
      content_family_coverage: contentFamilyCoverage,
      backend_capability_coverage: backendImplMetric.score,
      backend_implementation_coverage: backendImplMetric.score,
      backend_validation_coverage: backendValMetric.score,
      // P1: Normalization rates
      pre_normalization_match_rate: preNormMatchRate,
      post_normalization_match_rate: postNormMatchRate,
      // P13: Detailed counts
      discovered_routes: routes.length,
      valid_routes: validRoutes.length,
      matched_routes: matchedRoutes.length,
      unmatched_routes: unmatchedRoutes.length,
      total_taxonomy_nodes: taxonomy.length,
      validated_taxonomy_nodes: validatedTaxonomyNodes.length,
      orphan_nodes: orphanNodes.length,
      invalid_nodes: invalidNodes.length,
      missing_route_nodes: missingRouteNodes.length,
      missing_content_nodes: missingContentNodes.length,
      delta_from_previous: { ...delta, current_lowest_category: currentLowestCategoryName },
      security_status: criticalDefects > 0 ? 'critical' : highDefects > 0 ? 'warning' : 'secure',
      blockers,
      next_task: workPacket.task,
      next_work_packet: gapQueueResult?.next_work_packet || null,
      phase: workPacket.phase as any,
    });

    console.log(`[overnightHeartbeat] Phase: ${workPacket.phase} | Route discovery: ${routeDiscoveryCoverage}% | Route→Taxonomy: ${routeToTaxonomyMatch}% | Taxonomy validation: ${taxonomyNodeValidation}% | Taxonomy route: ${taxonomyRouteCoverage}% | Content family: ${contentFamilyCoverage}% | Backend: ${backendCapabilityCoverage}% | Queue: ${gapQueueResult?.queue_depth || 0} gaps`);

    return Response.json({
      status: 'success',
      heartbeat_id: heartbeat.id,
      heartbeat_time: heartbeat.heartbeat_time,
      build_id: BUILD_ID,
      current_lowest_score: currentLowest,
      current_lowest_category: currentLowestCategoryName,
      // P6: Independent scores — NO blended headline
      coverage: {
        route_discovery: routeDiscoveryCoverage,
        route_to_taxonomy_match: routeToTaxonomyMatch,
        taxonomy_node_validation: taxonomyNodeValidation,
        taxonomy_route_coverage: taxonomyRouteCoverage,
        content_family: contentFamilyCoverage,
        backend_implementation: backendImplMetric.score,
        backend_validation: backendValMetric.score,
        interaction: interactionCoverage,
        visual: visualScore,
      },
      counts: {
        discovered_routes: routes.length,
        valid_routes: validRoutes.length,
        content_routes: contentRoutes.length,
        matched_routes: matchedRoutes.length,
        unmatched_routes: unmatchedRoutes.length,
        total_taxonomy_nodes: taxonomy.length,
        validated_taxonomy_nodes: validatedTaxonomyNodes.length,
        orphan_nodes: orphanNodes.length,
        invalid_nodes: invalidNodes.length,
        missing_route_nodes: missingRouteNodes.length,
        missing_content_nodes: missingContentNodes.length,
      },
      normalization: {
        pre_match_rate: preNormMatchRate,
        post_match_rate: postNormMatchRate,
      },
      defects: { critical: criticalDefects, high: highDefects },
      regressions,
      delta_from_previous: delta,
      gap_queue: gapQueueResult ? {
        depth: gapQueueResult.queue_depth,
        by_type: gapQueueResult.queue_by_type,
        next: gapQueueResult.next_work_packet,
      } : null,
      next_work_packet: workPacket,
      blockers,
      work_result: workResult,
    });
  } catch (error) {
    console.error('[overnightHeartbeat] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ─── DISPATCH HELPER ─────────────────────────────────────────────────
async function dispatchFunction(functionName: string, payload: any, authHeader?: string): Promise<void> {
  try {
    const appId = Deno.env.get('BASE44_APP_ID');
    const functionUrl = `https://base44.app/api/apps/${appId}/functions/${functionName}`;
    await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    }).catch(() => {}); // fire-and-forget
  } catch {}
}

// ─── WORK PACKET DETERMINATION (P11/P12) ──────────────────────────────
function determineWorkPacket(state: {
  routeDiscoveryCoverage: number; routeToTaxonomyMatch: number; taxonomyNodeValidation: number;
  taxonomyRouteCoverage: number; contentFamilyCoverage: number; backendCapabilityCoverage: number;
  interactionCoverage: number; visualScore: number; currentLowest: number;
  routesCount: number; taxonomyCount: number; capabilitiesCount: number;
  unmatchedCount: number; missingRouteCount: number; missingContentCount: number;
  gapQueueNext: any;
}): any {
  const { routeDiscoveryCoverage, routeToTaxonomyMatch, taxonomyNodeValidation,
    taxonomyRouteCoverage, contentFamilyCoverage, backendCapabilityCoverage,
    interactionCoverage, visualScore, currentLowest,
    routesCount, taxonomyCount, capabilitiesCount,
    unmatchedCount, missingRouteCount, missingContentCount, gapQueueNext } = state;

  // P11: If gap queue has a next packet, use it (highest priority safe gap)
  if (gapQueueNext && gapQueueNext.target_function) {
    return {
      phase: mapGapTypeToPhase(gapQueueNext.gap_type),
      function: gapQueueNext.target_function,
      task: gapQueueNext.description,
      safe: gapQueueNext.safe,
      queueDepth: 0,
      gap_type: gapQueueNext.gap_type,
      gap_priority: gapQueueNext.priority,
    };
  }

  // Fallback: phase-based progression
  // Phase 1: DISCOVERY
  if (routesCount < 100 || routeDiscoveryCoverage < 50) {
    return { phase: 'discovery', function: 'discoverPublicSurface', task: 'Continue public surface discovery', safe: true, queueDepth: 0 };
  }

  // Phase 2: NORMALIZATION
  if (routeToTaxonomyMatch < 50) {
    return { phase: 'normalization', function: 'normalizeRoutes', task: `Normalize routes to improve match rate (currently ${routeToTaxonomyMatch}%)`, safe: true, queueDepth: 0 };
  }

  // Phase 3: TAXONOMY — classify orphans and unmatched routes
  if (taxonomyNodeValidation < 80) {
    return { phase: 'taxonomy', function: 'classifyOrphanTaxonomy', task: `Classify orphan taxonomy nodes (validation at ${taxonomyNodeValidation}%)`, safe: true, queueDepth: 0 };
  }

  // Phase 3b: Classify unmatched routes via Browserbase
  if (unmatchedCount > 0) {
    return { phase: 'taxonomy', function: 'classifyUnmatchedRoutes', task: `Classify ${unmatchedCount} unmatched content routes via Browserbase`, safe: true, queueDepth: unmatchedCount };
  }

  // Phase 3c: Build taxonomy graph
  if (taxonomyRouteCoverage < 80 && missingRouteCount > 0) {
    return { phase: 'taxonomy', function: 'buildTaxonomyGraph', task: `Build taxonomy graph — ${missingRouteCount} nodes missing routes`, safe: true, queueDepth: 0 };
  }

  // Phase 4: BACKEND
  if (backendCapabilityCoverage < 99) {
    return { phase: 'backend', function: 'buildBackendCapabilityLedger', task: `Implement backend capabilities (${backendCapabilityCoverage}% of ${capabilitiesCount})`, safe: true, queueDepth: 0 };
  }

  // Phase 5: CATALOG — content population
  if (contentFamilyCoverage < 99 || missingContentCount > 0) {
    return { phase: 'catalog', function: 'autonomousMarketplaceStocker', task: `Populate content families (${contentFamilyCoverage}%, ${missingContentCount} missing)`, safe: true, queueDepth: 0 };
  }

  // Phase 6: VALIDATION
  if (currentLowest < 80) {
    return { phase: 'validation', function: 'masterQualityGate', task: `Run master quality gate (lowest: ${currentLowest}%)`, safe: true, queueDepth: 0 };
  }

  // Phase 7: REPAIR
  if (state.currentLowest < 99) {
    return { phase: 'harden', function: 'continuousImprovementHeartbeat', task: `Harden from ${currentLowest}% toward 99%`, safe: true, queueDepth: 0 };
  }

  // Phase 8: COMPLETE
  return { phase: 'complete', function: '', task: 'System at 99%+ parity — ready for certification', safe: false, queueDepth: 0 };
}

function mapGapTypeToPhase(gapType: string): string {
  if (gapType === 'invalid_taxonomy') return 'taxonomy';
  if (gapType === 'unmatched_valid_route') return 'taxonomy';
  if (gapType === 'missing_route_for_valid_node' || gapType === 'missing_crawl_evidence') return 'taxonomy';
  if (gapType === 'missing_backend_capability') return 'backend';
  if (gapType === 'missing_content_family' || gapType === 'insufficient_content_density') return 'catalog';
  if (gapType === 'visual_parity_gap') return 'harden';
  return 'repair';
}