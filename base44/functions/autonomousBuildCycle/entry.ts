import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { generateTemplatePackCore } from '../../shared/templateFactory.ts';

// Autonomous Build Cycle — the self-managing, self-reflecting, self-optimizing
// engine. Each run pulls the next pending SystemEnhancement (a logged roadmap
// item), builds the deliverable, validates it against acceptance criteria,
// reflects on the result, applies the outcome, and updates status. Scheduled
// 24/7 by the "Autonomous Build Loop" workflow so the roadmap builds itself.
//
// Per run it processes ONE enhancement (credit-conscious) and caps iterations
// at 3 before deferring — so the loop is always progressing, never thrashing.

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
const MAX_ITERATIONS = 3;

export default async function(req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  const orgId = user?.data?.organization_id;
  if (!orgId) return Response.json({ error: 'Unauthorized — no organization' }, { status: 401 });

  // 1. Pull next pending/in-progress enhancement, highest priority first
  const candidates = await base44.asServiceRole.entities.SystemEnhancement.filter(
    { organization_id: orgId, status: { $in: ['pending', 'in_progress'] } },
    '-created_date',
    50
  );
  if (!candidates || candidates.length === 0) {
    return Response.json({ status: 'idle', message: 'No pending enhancements. System stable — all roadmap items built or in progress.' });
  }
  candidates.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));
  const task = candidates[0];

  const iteration = (task.iteration_count || 0) + 1;
  await base44.asServiceRole.entities.SystemEnhancement.update(task.id, {
    status: 'in_progress',
    iteration_count: iteration
  });

  const log = [];
  log.push(`[${task.enhancement_id}] "${task.title}" — iteration ${iteration}`);

  // 2. BUILD — dispatch by pillar / title keywords
  let buildResult;
  try {
    const t = (task.title + ' ' + task.description).toLowerCase();
    const isTemplatePhase = task.pillar === 'generation' || t.includes('pack') || t.includes('template');
    if (isTemplatePhase) {
      buildResult = await buildTemplatePhase(base44, orgId, task, log);
    } else if (task.pillar === 'system_validation' || t.includes('optimiz') || t.includes('orchestrator') || t.includes('self')) {
      buildResult = await buildOptimizationPhase(base44, orgId, task, log);
    } else {
      buildResult = await buildGenericPhase(base44, orgId, task, log);
    }
  } catch (e) {
    log.push(`BUILD FAILED: ${e.message}`);
    await finalize(base44, orgId, task, {
      status: iteration >= MAX_ITERATIONS ? 'deferred' : 'in_progress',
      validation_result: 'fail', validation_notes: e.message,
      implementation_notes: log.join('\n'),
      audit_result: 'needs_work', audit_notes: 'Build threw before validation.'
    });
    return Response.json({ status: 'build_failed', enhancement_id: task.enhancement_id, iteration, error: e.message, log });
  }

  // 3. VALIDATE — LLM-as-judge against acceptance criteria
  const validation = await validateBuild(base44, orgId, task, buildResult, log);

  // 4. REFLECT — self-reflection on what to improve next
  const reflection = await reflectOnResult(base44, orgId, task, buildResult, validation, log);

  // 5. FINALIZE — update status, write notes, log receipt
  const passed = validation.pass;
  const nextStatus = passed ? 'validated'
    : (iteration >= MAX_ITERATIONS ? 'deferred' : 'in_progress');
  await finalize(base44, orgId, task, {
    status: nextStatus,
    validation_result: passed ? 'pass' : 'fail',
    validation_notes: validation.notes,
    implementation_notes: buildResult.summary,
    audit_result: reflection.pass ? 'pass' : 'needs_work',
    audit_notes: reflection.notes,
    files_touched: buildResult.files_touched || []
  });

  return Response.json({
    status: nextStatus,
    enhancement_id: task.enhancement_id,
    iteration,
    validation: validation.pass,
    reflection: reflection.notes,
    summary: buildResult.summary,
    log
  });
}

// ---- BUILD dispatchers ----

