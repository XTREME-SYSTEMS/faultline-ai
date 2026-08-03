import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Business Orchestrator — manages business project lifecycle:
// - createProject: creates a BusinessProject from an idea + intake data
// - transitionPhase: moves project to next phase (with approval check)
// - createJob: creates an AgentJob for async processing
// - getIntakeQuestions: AI generates progressive intake questions
// All actions are authenticated, validated, and produce receipts.

const PHASE_ORDER = ['intake', 'discovery', 'viability', 'brand', 'model', 'products', 'website', 'leads', 'sales', 'marketing', 'financials', 'operations', 'launch', 'validation', 'complete'];

function slugify(text) {
  return text.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60);
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // ── CREATE PROJECT ──────────────────────────────────────────
    if (action === 'create_project') {
      const { idea, name, industry, location, audience, business_type, budget, experience_level, launch_speed, revenue_target, intake_responses } = body;
      if (!idea || !idea.trim()) return Response.json({ error: 'idea is required' }, { status: 400 });

      const projectName = name || idea.substring(0, 50);
      const slug = slugify(projectName) + '-' + Date.now().toString(36);

      const project = await base44.asServiceRole.entities.BusinessProject.create({
        organization_id: orgId,
        name: projectName,
        slug,
        idea: idea.trim(),
        industry: industry || '',
        location: location || '',
        audience: audience || '',
        business_type: business_type || '',
        budget: budget || '',
        experience_level: experience_level || '',
        launch_speed: launch_speed || '',
        revenue_target: revenue_target || '',
        current_phase: 'intake',
        status: 'active',
        progress: 5,
        owner_user_id: user.id,
        intake_complete: !!(industry && audience),
        metadata: {}
      });

      // Store intake responses if provided
      if (intake_responses && Array.isArray(intake_responses) && intake_responses.length > 0) {
        await base44.asServiceRole.entities.IntakeResponse.bulkCreate(
          intake_responses.map(r => ({
            organization_id: orgId,
            project_id: project.id,
            question: r.question,
            answer: r.answer || '',
            source: r.source || 'user',
            confidence: r.confidence || 1,
            phase: 'intake',
            field: r.field || ''
          }))
        );
      }

      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId,
        system: 'business_orchestrator',
        action: 'create_project',
        status: 'success',
        summary: `Created business project: ${projectName}`,
        evidence: { project_id: project.id, idea: idea.substring(0, 100) }
      });

      return Response.json({ status: 'success', project });
    }

    // ── TRANSITION PHASE ────────────────────────────────────────
    if (action === 'transition_phase') {
      const { project_id, target_phase, approval_required } = body;
      if (!project_id) return Response.json({ error: 'project_id is required' }, { status: 400 });
      if (!target_phase) return Response.json({ error: 'target_phase is required' }, { status: 400 });

      const project = await base44.asServiceRole.entities.BusinessProject.get(project_id);
      if (!project || project.organization_id !== orgId) return Response.json({ error: 'Project not found' }, { status: 404 });

      const currentIdx = PHASE_ORDER.indexOf(project.current_phase);
      const targetIdx = PHASE_ORDER.indexOf(target_phase);
      if (targetIdx < 0) return Response.json({ error: 'Invalid phase' }, { status: 400 });
      if (targetIdx <= currentIdx) return Response.json({ error: 'Cannot move backward or stay in same phase' }, { status: 400 });

      // Check approval if required (e.g., brand → model requires brand approval)
      if (approval_required) {
        const approvals = await base44.asServiceRole.entities.Approval.filter({
          organization_id: orgId,
          subject_type: 'phase_transition',
          subject_id: project_id,
          state: 'approved'
        });
        if (approvals.length === 0) {
          return Response.json({ error: 'Approval required for this phase transition', approval_required: true }, { status: 403 });
        }
      }

      const progress = Math.round((targetIdx / (PHASE_ORDER.length - 1)) * 100);
      const updated = await base44.asServiceRole.entities.BusinessProject.update(project_id, {
        current_phase: target_phase,
        progress
      });

      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId,
        system: 'business_orchestrator',
        action: 'transition_phase',
        status: 'success',
        summary: `Project ${project.name} moved to ${target_phase}`,
        evidence: { project_id, from: project.current_phase, to: target_phase }
      });

      return Response.json({ status: 'success', project: updated });
    }

    // ── CREATE JOB ──────────────────────────────────────────────
    if (action === 'create_job') {
      const { project_id, agent_type, job_type, phase, input, idempotency_key, approval_required } = body;
      if (!project_id || !agent_type || !job_type) return Response.json({ error: 'project_id, agent_type, job_type required' }, { status: 400 });

      const idemKey = idempotency_key || `${project_id}-${agent_type}-${job_type}-${Date.now()}`;

      // Check for existing job with same idempotency key
      const existing = await base44.asServiceRole.entities.AgentJob.filter({
        organization_id: orgId,
        idempotency_key: idemKey,
        status: { $in: ['queued', 'claimed', 'running'] }
      });
      if (existing.length > 0) {
        return Response.json({ status: 'duplicate', job: existing[0], message: 'Job already exists' });
      }

      const job = await base44.asServiceRole.entities.AgentJob.create({
        organization_id: orgId,
        project_id,
        agent_type,
        job_type,
        phase: phase || '',
        input: input || {},
        idempotency_key: idemKey,
        approval_state: approval_required ? 'pending' : 'not_required',
        status: 'queued',
        attempts: 0,
        max_attempts: 3,
        priority: body.priority || 0
      });

      return Response.json({ status: 'success', job });
    }

    // ── GET INTAKE QUESTIONS ────────────────────────────────────
    if (action === 'get_intake_questions') {
      const { idea, existing_answers } = body;
      if (!idea) return Response.json({ error: 'idea is required' }, { status: 400 });

      const answered = existing_answers || {};
      const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are a business discovery strategist. A user has submitted a business idea. Generate the NEXT most important clarifying question to ask them.

BUSINESS IDEA: "${idea}"

ANSWERS SO FAR: ${JSON.stringify(answered)}

Generate exactly ONE question that will help build a complete business. Ask about the most critical missing piece. Return JSON with:
- question: the question text (conversational, friendly, max 15 words)
- field: the project field this maps to (one of: industry, location, audience, business_type, budget, experience_level, launch_speed, revenue_target)
- options: array of 3-4 suggested answer options (short, practical)
- rationale: why this question matters (1 sentence)

If all critical fields are answered, return { "complete": true }.

Priority order for missing fields: industry > location > audience > business_type > budget > experience_level > launch_speed > revenue_target`,
        response_json_schema: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            field: { type: 'string' },
            options: { type: 'array', items: { type: 'string' } },
            rationale: { type: 'string' },
            complete: { type: 'boolean' }
          }
        }
      });

      return Response.json({ status: 'success', question: res });
    }

    // ── GET PROJECTS ────────────────────────────────────────────
    if (action === 'get_projects') {
      const projects = await base44.asServiceRole.entities.BusinessProject.filter({
        organization_id: orgId,
        status: { $ne: 'deleted' }
      }, '-created_date', 50);
      return Response.json({ status: 'success', projects });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('businessOrchestrator error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}