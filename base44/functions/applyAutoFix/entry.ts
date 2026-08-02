import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { qa_report_id, root_causes } = body;

    if (!root_causes || !Array.isArray(root_causes) || root_causes.length === 0) {
      return Response.json({ error: 'root_causes array required' }, { status: 400 });
    }

    // Use LLM to generate structured patches for each root cause
    const patchResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the FaultLine AI AutoCoder. You read root-cause analyses from the Sentinel's self-reflection and generate exact code patches. For each root cause, produce a structured patch with the exact file path, the exact string to find, and the exact replacement string.

ROOT CAUSES:
${JSON.stringify(root_causes, null, 2)}

For each root cause, generate a patch object with:
- file_path: The exact file path to modify
- find: The exact string to search for (must be unique in the file)
- replace: The exact replacement string
- description: What the fix does
- confidence: high/medium/low

Only generate patches you are highly confident about. If a root cause requires human judgment or a platform change, set confidence to "low" and explain why in the description. Do not generate patches for issues that are actually content-depth refinements — only structural/code fixes.`,
      response_json_schema: {
        type: 'object',
        properties: {
          patches: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                file_path: { type: 'string' },
                find: { type: 'string' },
                replace: { type: 'string' },
                description: { type: 'string' },
                confidence: { type: 'string', enum: ['high', 'medium', 'low'] }
              }
            }
          },
          skipped: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                root_cause: { type: 'string' },
                reason: { type: 'string' }
              }
            }
          },
          summary: { type: 'string' }
        }
      }
    });

    // Record the auto-fix attempt
    const highConfidencePatches = (patchResult.patches || []).filter(p => p.confidence === 'high');
    const lowConfidencePatches = (patchResult.patches || []).filter(p => p.confidence === 'low');

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'autocoder',
      action: 'apply_auto_fix',
      status: 'success',
      summary: `AutoCoder generated ${(patchResult.patches || []).length} patches (${highConfidencePatches.length} high confidence, ${lowConfidencePatches.length} low confidence, ${(patchResult.skipped || []).length} skipped)`,
      evidence: {
        qa_report_id: qa_report_id || '',
        patches_generated: (patchResult.patches || []).length,
        high_confidence: highConfidencePatches.length,
        skipped: (patchResult.skipped || []).length,
        patches: highConfidencePatches.map(p => ({ file: p.file_path, description: p.description }))
      }
    });

    // Update the SystemHealthScore hardening count
    const latestScore = await base44.asServiceRole.entities.SystemHealthScore.filter({ organization_id: orgId }, '-created_date', 1);
    if (latestScore.length > 0) {
      await base44.asServiceRole.entities.SystemHealthScore.update(latestScore[0].id, {
        hardening_actions_count: (latestScore[0].hardening_actions_count || 0) + highConfidencePatches.length,
        last_hardened_at: new Date().toISOString()
      });
    }

    return Response.json({
      status: 'success',
      patches: patchResult.patches || [],
      skipped: patchResult.skipped || [],
      high_confidence_count: highConfidencePatches.length,
      summary: patchResult.summary,
      note: 'High-confidence patches are ready for operator review and application. Low-confidence patches require human judgment.'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}