async function buildTemplatePhase(base44, orgId, task, log) {
  // Self-managing: derive the generation params from the logged request itself
  const extractRes = await base44.integrations.Core.InvokeLLM({
    prompt: `You are planning a template-pack generation job. Given this roadmap item, produce the EXACT params for a web template generator.\n\nTITLE: ${task.title}\nDESCRIPTION: ${task.description}\nACCEPTANCE CRITERIA: ${(task.acceptance_criteria || []).join('; ')}\n\nReturn JSON with: business_name (a fitting fictional brand for this category), industry, description, target_audience, tone, style_preferences (specific design direction), reference_url (a real, well-known site in this category to analyze for inspiration, or null), and accents (array of {name,color} with 5 distinct accent colors).`,
    model: 'gemini_3_1_pro',
    response_json_schema: {
      type: 'object',
      properties: {
        business_name: { type: 'string' }, industry: { type: 'string' },
        description: { type: 'string' }, target_audience: { type: 'string' },
        tone: { type: 'string' }, style_preferences: { type: 'string' },
        reference_url: { type: 'string' },
        accents: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, color: { type: 'string' } } } }
      }
    }
  });
  const params = extractRes || {};
  if (!params.business_name) params.business_name = task.title;
  if (!params.accents || !params.accents.length) delete params.accents;
  log.push(`Derived params: ${params.business_name} / ${params.industry} / ref=${params.reference_url || 'none'}`);

  const result = await generateTemplatePackCore(base44, orgId, params);
  log.push(`Built ${result.created.length} packs (base + variants)`);
  return {
    summary: `Generated ${result.created.length} template packs for "${params.business_name}" (${params.industry}). Packs: ${result.created.map(c => c.name).join(', ')}`,
    packs: result.created,
    files_touched: result.created.map(c => c.id)
  };
}

async function buildOptimizationPhase(base44, orgId, task, log) {
  // Self-optimizing: assess current system state and propose + record optimizations
  const [enhancements, repairTasks, packs] = await Promise.all([
    base44.asServiceRole.entities.SystemEnhancement.filter({ organization_id: orgId }, '-created_date', 100),
    base44.asServiceRole.entities.RepairTask.filter({ organization_id: orgId, status: { $in: ['identified', 'in_progress', 'blocked'] } }, '-created_date', 50).catch(() => []),
    base44.asServiceRole.entities.DesignPack.filter({ organization_id: orgId }, '-created_date', 100).catch(() => [])
  ]);
  const state = {
    total_enhancements: enhancements.length,
    pending: enhancements.filter(e => e.status === 'pending').length,
    in_progress: enhancements.filter(e => e.status === 'in_progress').length,
    validated: enhancements.filter(e => e.status === 'validated').length,
    failed: enhancements.filter(e => e.status === 'failed').length,
    open_repairs: repairTasks.length,
    total_packs: packs.length
  };
  log.push(`System state: ${JSON.stringify(state)}`);

  const optRes = await base44.integrations.Core.InvokeLLM({
    prompt: `You are an autonomous site & system optimizer. Given the current system state, propose the highest-impact NEXT optimization action for this roadmap item. Be concrete and actionable.\n\nROADMAP ITEM: ${task.title} — ${task.description}\nSYSTEM STATE: ${JSON.stringify(state)}\n\nReturn JSON: { action (one concrete next step), rationale, safe_to_auto_apply (boolean), expected_impact }`,
    model: 'gemini_3_1_pro',
    response_json_schema: {
      type: 'object',
      properties: {
        action: { type: 'string' }, rationale: { type: 'string' },
        safe_to_auto_apply: { type: 'boolean' }, expected_impact: { type: 'string' }
      }
    }
  });
  const proposal = optRes || {};
  log.push(`Optimization proposal: ${proposal.action} (auto-apply=${proposal.safe_to_auto_apply})`);

  // Record risky proposals as a RepairTask for human review; safe ones as a note
  if (proposal.safe_to_auto_apply === false) {
    try {
      await base44.asServiceRole.entities.RepairTask.create({
        organization_id: orgId,
        area: 'quality',
        check_name: 'autonomous_optimizer',
        description: `${proposal.action} — ${proposal.rationale || ''}`,
        fix_strategy: proposal.expected_impact || '',
        status: 'identified',
        priority: 'medium'
      });
      log.push('Queued as RepairTask for review (risky change).');
    } catch (e) {}
  }

  return {
    summary: `Optimization cycle for "${task.title}". State: ${state.validated}/${state.total_enhancements} validated, ${state.open_repairs} open repairs. Proposal: ${proposal.action}.`,
    proposal,
    files_touched: []
  };
}

