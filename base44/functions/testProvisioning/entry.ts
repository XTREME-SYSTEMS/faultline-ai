import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { slugify, createDriveFolder, createGitHubRepo, createSupabaseProject, createVercelProject, disableVercelSso } from '../../shared/launchInfra.ts';

// Autonomous end-to-end provisioning test for Drive, GitHub, Vercel, and Supabase.
// Creates a real (test) resource in each service, reports status + URLs, and logs
// a receipt. Designed to be triggered from the Command Center to validate that all
// launch-pipeline infrastructure is healthy and tokens/scopes are valid.
export default async function(req) {
  const base44 = createClientFromRequest(req);
  const stamp = Date.now().toString(36);
  const baseName = `fl-test-${stamp}`;
  const results = { drive: null, github: null, vercel: null, supabase: null };
  const errors = {};
  let orgId = null;

  try {
    const user = await base44.auth.me().catch(() => null);
    orgId = user?.data?.organization_id || null;
  } catch (e) {}

  const log = (svc, status, detail) => { results[svc] = { status, ...detail }; };

  // 1. Google Drive (via connector)
  try {
    const conn = await base44.asServiceRole.connectors.getConnection('googledrive');
    if (!conn?.accessToken) throw new Error('Google Drive connector not authorized');
    const folder = await createDriveFolder(conn.accessToken, `${baseName} test`);
    log('drive', 'pass', { url: folder.url, id: folder.id });
  } catch (e) { errors.drive = e.message; log('drive', 'fail', { error: e.message }); }

  // 2. GitHub
  try {
    const ghConn = await base44.asServiceRole.connectors.getConnection('github');
    if (!ghConn?.accessToken) throw new Error('GitHub connector not authorized');
    const repo = await createGitHubRepo(ghConn.accessToken, slugify(baseName));
    log('github', 'pass', { url: repo.url, name: repo.name, owner: repo.owner });
  } catch (e) { errors.github = e.message; log('github', 'fail', { error: e.message }); }

  // 3. Vercel
  try {
    const token = secrets.get('VERCEL_TOKEN');
    if (!token) throw new Error('VERCEL_TOKEN secret not set');
    const teamId = secrets.get('VERCEL_TEAM_ID') || null;
    const slug = slugify(baseName);
    const vp = await createVercelProject(token, teamId, slug);
    try { await disableVercelSso(token, teamId, vp.id); } catch (e) { errors.vercel_sso = e.message; }
    log('vercel', 'pass', { id: vp.id, name: vp.name, url: `https://vercel.com/${teamId ? teamId + '/' : ''}${slug}` });
  } catch (e) { errors.vercel = e.message; log('vercel', 'fail', { error: e.message }); }

  // 4. Supabase
  try {
    const supaConn = await base44.asServiceRole.connectors.getConnection('supabase');
    if (!supaConn?.accessToken) throw new Error('Supabase connector not authorized');
    const supa = await createSupabaseProject(supaConn.accessToken, slugify(baseName));
    log('supabase', 'pass', { id: supa.id, ref: supa.ref, url: supa.url, supabase_status: supa.status });
  } catch (e) { errors.supabase = e.message; log('supabase', 'fail', { error: e.message }); }

  const passed = Object.values(results).filter(r => r?.status === 'pass').length;
  const total = 4;

  // Receipt for audit trail
  try {
    if (orgId) {
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId,
        system: 'provisioning_test',
        action: 'end_to_end_test',
        status: passed === total ? 'success' : 'partial',
        summary: `Provisioning test: ${passed}/${total} services passed`,
        evidence: { baseName, results, errors: Object.keys(errors).length ? errors : null }
      });
    }
  } catch (e) {}

  return Response.json({
    status: passed === total ? 'pass' : 'partial',
    passed, total,
    baseName,
    results,
    errors: Object.keys(errors).length ? errors : undefined,
    summary: `${passed}/${total} provisioning services healthy`
  });
}