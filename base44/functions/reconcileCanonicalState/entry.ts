import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Reconcile Canonical Source Truth — P0
//
// Determines the CURRENT authority across Base44, GitHub, Vercel, and heartbeat
// runtime. Does NOT assume older records are current. Uses evidence:
//   - Latest LaunchProject with vercel_deployment_url
//   - Latest MasterQualityScore build_id
//   - Latest HeartbeatReceipt
//   - Latest DeploymentManifest
//
// Conflicting records are marked DRIFT and quarantined.
// All future validation evidence must bind to this canonical identity.

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const orgId = body.organization_id || user?.data?.organization_id || 'default';

    console.log(`[reconcileCanonicalState] Reconciling source truth for org ${orgId}`);

    // ─── 1. GATHER EVIDENCE FROM ALL SOURCES ────────────────────────
    const [projects, scores, heartbeats, manifests] = await Promise.all([
      base44.asServiceRole.entities.LaunchProject.filter({ organization_id: orgId }, '-created_date', 10).catch(() => []),
      base44.asServiceRole.entities.MasterQualityScore.filter({ organization_id: orgId }, '-created_date', 5).catch(() => []),
      base44.asServiceRole.entities.HeartbeatReceipt.filter({ organization_id: orgId }, '-heartbeat_time', 5).catch(() => []),
      base44.asServiceRole.entities.DeploymentManifest.filter({ organization_id: orgId }, '-created_at', 5).catch(() => []),
    ]);

    // ─── 2. DETERMINE CANONICAL CLONE ──────────────────────────────
    // Latest passed LaunchProject with a Vercel URL
    const passedWithUrl = projects.find(p => p.status === 'passed' && p.vercel_deployment_url);
    const latestWithUrl = projects.find(p => p.vercel_deployment_url);
    const canonicalProject = passedWithUrl || latestWithUrl || projects[0];

    if (!canonicalProject) {
      return Response.json({ status: 'error', error: 'No LaunchProject found — cannot reconcile canonical state' }, { status: 404 });
    }

    const canonicalPreviewUrl = canonicalProject.vercel_deployment_url || '';
    const canonicalProjectId = canonicalProject.id;
    const canonicalBuildId = scores[0]?.build_id || heartbeats[0]?.build_id || 'unknown';
    const canonicalEngineVersion = manifests[0]?.engine_version || 'autonomousFullSiteClone-latest';
    const canonicalValidatorVersion = manifests[0]?.validator_version || 'masterQualityGate-latest';

    // ─── 3. COMPUTE ROUTE MANIFEST HASH ─────────────────────────────
    const routes = await base44.asServiceRole.entities.EnvatoPublicSurfaceManifest
      .filter({ organization_id: orgId }).catch(() => []);
    const routeHash = await hashString(routes.map(r => r.canonical_url || r.source_route).sort().join('|'));
    console.log(`[reconcileCanonicalState] Route manifest hash: ${routeHash}`);

    // ─── 4. COMPUTE TAXONOMY MANIFEST HASH ─────────────────────────
    const taxonomy = await base44.asServiceRole.entities.EnvatoTaxonomyLedger
      .filter({ organization_id: orgId }).catch(() => []);
    const taxonomyHash = await hashString(taxonomy.map(t => `${t.taxonomy_node_id}:${t.node_name}:${t.parent_node || ''}`).sort().join('|'));
    console.log(`[reconcileCanonicalState] Taxonomy manifest hash: ${taxonomyHash}`);

    // ─── 5. DETECT DRIFT ────────────────────────────────────────────
    const driftDetails: string[] = [];
    const quarantined: string[] = [];

    // Check: do all MasterQualityScore records reference the same build_id?
    const uniqueBuildIds = [...new Set(scores.map(s => s.build_id).filter(Boolean))];
    if (uniqueBuildIds.length > 1) {
      driftDetails.push(`Multiple build IDs in MasterQualityScore: ${uniqueBuildIds.join(', ')}`);
    }

    // Check: do heartbeats reference the same build_id as latest score?
    const heartbeatBuildIds = [...new Set(heartbeats.map(h => h.build_id).filter(Boolean))];
    if (heartbeatBuildIds.length > 1) {
      driftDetails.push(`Multiple build IDs in HeartbeatReceipt: ${heartbeatBuildIds.join(', ')}`);
    }

    // Check: does the latest manifest match the canonical project?
    if (manifests[0] && manifests[0].clone_id !== canonicalProjectId) {
      driftDetails.push(`DeploymentManifest clone_id (${manifests[0].clone_id}) != canonical project (${canonicalProjectId})`);
      quarantined.push(manifests[0].id);
    }

    // Check: do manifests reference different deployment URLs?
    const manifestUrls = manifests.map(m => m.deployment_url).filter(Boolean);
    if (canonicalPreviewUrl && manifestUrls.length > 0 && !manifestUrls.includes(canonicalPreviewUrl)) {
      driftDetails.push(`DeploymentManifest URLs don't match canonical preview URL: ${canonicalPreviewUrl}`);
    }

    const driftDetected = driftDetails.length > 0;
    console.log(`[reconcileCanonicalState] Drift: ${driftDetected ? 'DETECTED' : 'NONE'}, ${driftDetails.length} conflicts`);

    // ─── 6. PERSIST CANONICAL STATE ─────────────────────────────────
    // Upsert: delete old, create new (single canonical record per org)
    const existing = await base44.asServiceRole.entities.CanonicalState
      .filter({ organization_id: orgId }).catch(() => []);

    const canonicalData = {
      organization_id: orgId,
      canonical_base44_app: Deno.env.get('BASE44_APP_ID') || 'unknown',
      canonical_project_id: canonicalProjectId,
      canonical_envato_build_id: canonicalBuildId,
      canonical_clone_engine_version: canonicalEngineVersion,
      canonical_repo: canonicalProject.github_repo_url || '',
      canonical_branch: 'main',
      canonical_commit_sha: manifests[0]?.artifact_hashes?.commitSha || '',
      canonical_preview_url: canonicalPreviewUrl,
      canonical_validator_version: canonicalValidatorVersion,
      canonical_semantic_classifier_version: 'componentFamilyLedger-v2',
      canonical_route_manifest_hash: routeHash,
      canonical_taxonomy_manifest_hash: taxonomyHash,
      last_verified_heartbeat: heartbeats[0]?.id || '',
      last_verified_timestamp: new Date().toISOString(),
      drift_detected: driftDetected,
      drift_details: driftDetails,
      quarantined_records: quarantined,
    };

    let canonicalRecord;
    if (existing.length > 0) {
      canonicalRecord = await base44.asServiceRole.entities.CanonicalState.update(existing[0].id, canonicalData);
    } else {
      canonicalRecord = await base44.asServiceRole.entities.CanonicalState.create(canonicalData);
    }

    // ─── 7. QUARANTINE DRIFTED RECORDS ──────────────────────────────
    for (const qId of quarantined) {
      try {
        await base44.asServiceRole.entities.DeploymentManifest.update(qId, {
          build_verified: false,
          changes_included: ['QUARANTINED: drift detected by reconcileCanonicalState'],
        });
      } catch {}
    }

    const result = {
      status: 'success',
      canonical_state_id: canonicalRecord.id,
      canonical_project_id: canonicalProjectId,
      canonical_build_id: canonicalBuildId,
      canonical_preview_url: canonicalPreviewUrl,
      route_manifest_hash: routeHash,
      taxonomy_manifest_hash: taxonomyHash,
      drift_detected: driftDetected,
      drift_details: driftDetails,
      quarantined_count: quarantined.length,
      evidence_sources: {
        launch_projects_checked: projects.length,
        quality_scores_checked: scores.length,
        heartbeats_checked: heartbeats.length,
        manifests_checked: manifests.length,
        routes_count: routes.length,
        taxonomy_count: taxonomy.length,
      },
      message: driftDetected
        ? `Source truth reconciled with DRIFT: ${driftDetails.length} conflicts detected, ${quarantined.length} records quarantined`
        : 'Source truth reconciled — no drift detected',
    };

    console.log(`[reconcileCanonicalState] ${result.message}`);
    return Response.json(result);
  } catch (error) {
    console.error('[reconcileCanonicalState] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ─── HASH HELPER ─────────────────────────────────────────────────────
async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}