async function buildGenericPhase(base44, orgId, task, log) {
  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `You are an autonomous build agent. Produce a concrete implementation plan and the first deliverable for this roadmap item.\n\nTITLE: ${task.title}\nDESCRIPTION: ${task.description}\nACCEPTANCE CRITERIA: ${(task.acceptance_criteria || []).join('; ')}\n\nReturn JSON: { summary (what was built/planned), steps (array of strings), next_action }`,
    model: 'gemini_3_1_pro',
    response_json_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        steps: { type: 'array', items: { type: 'string' } },
        next_action: { type: 'string' }
      }
    }
  });
  const out = res || {};
  log.push(`Generic build: ${out.summary || 'planned'}`);
  return { summary: out.summary || `Planned: ${task.title}`, steps: out.steps || [], files_touched: [] };
}

// ---- VALIDATE (LLM-as-judge) ----

async function validateBuild(base44, orgId, task, buildResult, log) {
  try {
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a strict QA validator. Decide whether this build output satisfies the acceptance criteria.\n\nROADMAP ITEM: ${task.title}\nACCEPTANCE CRITERIA:\n${(task.acceptance_criteria || []).map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\nBUILD OUTPUT:\n${buildResult.summary}\n${buildResult.packs ? `Packs created: ${buildResult.packs.length}` : ''}\n${buildResult.proposal ? `Proposal: ${JSON.stringify(buildResult.proposal)}` : ''}\n\nReturn JSON: { pass (boolean), notes (which criteria met/unmet and why) }`,
      model: 'gemini_3_1_pro',
      response_json_schema: {
        type: 'object',
        properties: { pass: { type: 'boolean' }, notes: { type: 'string' } }
      }
    });
    const v = res || { pass: false, notes: 'No validation returned' };
    log.push(`VALIDATION: ${v.pass ? 'PASS' : 'FAIL'} — ${v.notes}`);
    return v;
  } catch (e) {
    log.push(`VALIDATION ERROR: ${e.message}`);
    return { pass: false, notes: `Validator error: ${e.message}` };
  }
}

// ---- REFLECT (self-reflection) ----

async function reflectOnResult(base44, orgId, task, buildResult, validation, log) {
  try {
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a self-reflection agent. Given the build and its validation, reflect on what went well, what to improve next iteration, and whether the system is healthier.\n\nITEM: ${task.title}\nBUILD: ${buildResult.summary}\nVALIDATION PASS: ${validation.pass}\nVALIDATION NOTES: ${validation.notes}\n\nReturn JSON: { pass (boolean — true if this iteration moved the system forward), notes (concise reflection + next improvement) }`,
      model: 'gemini_3_flash'
    });
    const r = res || { pass: validation.pass, notes: 'No reflection returned' };
    log.push(`REFLECTION: ${r.pass ? 'forward' : 'stalled'} — ${r.notes}`);
    return r;
  } catch (e) {
    return { pass: validation.pass, notes: `Reflection error: ${e.message}` };
  }
}

// ---- FINALIZE ----

async function finalize(base44, orgId, task, outcome) {
  await base44.asServiceRole.entities.SystemEnhancement.update(task.id, {
    status: outcome.status,
    validation_result: outcome.validation_result,
    validation_notes: outcome.validation_notes,
    implementation_notes: outcome.implementation_notes,
    audit_result: outcome.audit_result,
    audit_notes: outcome.audit_notes,
    files_touched: outcome.files_touched || []
  });
  try {
    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'autonomous_build_cycle',
      action: 'cycle',
      status: outcome.status === 'validated' ? 'success' : 'info',
      summary: `${task.enhancement_id} ${task.title} → ${outcome.status} (validation ${outcome.validation_result})`,
      evidence: { enhancement_id: task.enhancement_id, status: outcome.status, validation: outcome.validation_result }
    });
  } catch (e) {}
}