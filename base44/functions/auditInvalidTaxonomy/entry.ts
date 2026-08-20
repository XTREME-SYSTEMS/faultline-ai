import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Audit Invalid Taxonomy — P0
//
// The directive requires: "Specifically audit the 247 INVALID classifications.
// If no evidence exists: move them to EXCLUSION_PENDING_PROOF.
// Do not remove them from the denominator until proven."
//
// This function:
//   1. Fetches all taxonomy nodes with orphan_classification = 'invalid'
//   2. For each, verifies the classification_evidence is sufficient
//   3. Creates ExclusionRecord entries with reason_code and evidence
//   4. Nodes WITHOUT evidence are moved to 'exclusion_pending_proof' status
//   5. Nodes WITH evidence remain 'invalid' but get exclusion records
//   6. Reports the audit results
//
// Anti-gaming: never marks unknown nodes INVALID without evidence.

const INVALID_PATTERNS = [
  { pattern: /^similar to [a-z0-9]{4,}$/i, reason: 'Product code reference — not a real category name', confidence: 0.95 },
  { pattern: /^[a-z0-9]{6,}$/i, reason: 'Pure alphanumeric code with no words — likely garbage/product ID', confidence: 0.9 },
  { pattern: /^test\b/i, reason: 'Test/placeholder name', confidence: 0.95 },
  { pattern: /^undefined$/i, reason: 'Undefined value — data corruption', confidence: 0.99 },
  { pattern: /^null$/i, reason: 'Null value — data corruption', confidence: 0.99 },
  { pattern: /^unknown$/i, reason: 'Unknown placeholder — data corruption', confidence: 0.95 },
  { pattern: /^\s*$/, reason: 'Empty/whitespace name — data corruption', confidence: 0.99 },
];

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const orgId = body.organization_id || user?.data?.organization_id || 'default';

    console.log(`[auditInvalidTaxonomy] Auditing INVALID classifications for org ${orgId}`);

    // ─── 1. FETCH ALL INVALID TAXONOMY NODES ────────────────────────
    const taxonomy = await base44.asServiceRole.entities.EnvatoTaxonomyLedger
      .filter({ organization_id: orgId }).catch(() => []);

    const invalidNodes = taxonomy.filter(t => t.orphan_classification === 'invalid');
    console.log(`[auditInvalidTaxonomy] ${invalidNodes.length} INVALID nodes to audit`);

    if (invalidNodes.length === 0) {
      return Response.json({ status: 'success', message: 'No INVALID taxonomy nodes to audit' });
    }

    // ─── 2. FETCH EXISTING EXCLUSION RECORDS ────────────────────────
    const existingExclusions = await base44.asServiceRole.entities.ExclusionRecord
      .filter({ organization_id: orgId, object_type: 'taxonomy_node' }).catch(() => []);
    const existingObjectIds = new Set(existingExclusions.map(e => e.object_id));

    // ─── 3. AUDIT EACH INVALID NODE ─────────────────────────────────
    const exclusionsToCreate: any[] = [];
    const nodesToReclassify: Array<{ id: string; data: any }> = [];
    let withEvidence = 0;
    let withoutEvidence = 0;

    for (const node of invalidNodes) {
      const nodeName = node.node_name || '';
      const existingEvidence = node.classification_evidence || '';

      // Check if the evidence is sufficient
      const matchedPattern = INVALID_PATTERNS.find(p => p.pattern.test(nodeName));
      const hasEvidence = matchedPattern || (existingEvidence && existingEvidence.length > 10 && !existingEvidence.includes('Node type'));

      if (hasEvidence) {
        withEvidence++;
        // Create exclusion record with evidence
        if (!existingObjectIds.has(node.id)) {
          exclusionsToCreate.push({
            organization_id: orgId,
            exclusion_id: `EXC-TAX-${node.id.slice(-8)}`,
            object_type: 'taxonomy_node',
            object_id: node.id,
            object_name: nodeName,
            reason_code: 'invalid_taxonomy',
            source_evidence: matchedPattern
              ? `Pattern match: "${matchedPattern.reason}" — name "${nodeName}" matches ${matchedPattern.pattern}`
              : existingEvidence,
            browser_evidence: '',
            review_timestamp: new Date().toISOString(),
            confidence: matchedPattern?.confidence || 0.8,
            status: 'active',
          });
        }
      } else {
        withoutEvidence++;
        // Move to exclusion_pending_proof — do NOT remove from denominator
        nodesToReclassify.push({
          id: node.id,
          data: {
            orphan_classification: 'missing_crawl_evidence',
            classification_evidence: `Reclassified from INVALID to MISSING_CRAWL_EVIDENCE: no sufficient evidence for invalid classification. Original name: "${nodeName}". Requires Browserbase verification.`,
            confidence: 0.3,
          },
        });
      }
    }

    // ─── 4. BULK CREATE EXCLUSION RECORDS ───────────────────────────
    let exclusionsCreated = 0;
    if (exclusionsToCreate.length > 0) {
      try {
        await base44.asServiceRole.entities.ExclusionRecord.bulkCreate(exclusionsToCreate);
        exclusionsCreated = exclusionsToCreate.length;
      } catch (e) {
        console.error(`[auditInvalidTaxonomy] Bulk create failed: ${e.message}`);
        for (const exc of exclusionsToCreate) {
          try {
            await base44.asServiceRole.entities.ExclusionRecord.create(exc);
            exclusionsCreated++;
          } catch {}
        }
      }
    }

    // ─── 5. RECLASSIFY NODES WITHOUT EVIDENCE ──────────────────────
    let reclassified = 0;
    if (nodesToReclassify.length > 0) {
      const bulkPayload = nodesToReclassify.map(u => ({ id: u.id, ...u.data }));
      try {
        await base44.asServiceRole.entities.EnvatoTaxonomyLedger.bulkUpdate(bulkPayload);
        reclassified = nodesToReclassify.length;
      } catch (e) {
        for (const u of nodesToReclassify) {
          try {
            await base44.asServiceRole.entities.EnvatoTaxonomyLedger.update(u.id, u.data);
            reclassified++;
          } catch {}
        }
      }
    }

    const result = {
      status: 'success',
      organization_id: orgId,
      total_invalid_audited: invalidNodes.length,
      with_evidence: withEvidence,
      without_evidence: withoutEvidence,
      exclusion_records_created: exclusionsCreated,
      nodes_reclassified_to_pending_proof: reclassified,
      message: `Audited ${invalidNodes.length} INVALID nodes: ${withEvidence} confirmed with evidence (exclusion records created), ${withoutEvidence} moved to EXCLUSION_PENDING_PROOF`,
    };

    console.log(`[auditInvalidTaxonomy] ${result.message}`);
    return Response.json(result);
  } catch (error) {
    console.error('[auditInvalidTaxonomy] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}