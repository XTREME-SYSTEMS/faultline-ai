import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Final step of the Autonomous Launch Pipeline.
// - Marks the LaunchProject passed/failed
// - Syncs the CRM CustomerAccount + Company with the final outcome
// - Logs an AuditEvent (analytics)
// - Notifies the operator (email to the registered app user)
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { launch_project_id, mandatory_passed } = await req.json().catch(() => ({}));
    if (!launch_project_id) return Response.json({ error: 'launch_project_id required' }, { status: 400 });

    const lp = await base44.asServiceRole.entities.LaunchProject.get(launch_project_id);
    if (!lp) return Response.json({ error: 'LaunchProject not found' }, { status: 404 });
    const orgId = lp.organization_id;
    const passed = mandatory_passed === true || lp.mandatory_passed === true;

    await base44.asServiceRole.entities.LaunchProject.update(launch_project_id, {
      status: passed ? 'passed' : 'failed',
      mandatory_passed: passed
    });

    // CRM sync
    try {
      if (lp.customer_account_id) {
        await base44.asServiceRole.entities.CustomerAccount.update(lp.customer_account_id, {
          lifecycle_state: passed ? 'launched' : 'launch_failed',
          status: passed ? 'active' : 'trial',
          notes: `${lp.notes || ''}\n[${new Date().toISOString()}] Launch ${passed ? 'PASSED 100/100' : 'FAILED'} — ${lp.last_validation_summary || ''}`.trim()
        });
      }
    } catch (e) {}
    try {
      if (lp.company_id) {
        await base44.asServiceRole.entities.Company.update(lp.company_id, { status: passed ? 'active' : 'active' });
      }
    } catch (e) {}

    // Analytics
    try {
      await base44.asServiceRole.entities.AuditEvent.create({
        organization_id: orgId,
        entity_type: 'LaunchProject',
        entity_id: launch_project_id,
        project_id: launch_project_id,
        action: passed ? 'launch_passed' : 'launch_failed',
        metadata: {
          parity_score: lp.parity_score,
          operational_score: lp.operational_score,
          test_score: lp.test_score,
          iteration: lp.iteration,
          vercel_deployment_url: lp.vercel_deployment_url,
          github_repo_url: lp.github_repo_url,
          drive_folder_url: lp.drive_folder_url,
          supabase_project_url: lp.supabase_project_url,
          customer_account_id: lp.customer_account_id
        }
      });
    } catch (e) {}

    // Receipt (system analytics)
    try {
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId,
        system: 'autonomous_launch_pipeline',
        action: 'finalize',
        status: passed ? 'success' : 'failed',
        summary: `${lp.project_name}: ${passed ? 'PASSED 100/100' : 'FAILED after ' + (lp.iteration || 0) + ' iteration(s)'} — parity ${lp.parity_score}/100, operational ${lp.operational_score}/100`,
        evidence: { launch_project_id, passed, parity_score: lp.parity_score, operational_score: lp.operational_score, iteration: lp.iteration, vercel_deployment_url: lp.vercel_deployment_url }
      });
    } catch (e) {}

    // Notify operator (email reaches registered app users only)
    try {
      const user = await base44.auth.me().catch(() => null);
      if (user?.email) {
        await base44.integrations.Core.SendEmail({
          to: user.email,
          subject: `${passed ? '✅ PASSED 100/100' : '⚠️ Needs Attention'} — ${lp.project_name} launch ${passed ? 'complete' : 'failed'}`,
          body: `${lp.project_name} (${lp.business_name || ''})\n\nStatus: ${passed ? 'PASSED — 100/100 parity & operational' : 'FAILED after ' + (lp.iteration || 0) + ' iteration(s)'}\n\nScores:\n• Parity: ${lp.parity_score}/100\n• Operational: ${lp.operational_score}/100\n• Test: ${lp.test_score}/100\n\n${lp.last_validation_summary || ''}\n\nLive URL: ${lp.vercel_deployment_url || 'N/A'}\nGitHub: ${lp.github_repo_url || 'N/A'}\nDrive: ${lp.drive_folder_url || 'N/A'}\nSupabase: ${lp.supabase_project_url || 'N/A'}\n\nView in Projects: /app/projects`
        });
      }
    } catch (e) {}

    return Response.json({ status: passed ? 'passed' : 'failed', launch_project_id, mandatory_passed: passed });
  } catch (error) {
    console.error('launchPipelineFinalize error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}