import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Process Code Queue — the queue processor for the Autonomous Code Engine workflow.
//
// Pulls the next queued code task from BuildQueueItem, runs the autonomous coding
// system on it, and updates the queue item with the result. Called every 2 hours
// by the Autonomous Code Engine workflow.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    // 1. FIND the next queued code task (highest priority first)
    const queuedItems = await base44.asServiceRole.entities.BuildQueueItem.filter(
      { organization_id: orgId, build_type: 'code', status: 'queued' },
      '-created_date', 10
    );

    if (queuedItems.length === 0) {
      return Response.json({
        status: 'success',
        processed: false,
        message: 'No queued code tasks found'
      });
    }

    // Sort by priority (urgent > high > normal > low)
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    const sorted = queuedItems.sort((a, b) =>
      (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3)
    );
    const task = sorted[0];

    // 2. MARK as processing
    try {
      await base44.asServiceRole.entities.BuildQueueItem.update(task.id, {
        status: 'processing',
        metadata: { started_at: new Date().toISOString() }
      });
    } catch (e) { /* non-blocking */ }

    // 3. RUN the autonomous coding system
    const taskInput = task.input || {};
    const codeRes = await base44.functions.invoke('autonomousCodeSystem', {
      task: taskInput.task || task.description || task.name,
      language: taskInput.language || 'javascript',
      context: taskInput.context || '',
      max_iterations: taskInput.max_iterations || 3,
      file_name: taskInput.file_name,
      organization_id: orgId
    });
    const result = codeRes?.data || codeRes;

    // 4. UPDATE the queue item with the result
    try {
      await base44.asServiceRole.entities.BuildQueueItem.update(task.id, {
        status: result.passed ? 'completed' : 'failed',
        metadata: {
          ...task.metadata,
          completed_at: new Date().toISOString(),
          result: {
            passed: result.passed,
            score: result.validation?.score,
            file_name: result.file_name,
            file_url: result.file_url,
            deliverable_id: result.deliverable_id,
            iterations: result.iterations
          }
        }
      });
    } catch (e) { /* non-blocking */ }

    return Response.json({
      status: 'success',
      processed: true,
      task_name: task.name,
      passed: result.passed,
      score: result.validation?.score,
      file_name: result.file_name,
      file_url: result.file_url,
      deliverable_id: result.deliverable_id,
      iterations: result.iterations,
      message: `Processed code task "${task.name}": ${result.passed ? 'PASSED' : 'NEEDS_REVIEW'} (${result.validation?.score || 0}/100)`
    });
  } catch (error) {
    console.error('processCodeQueue error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}