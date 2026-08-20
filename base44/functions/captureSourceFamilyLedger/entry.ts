// Capture Source Component Family Ledger
// Uses Browserbase to inspect the source Envato Graphic Templates page,
// extract a detailed component manifest, classify components into families,
// categorize as required vs. non-required, and return the structured ledger.
//
// This is the FIRST ACTION in the semantic gap closure directive: build a
// source component family ledger before attempting any repairs.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getProvider } from '../../shared/browserWorkerAdapter.ts';
import { buildFamilyLedgerExtractionScript, parseFamilyLedger, FamilyLedger } from '../../shared/componentFamilyLedger.ts';

export default async function(req: Request) {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));

  const journeyPath = body.journey_path || '/graphic-templates';
  const journeyName = body.journey_name || 'Graphic Templates category';

  // Find latest clone if URLs not provided
  let sourceUrl = body.source_url;
  let cloneUrl = body.clone_url;

  if (!sourceUrl || !cloneUrl) {
    const projects = await base44.asServiceRole.entities.LaunchProject.list('-created_date', 10);
    const latest = projects.find(p => p.vercel_deployment_url && p.benchmark_url);
    if (!sourceUrl) sourceUrl = latest?.benchmark_url || 'https://elements.envato.com';
    if (!cloneUrl) cloneUrl = latest?.vercel_deployment_url;
  }

  if (!cloneUrl) {
    return Response.json({ error: 'No clone URL found — pass clone_url or ensure a clone exists' }, { status: 400 });
  }

  const provider = getProvider('browserbase');
  const extractionScript = buildFamilyLedgerExtractionScript();
  const sessionConfig = {
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
    timezone: 'America/New_York',
    proxy: false,
    solveCaptchas: false,
    timeoutMs: 30000,
  };

  let sourceLedger: FamilyLedger | null = null;
  let cloneLedger: FamilyLedger | null = null;
  let sourceSession: any = null;
  let cloneSession: any = null;

  // ─── 1. CAPTURE SOURCE LEDGER ────────────────────────────────
  try {
    sourceSession = await provider.createSession(sessionConfig);
    await provider.goto(sourceSession, new URL(journeyPath, sourceUrl).href, 4000);
    await provider.scroll(sourceSession, 'down', 600);
    await new Promise(r => setTimeout(r, 1500));

    const sourceResult = await provider.evaluate(sourceSession, extractionScript);
    const sourceRaw = sourceResult.data || '{}';
    const sourceData = typeof sourceRaw === 'string' ? JSON.parse(sourceRaw) : sourceRaw;
    sourceLedger = parseFamilyLedger(JSON.stringify(sourceData));
  } catch (e: any) {
    return Response.json({
      error: 'Source ledger capture failed',
      detail: e.message,
      source_url: new URL(journeyPath, sourceUrl).href,
    }, { status: 500 });
  } finally {
    if (sourceSession) await provider.closeSession(sourceSession);
  }

  // ─── 2. CAPTURE CLONE LEDGER ─────────────────────────────────
  try {
    cloneSession = await provider.createSession(sessionConfig);
    await provider.goto(cloneSession, new URL(journeyPath, cloneUrl).href, 4000);
    await provider.scroll(cloneSession, 'down', 600);
    await new Promise(r => setTimeout(r, 1500));

    const cloneResult = await provider.evaluate(cloneSession, extractionScript);
    const cloneRaw = cloneResult.data || '{}';
    const cloneData = typeof cloneRaw === 'string' ? JSON.parse(cloneRaw) : cloneRaw;
    cloneLedger = parseFamilyLedger(JSON.stringify(cloneData));
  } catch (e: any) {
    return Response.json({
      error: 'Clone ledger capture failed',
      detail: e.message,
      clone_url: new URL(journeyPath, cloneUrl).href,
      source_ledger: sourceLedger,
    }, { status: 500 });
  } finally {
    if (cloneSession) await provider.closeSession(cloneSession);
  }

  // ─── 3. BUILD FAMILY COMPARISON ──────────────────────────────
  const sourceFamilies = sourceLedger!.families.map(f => ({
    family_id: f.family_id,
    family_name: f.family_name,
    semantic_type: f.semantic_type,
    region: f.region,
    action_intent: f.action_intent,
    category: f.category,
    criticality: f.criticality,
    source_count: f.components.length,
    user_visible_purpose: f.user_visible_purpose,
    sample_components: f.components.slice(0, 3).map(c => ({
      tag: c.t, text: c.x, href: c.h, accessible_name: c.n,
    })),
  }));

  const cloneFamilies = cloneLedger!.families.map(f => ({
    family_name: f.family_name,
    clone_count: f.components.length,
    category: f.category,
  }));

  // Identify missing required families
  const sourceFamilyNames = new Set(sourceFamilies.map(f => f.family_name));
  const cloneFamilyNames = new Set(cloneFamilies.map(f => f.family_name));

  const missingRequired = sourceFamilies.filter(f =>
    (f.category === 'REQUIRED_FUNCTIONAL' || f.category === 'REQUIRED_STRUCTURAL' || f.category === 'REQUIRED_REPEATED_CONTENT') &&
    !cloneFamilyNames.has(f.family_name)
  ).map(f => ({
    family_name: f.family_name,
    category: f.category,
    criticality: f.criticality,
    source_count: f.source_count,
    purpose: f.user_visible_purpose,
    samples: f.sample_components,
  }));

  const underweight = sourceFamilies.filter(f => {
    if (f.category !== 'REQUIRED_REPEATED_CONTENT') return false;
    const cloneFam = cloneFamilies.find(c => c.family_name === f.family_name);
    if (!cloneFam) return false;
    return cloneFam.clone_count < f.source_count * 0.8;
  }).map(f => ({
    family_name: f.family_name,
    source_count: f.source_count,
    clone_count: cloneFamilies.find(c => c.family_name === f.family_name)?.clone_count || 0,
    coverage: Math.round(((cloneFamilies.find(c => c.family_name === f.family_name)?.clone_count || 0) / f.source_count) * 100),
  }));

  // ─── 4. RETURN STRUCTURED LEDGER (repair priority FIRST) ─────
  return Response.json({
    repair_priority: [
      ...missingRequired.sort((a, b) => {
        const critOrder = { critical: 0, important: 1, optional: 2 };
        return critOrder[a.criticality] - critOrder[b.criticality];
      }).map(f => ({
        family: f.family_name,
        action: 'RECONSTRUCT',
        criticality: f.criticality,
        source_count: f.source_count,
        purpose: f.purpose,
        samples: f.samples,
      })),
      ...underweight.map(f => ({
        family: f.family_name,
        action: 'INCREASE_QUANTITY',
        source_count: f.source_count,
        clone_count: f.clone_count,
        coverage: f.coverage,
      })),
    ],
    missing_required_families: missingRequired,
    underweight_repeated_families: underweight,
    journey: { path: journeyPath, name: journeyName },
    source: {
      url: sourceLedger!.url,
      title: sourceLedger!.title,
      total_components: sourceLedger!.total_components,
      type_counts: sourceLedger!.type_counts,
      family_count: sourceLedger!.families.length,
      required_family_count: sourceLedger!.required_family_count,
    },
    clone: {
      url: cloneLedger!.url,
      title: cloneLedger!.title,
      total_components: cloneLedger!.total_components,
      type_counts: cloneLedger!.type_counts,
      family_count: cloneLedger!.families.length,
      required_family_count: cloneLedger!.required_family_count,
    },
    source_families: sourceFamilies,
    clone_families: cloneFamilies,
  });
}