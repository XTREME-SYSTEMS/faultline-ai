import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { deployToVercelMultiFile } from '../../shared/launchInfra.ts';
import { buildLogoSwapScript, buildBrandVariants, replaceBrandCI, escapeRegex } from '../../shared/rebrandUtils.ts';

// Deep rebrand: pulls every HTML file from the clone's GitHub repo and performs
// a COMPREHENSIVE brand sweep — replacing the old brand name EVERYWHERE it
// appears (visible text, titles, meta tags, Open Graph, Twitter cards, JSON-LD
// structured data, alt text, aria-labels, schema.org markup, application-name,
// canonical URLs, favicon references, and inline CSS/JS references). Then
// injects a runtime logo-swap script, redeploys to Vercel, assigns a custom
// domain, pushes back to GitHub, and verifies no old-brand references remain.

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    const body = await req.json().catch(() => ({}));
    const {
      launch_project_id,
      new_brand_name,
      logo_url,
      domain,
      old_brand_name,
      organization_id,
      verify = true,
    } = body;
    if (!launch_project_id || !new_brand_name || !logo_url) {
      return Response.json({ error: 'launch_project_id, new_brand_name, logo_url required' }, { status: 400 });
    }
    const targetOrg = organization_id || orgId;

    const project = await base44.asServiceRole.entities.LaunchProject.get(launch_project_id);
    if (!project) return Response.json({ error: 'LaunchProject not found' }, { status: 404 });

    const vercelUrl = project.vercel_deployment_url;
    const githubUrl = project.github_repo_url;
    if (!vercelUrl || !githubUrl) {
      return Response.json({ error: 'LaunchProject missing vercel_deployment_url or github_repo_url' }, { status: 400 });
    }

    // Determine the old brand name — use provided value, or fall back to
    // business_name / project_name, or default to "Envato" for Envato clones.
    const oldBrand = old_brand_name || project.business_name || project.project_name || 'Envato Elements';

    let projectName: string;
    try { projectName = new URL(vercelUrl).hostname.split('.')[0]; } catch {
      return Response.json({ error: 'Could not parse Vercel project name' }, { status: 400 });
    }

    const ghMatch = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!ghMatch) return Response.json({ error: 'Could not parse GitHub repo' }, { status: 400 });
    const ghOwner = ghMatch[1], ghRepo = ghMatch[2].replace(/\.git$/, '');

    const ghConn = await base44.asServiceRole.connectors.getConnection('github');
    const ghToken = ghConn?.accessToken;
    const vercelToken = secrets.get('VERCEL_TOKEN');
    const teamId = secrets.get('VERCEL_TEAM_ID') || null;
    if (!ghToken) return Response.json({ error: 'GitHub connector not authorized' }, { status: 500 });
    if (!vercelToken) return Response.json({ error: 'VERCEL_TOKEN secret not set' }, { status: 500 });

    console.log(`Deep rebrand ${projectName}: "${oldBrand}" → "${new_brand_name}" + logo + domain ${domain || '(none)'}`);

    const ghHeaders = { Authorization: `Bearer ${ghToken}`, Accept: 'application/vnd.github+json', 'User-Agent': 'FaultLine-Rebrand', 'X-GitHub-Api-Version': '2022-11-28' };

    // 1. Get the repo's default branch + file tree
    const repoRes = await fetch(`https://api.github.com/repos/${ghOwner}/${ghRepo}`, { headers: ghHeaders });
    if (!repoRes.ok) return Response.json({ error: `GitHub repo fetch failed (${repoRes.status})` }, { status: 502 });
    const repoData = await repoRes.json();
    const defaultBranch = repoData.default_branch || 'main';

    const treeRes = await fetch(`https://api.github.com/repos/${ghOwner}/${ghRepo}/git/trees/${defaultBranch}?recursive=1`, { headers: ghHeaders });
    if (!treeRes.ok) return Response.json({ error: `Could not fetch repo tree: ${treeRes.status}` }, { status: 502 });
    const tree = await treeRes.json();

    // Process ALL HTML files + JSON-LD-rich files + manifest.json + vercel.json
    const htmlFiles = (tree.tree || []).filter((f: any) => f.type === 'blob' && /\.html?$/i.test(f.path) && f.path !== '404.html');
    const manifestFiles = (tree.tree || []).filter((f: any) => f.type === 'blob' && /manifest\.json$/i.test(f.path));
    const allFiles = [...htmlFiles, ...manifestFiles];
    if (allFiles.length === 0) return Response.json({ error: 'No HTML files found in repo' }, { status: 500 });
    console.log(`Found ${htmlFiles.length} HTML files + ${manifestFiles.length} manifests (branch: ${defaultBranch})`);

    // 2. Build the brand variant list for comprehensive replacement
    const variants = buildBrandVariants(oldBrand);
    console.log(`Brand variants to replace: ${variants.join(', ')}`);

    // 3. Download, deep-rebrand, and collect each file
    const logoScript = buildLogoSwapScript(logo_url, new_brand_name);
    const files: Array<{ file: string; data: Uint8Array }> = [];
    const fileStats: Array<{ file: string; replacements: number; old_refs_remaining: number }> = [];

    for (const f of allFiles) {
      try {
        const rawRes = await fetch(`https://raw.githubusercontent.com/${ghOwner}/${ghRepo}/${defaultBranch}/${f.path}`, { headers: ghHeaders });
        if (!rawRes.ok) { console.error(`Skip ${f.path}: fetch failed (${rawRes.status})`); continue; }
        let content = await rawRes.text();
        const beforeLen = content.length;

        // === DEEP BRAND SWEEP ===
        // For HTML files: replace in ALL locations — text, tags, attributes,
        // JSON-LD, meta, og, twitter, schema, alt, aria-label, canonical.
        // For manifest.json: replace in name, short_name, description.
        if (/\.html?$/i.test(f.path)) {
          // 3a. Full case-insensitive sweep across the entire HTML document.
          // This catches: visible text, <title>, meta description, og:title,
          // og:site_name, og:description, twitter:title, twitter:description,
          // JSON-LD structured data, alt attributes, aria-label, application-name,
          // canonical URLs, schema.org markup, inline CSS/JS string literals.
          content = replaceBrandCI(content, oldBrand, new_brand_name);

          // 3b. Inject the runtime logo-swap script before </body>
          if (content.includes('</body>')) {
            content = content.replace('</body>', logoScript + '\n</body>');
          } else {
            content += logoScript;
          }
        } else {
          // manifest.json — replace brand in name/short_name/description
          content = replaceBrandCI(content, oldBrand, new_brand_name);
        }

        // Count remaining old-brand references (should be 0 after sweep)
        const remaining = (content.match(new RegExp(escapeRegex(oldBrand), 'gi')) || []).length;
        // Also count individual word references
        const words = oldBrand.trim().split(/\s+/).filter(w => w.length > 3);
        let wordRemaining = 0;
        for (const w of words) {
          wordRemaining += (content.match(new RegExp(escapeRegex(w), 'gi')) || []).length;
        }

        files.push({ file: f.path, data: new TextEncoder().encode(content) });
        fileStats.push({
          file: f.path,
          replacements: beforeLen - content.length !== 0 ? 1 : 0,
          old_refs_remaining: remaining + wordRemaining,
        });
      } catch (e) {
        console.error(`Failed to rebrand ${f.path}: ${e.message}`);
      }
    }

    if (files.length === 0) return Response.json({ error: 'No files could be rebranded' }, { status: 500 });
    const totalRemaining = fileStats.reduce((s, f) => s + f.old_refs_remaining, 0);
    console.log(`Deep-rebranded ${files.length} files. Old-brand refs remaining: ${totalRemaining}`);

    // 4. Redeploy all files to the SAME Vercel project
    const deploy = await deployToVercelMultiFile(vercelToken, teamId, projectName, project.vercel_project_url || undefined, files);
    // Fix double-https: Vercel returns hostname with or without protocol
    let newVercelUrl = deploy.url || '';
    if (newVercelUrl && !newVercelUrl.startsWith('http')) newVercelUrl = `https://${newVercelUrl}`;
    if (!newVercelUrl) newVercelUrl = vercelUrl;
    console.log(`Redeployed to Vercel: ${newVercelUrl}`);

    // 5. Assign custom domain (if provided) — use project ID, not project name
    let domainResult: any = null;
    if (domain) {
      const projectId = project.vercel_project_url || projectName;
      const teamParam = teamId ? `?teamId=${teamId}` : '';
      const addRes = await fetch(`https://api.vercel.com/v8/projects/${encodeURIComponent(projectId)}/domains${teamParam}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: domain }),
        signal: AbortSignal.timeout(15000),
      });
      const addData = await addRes.json().catch(() => ({}));
      if (addRes.ok) {
        domainResult = { status: 'success', domain, verification_record: addData.verification?.[0] || null, nameservers: ['ns1.vercel-dns.com', 'ns2.vercel-dns.com'] };
      } else if (addRes.status === 409 || /already/i.test(JSON.stringify(addData))) {
        domainResult = { status: 'already_assigned', domain, verification_record: null };
      } else {
        domainResult = { status: 'failed', error: addData.error?.message || `Vercel ${addRes.status}` };
      }
      console.log(`Domain assignment: ${domainResult.status}`);
    }

    // 6. Update the LaunchProject record
    await base44.asServiceRole.entities.LaunchProject.update(launch_project_id, {
      project_name: new_brand_name,
      business_name: new_brand_name,
      vercel_deployment_url: newVercelUrl,
      domain_name: domain || project.domain_name,
      metadata: {
        ...(project.metadata || {}),
        rebranded: true,
        rebrand_name: new_brand_name,
        rebrand_logo_url: logo_url,
        rebrand_old_name: oldBrand,
        rebranded_at: new Date().toISOString(),
        files_rebranded: files.length,
        old_refs_remaining: totalRemaining,
        domain_assignment: domainResult,
      },
    });

    // 7. Push rebranded files back to GitHub (best-effort, up to 50 files)
    let githubPushed = 0;
    for (const f of files.slice(0, 50)) {
      try {
        const fileContent = new TextDecoder().decode(f.data);
        const checkRes = await fetch(`https://api.github.com/repos/${ghOwner}/${ghRepo}/contents/${f.file}?ref=${defaultBranch}`, { headers: ghHeaders });
        let sha: string | undefined;
        if (checkRes.ok) { const ex = await checkRes.json(); sha = ex.sha; }
        const pushBody: any = { message: `Deep rebrand: ${oldBrand} → ${new_brand_name}`, content: btoa(unescape(encodeURIComponent(fileContent))) };
        if (sha) pushBody.sha = sha;
        const pushRes = await fetch(`https://api.github.com/repos/${ghOwner}/${ghRepo}/contents/${f.file}`, {
          method: 'PUT', headers: { ...ghHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(pushBody),
        });
        if (pushRes.ok) githubPushed++;
      } catch (e) { /* best-effort */ }
    }
    console.log(`Pushed ${githubPushed} rebranded files back to GitHub`);

    // 8. Verification — scan the deployed site for remaining old-brand refs
    let verification: any = null;
    if (verify && newVercelUrl) {
      try {
        const verifyRes = await fetch(newVercelUrl, { signal: AbortSignal.timeout(15000), redirect: 'follow' });
        if (verifyRes.ok) {
          const homeHtml = await verifyRes.text();
          const homeRemaining = (homeHtml.match(new RegExp(escapeRegex(oldBrand), 'gi')) || []).length;
          const words = oldBrand.trim().split(/\s+/).filter(w => w.length > 3);
          let homeWordRemaining = 0;
          for (const w of words) {
            homeWordRemaining += (homeHtml.match(new RegExp(escapeRegex(w), 'gi')) || []).length;
          }
          verification = {
            homepage_scanned: true,
            old_brand_refs_remaining: homeRemaining,
            old_word_refs_remaining: homeWordRemaining,
            clean: homeRemaining === 0 && homeWordRemaining === 0,
          };
        } else {
          verification = { homepage_scanned: false, error: `HTTP ${verifyRes.status}` };
        }
      } catch (e) {
        verification = { homepage_scanned: false, error: e.message };
      }
    }

    return Response.json({
      status: 'success',
      launch_project_id,
      old_brand_name: oldBrand,
      new_brand_name,
      logo_url,
      vercel_url: newVercelUrl,
      files_rebranded: files.length,
      github_pushed: githubPushed,
      old_refs_remaining: totalRemaining,
      domain: domainResult,
      verification,
      file_stats: fileStats.slice(0, 10),
      message: `Deep-rebranded ${files.length} files: "${oldBrand}" → "${new_brand_name}". ${totalRemaining} old-brand references remain in source. ${verification?.clean ? 'Homepage is clean.' : 'Homepage still has old references — may need a second pass.'}`,
    });
  } catch (error) {
    console.error('deepRebrandSite error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}