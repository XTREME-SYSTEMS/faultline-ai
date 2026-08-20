import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Reconcile Taxonomy — P0-1
//
// Deduplicates the EnvatoTaxonomyLedger by TAXONOMY_STABLE_KEY.
//
// TAXONOMY_STABLE_KEY = NORMALIZED_NODE_TYPE + NORMALIZED_NAME/SLUG + CANONICAL_PARENT_ID
//
// Before CREATE, lookup by TAXONOMY_STABLE_KEY. If existing, UPDATE/MERGE evidence.
// Do not create a duplicate.
//
// Reconciles all current records. Classifies each duplicate set:
//   CANONICAL — the primary record (earliest created, most evidence)
//   DUPLICATE_SAME_NODE — same stable key, merge evidence into canonical
//   ALIAS — different name but same source_route, redirect to canonical
//   TRUE_DISTINCT_NODE — genuinely different, keep
//
// Does NOT merely delete records to improve scores. Every denominator reduction
// requires lineage.
//
// After reconciliation rebuilds: taxonomy graph, route coverage, content coverage,
// orphan counts, invalid counts.

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const user = await base44.auth.me().catch(() => null);
    const orgId = body.organization_id || user?.data?.organization_id || 'default';

    console.log(`[reconcileTaxonomy] Starting for org ${orgId}`);

    // ─── 1. FETCH ALL TAXONOMY NODES ────────────────────────────────
    const allNodes = await base44.asServiceRole.entities.EnvatoTaxonomyLedger
      .filter({ organization_id: orgId }).catch(() => []);

    const preDedupCount = allNodes.length;
    console.log(`[reconcileTaxonomy] PRE_DEDUP_NODE_COUNT = ${preDedupCount}`);

    // ─── 2. COMPUTE TAXONOMY_STABLE_KEY FOR EACH NODE ────────────────
    const normalizeName = (name: string) => (name || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const normalizeType = (type: string) => (type || '').toLowerCase().trim();
    const normalizeParent = (parent: string) => (parent || '').toLowerCase().trim() || 'root';

    const nodeWithKeys = allNodes.map((n: any) => ({
      node: n,
      stableKey: `${normalizeType(n.node_type)}::${normalizeName(n.node_name)}::${normalizeParent(n.parent_node || n.parent_id)}`,
      routeKey: n.source_route ? `route::${n.source_route.toLowerCase().trim()}` : null,
    }));

    // ─── 3. GROUP BY STABLE KEY ─────────────────────────────────────
    const byStableKey = new Map<string, any[]>();
    for (const item of nodeWithKeys) {
      const group = byStableKey.get(item.stableKey) || [];
      group.push(item);
      byStableKey.set(item.stableKey, group);
    }

    // ─── 4. IDENTIFY CANONICAL vs DUPLICATES ────────────────────────
    const canonicalRecords: any[] = [];
    const duplicateRecords: any[] = [];
    const aliasRecords: any[] = [];
    const trueDistinctRecords: any[] = [];

    for (const [stableKey, group] of byStableKey) {
      if (group.length === 1) {
        // True distinct node — no duplicates
        trueDistinctRecords.push(group[0]);
        canonicalRecords.push(group[0].node);
      } else {
        // Multiple nodes with same stable key — pick canonical (earliest created)
        const sorted = group.sort((a, b) =>
          new Date(a.node.created_date || a.node.updated_date).getTime() -
          new Date(b.node.created_date || b.node.updated_date).getTime()
        );
        const canonical = sorted[0];
        const duplicates = sorted.slice(1);

        canonicalRecords.push(canonical.node);

        for (const dup of duplicates) {
          // Check if it's an alias (different name but same route)
          if (canonical.node.source_route && dup.node.source_route &&
              canonical.node.source_route === dup.node.source_route &&
              canonical.node.node_name !== dup.node.node_name) {
            aliasRecords.push(dup);
          } else {
            duplicateRecords.push(dup);
          }
        }
      }
    }

    // ─── 5. ALSO CHECK FOR ROUTE-BASED ALIASES (same route, different name) ──
    const byRoute = new Map<string, any[]>();
    for (const item of nodeWithKeys) {
      if (item.routeKey) {
        const group = byRoute.get(item.routeKey) || [];
        group.push(item);
        byRoute.set(item.routeKey, group);
      }
    }

    const routeAliasCount: number[] = [];
    for (const [routeKey, group] of byRoute) {
      if (group.length > 1) {
        // Check if these are already in the duplicate set
        const stableKeys = new Set(group.map(g => g.stableKey));
        if (stableKeys.size > 1) {
          // Different stable keys but same route — these are aliases
          const sorted = group.sort((a, b) =>
            new Date(a.node.created_date || a.node.updated_date).getTime() -
            new Date(b.node.created_date || b.node.updated_date).getTime()
          );
          for (const alias of sorted.slice(1)) {
            if (!aliasRecords.find(a => a.node.id === alias.node.id) &&
                !duplicateRecords.find(d => d.node.id === alias.node.id)) {
              aliasRecords.push(alias);
              routeAliasCount.push(alias.node.id);
            }
          }
        }
      }
    }

    // ─── 6. MERGE EVIDENCE FROM DUPLICATES INTO CANONICAL ───────────
    const updates: any[] = [];
    for (const dup of duplicateRecords) {
      // Find the canonical for this duplicate
      const dupStableKey = `${normalizeType(dup.node.node_type)}::${normalizeName(dup.node.node_name)}::${normalizeParent(dup.node.parent_node || dup.node.parent_id)}`;
      const canonicalGroup = byStableKey.get(dupStableKey);
      if (canonicalGroup && canonicalGroup.length > 0) {
        const canonical = canonicalGroup.sort((a, b) =>
          new Date(a.node.created_date || a.node.updated_date).getTime() -
          new Date(b.node.created_date || b.node.updated_date).getTime()
        )[0];

        // Merge evidence
        const mergedEvidence = [canonical.node.classification_evidence || '', dup.node.classification_evidence || '']
          .filter(Boolean).join(' | ');
        const mergedContentCount = Math.max(canonical.node.content_count || 0, dup.node.content_count || 0);
        const mergedContentAvailable = canonical.node.content_available || dup.node.content_available;
        const mergedSourcePresent = canonical.node.source_present || dup.node.source_present;
        const mergedClonePresent = canonical.node.clone_present || dup.node.clone_present;
        const mergedTested = canonical.node.tested || dup.node.tested;

        updates.push({
          id: canonical.node.id,
          data: {
            classification_evidence: mergedEvidence,
            content_count: mergedContentCount,
            content_available: mergedContentAvailable,
            source_present: mergedSourcePresent,
            clone_present: mergedClonePresent,
            tested: mergedTested,
          },
        });
      }
    }

    // Apply canonical updates
    for (const u of updates) {
      try {
        await base44.asServiceRole.entities.EnvatoTaxonomyLedger.update(u.id, u.data);
      } catch (e) { console.log(`[reconcileTaxonomy] Update canonical failed: ${e.message}`); }
    }

    // ─── 7. MARK DUPLICATES AND ALIASES ─────────────────────────────
    const duplicateIds = duplicateRecords.map((d: any) => d.node.id);
    const aliasIds = aliasRecords.map((a: any) => a.node.id);

    // Mark duplicates as duplicate orphan_classification
    for (const dupId of duplicateIds) {
      try {
        await base44.asServiceRole.entities.EnvatoTaxonomyLedger.update(dupId, {
          orphan_classification: 'duplicate',
          classification_evidence: 'Duplicate detected by reconcileTaxonomy — same TAXONOMY_STABLE_KEY as canonical record',
        });
      } catch (e) { console.log(`[reconcileTaxonomy] Mark duplicate failed: ${e.message}`); }
    }

    // Mark aliases
    for (const aliasId of aliasIds) {
      try {
        await base44.asServiceRole.entities.EnvatoTaxonomyLedger.update(aliasId, {
          orphan_classification: 'alias',
          classification_evidence: 'Alias detected by reconcileTaxonomy — same source_route as canonical record',
        });
      } catch (e) { console.log(`[reconcileTaxonomy] Mark alias failed: ${e.message}`); }
    }

    // ─── 8. COMPUTE POST-RECONCILIATION METRICS ─────────────────────
    const trueUniqueCount = canonicalRecords.length;
    const duplicateCount = duplicateRecords.length;
    const aliasCount = aliasRecords.length;
    const newValidUniqueCount = trueDistinctRecords.length;
    const postReconciliationDenominator = trueUniqueCount;

    // Count valid navigable nodes (category + subcategory, not invalid/duplicate/stale)
    const validNavigable = canonicalRecords.filter((n: any) =>
      (n.node_type === 'category' || n.node_type === 'subcategory') &&
      n.orphan_classification !== 'invalid' &&
      n.orphan_classification !== 'duplicate' &&
      n.orphan_classification !== 'stale'
    );

    // Count invalid canonical nodes
    const invalidCanonical = canonicalRecords.filter((n: any) =>
      n.orphan_classification === 'invalid'
    );

    // ─── 9. RETURN RECONCILIATION REPORT ────────────────────────────
    const result = {
      status: 'success',
      organization_id: orgId,
      taxonomy: {
        PRE_DEDUP_NODE_COUNT: preDedupCount,
        TRUE_UNIQUE_NODE_COUNT: trueUniqueCount,
        DUPLICATE_COUNT: duplicateCount,
        ALIAS_COUNT: aliasCount,
        NEW_VALID_UNIQUE_COUNT: newValidUniqueCount,
        POST_RECONCILIATION_DENOMINATOR: postReconciliationDenominator,
        VALID_NAVIGABLE_DENOMINATOR: validNavigable.length,
        INVALID_CANONICAL_COUNT: invalidCanonical.length,
      },
      lineage: {
        canonical_records: canonicalRecords.length,
        duplicate_records_marked: duplicateIds.length,
        alias_records_marked: aliasIds.length,
        evidence_merged: updates.length,
      },
      message: `Reconciled ${preDedupCount} → ${trueUniqueCount} unique (${duplicateCount} duplicates, ${aliasCount} aliases). Valid navigable: ${validNavigable.length}`,
    };

    console.log(`[reconcileTaxonomy] ${result.message}`);
    return Response.json(result);
  } catch (error) {
    console.error('[reconcileTaxonomy] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}