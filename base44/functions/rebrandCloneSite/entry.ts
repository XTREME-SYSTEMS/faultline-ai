import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { deployToVercelMultiFile } from '../../shared/launchInfra.ts';

// Rebrand a deployed multi-page clone in place:
// 1. Pull every HTML file from the clone's GitHub repo (via GitHub OAuth connector).
// 2. Replace the old brand name with the new one (text, titles, meta).
// 3. Inject a runtime logo-swap script that forces every header/nav logo <img>
//    to render the new logo URL.
// 4. Redeploy all files to the SAME Vercel project (new production deployment).
// 5. Assign a custom domain to that Vercel project.
// 6. Update the LaunchProject record with the new brand + domain.

function buildLogoSwapScript(logoUrl: string, brandName: string): string {
  return `
<script>
(function(){
  var LOGO='${logoUrl}';
  var BRAND='${brandName}';
  function swapLogos(){
    var imgs=document.querySelectorAll('img');
    imgs.forEach(function(img){
      var ctx=img.closest('header,nav,[class*="logo" i],[class*="brand" i],a[href="/"],a[href=""]');
      if(!ctx) return;
      if(img.width>300||img.height>200) return;
      img.src=LOGO; img.srcset=''; img.removeAttribute('srcset');
      img.style.maxHeight='40px'; img.style.width='auto'; img.style.height='auto'; img.style.objectFit='contain';
    });
    document.querySelectorAll('header svg, nav svg, [class*="logo" i] svg').forEach(function(svg){
      if(svg.closest('header,nav,[class*="logo" i]')){
        var wrap=document.createElement('div'); wrap.style.display='inline-flex'; wrap.style.alignItems='center';
        var nImg=document.createElement('img'); nImg.src=LOGO; nImg.style.maxHeight='40px'; nImg.style.width='auto'; nImg.style.height='auto'; nImg.style.objectFit='contain';
        wrap.appendChild(nImg); svg.replaceWith(wrap);
      }
    });
    document.querySelectorAll('a,span,div,h1,h2').forEach(function(el){
      if(el.children.length>2) return;
      var t=(el.textContent||'').trim();
      if(/^(envato\\s*elements?|envato)$/i.test(t) && t.length<30){ el.textContent=BRAND; }
    });
    if(document.title) document.title=document.title.replace(/envato\\s*elements?/gi,BRAND).replace(/envato/gi,BRAND);
    document.querySelectorAll('meta[name="description"],meta[property*="title"],meta[name="application-name"]').forEach(function(m){
      var c=m.getAttribute('content');
      if(c) m.setAttribute('content',c.replace(/envato\\s*elements?/gi,BRAND).replace(/envato/gi,BRAND));
    });
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',swapLogos);}else{swapLogos();}
  setTimeout(swapLogos,1500);setTimeout(swapLogos,3000);
})();
</script>`;
}

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    const body = await req.json().catch(() => ({}));
    const { launch_project_id, new_brand_name, logo_url, domain, organization_id } = body;
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

    let projectName: string;
    try { projectName = new URL(vercelUrl).hostname.split('.')[0]; } catch {
      return Response.json({ error: 'Could not parse Vercel project name' }, { status: 400 });
    }

    const ghMatch = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!ghMatch) return Response.json({ error: 'Could not parse GitHub repo' }, { status: 400 });
    const ghOwner = ghMatch[1], ghRepo = ghMatch[2].replace(/\.git$/, '');

    // The clone's GitHub repo was created via the GitHub OAuth connector.
    const ghConn = await base44.asServiceRole.connectors.getConnection('github');
    const ghToken = ghConn?.accessToken;
    const vercelToken = secrets.get('VERCEL_TOKEN');
    const teamId = secrets.get('VERCEL_TEAM_ID') || null;
    if (!ghToken) return Response.json({ error: 'GitHub connector not authorized' }, { status: 500 });
    if (!vercelToken) return Response.json({ error: 'VERCEL_TOKEN secret not set' }, { status: 500 });

    console.log(`Rebranding ${projectName}: "${new_brand_name}" + logo + domain ${domain || '(none)'}`);

    const ghHeaders = { Authorization: `Bearer ${ghToken}`, Accept: 'application/vnd.github+json', 'User-Agent': 'FaultLine-Rebrand', 'X-GitHub-Api-Version': '2022-11-28' };

    // 1. Get the repo's default branch, then fetch the file tree
    const repoRes = await fetch(`https://api.github.com/repos/${ghOwner}/${ghRepo}`, { headers: ghHeaders });
    if (!repoRes.ok) return Response.json({ error: `GitHub repo fetch failed (${repoRes.status})` }, { status: 502 });
    const repoData = await repoRes.json();
    const defaultBranch = repoData.default_branch || 'main';

    const treeRes = await fetch(`https://api.github.com/repos/${ghOwner}/${ghRepo}/git/trees/${defaultBranch}?recursive=1`, { headers: ghHeaders });
    if (!treeRes.ok) return Response.json({ error: `Could not fetch repo tree: ${treeRes.status}` }, { status: 502 });
    const tree = await treeRes.json();

    const htmlFiles = (tree.tree || []).filter((f: any) => f.type === 'blob' && /\.html?$/i.test(f.path) && f.path !== '404.html');
    if (htmlFiles.length === 0) return Response.json({ error: 'No HTML files found in repo' }, { status: 500 });
    console.log(`Found ${htmlFiles.length} HTML files in repo (branch: ${defaultBranch})`);

    // 2. Download, rebrand, and collect each file
    const logoScript = buildLogoSwapScript(logo_url, new_brand_name);
    const files: Array<{ file: string; data: Uint8Array }> = [];
    let textReplacements = 0;

    for (const f of htmlFiles) {
      try {
        const rawRes = await fetch(`https://raw.githubusercontent.com/${ghOwner}/${ghRepo}/${defaultBranch}/${f.path}`, { headers: ghHeaders });
        if (!rawRes.ok) { console.error(`Skip ${f.path}: fetch failed (${rawRes.status})`); continue; }
        let html = await rawRes.text();

        const beforeLen = html.length;
        html = html.split('Envato Elements').join(new_brand_name);
        html = html.split('Envato elements').join(new_brand_name);
        html = html.split('envato elements').join(new_brand_name);
        html = html.split('Envato').join(new_brand_name);
        html = html.split('envato').join(new_brand_name);
        html = html.replace(/<title>([^<]*)<\/title>/i, (m, t) => `<title>${String(t).replace(/envato\s*elements?/gi, new_brand_name).replace(/envato/gi, new_brand_name)}</title>`);
        html = html.replace(/(<meta\s+name="description"\s+content=")([^"]*)(")/i, (m, a, c, b) => `${a}${String(c).replace(/envato\s*elements?/gi, new_brand_name).replace(/envato/gi, new_brand_name)}${b}`);
        if (html.length !== beforeLen) textReplacements++;

        if (html.includes('</body>')) {
          html = html.replace('</body>', logoScript + '\n</body>');
        } else {
          html += logoScript;
        }
        files.push({ file: f.path, data: new TextEncoder().encode(html) });
      } catch (e) {
        console.error(`Failed to rebrand ${f.path}: ${e.message}`);
      }
    }

    if (files.length === 0) return Response.json({ error: 'No files could be rebranded' }, { status: 500 });
    console.log(`Rebranded ${files.length} files, ${textReplacements} had text changes`);

    // 3. Redeploy all files to the SAME Vercel project
    const deploy = await deployToVercelMultiFile(vercelToken, teamId, projectName, project.vercel_project_url || undefined, files);
    const newVercelUrl = deploy.url ? `https://${deploy.url}` : vercelUrl;
    console.log(`Redeployed to Vercel: ${newVercelUrl}`);

    // 4. Assign custom domain (if provided)
    let domainResult: any = null;
    if (domain) {
      const teamParam = teamId ? `?teamId=${teamId}` : '';
      const addRes = await fetch(`https://api.vercel.com/v8/projects/${encodeURIComponent(projectName)}/domains${teamParam}`, {
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

    // 5. Update the LaunchProject record
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
        rebranded_at: new Date().toISOString(),
        files_rebranded: files.length,
        domain_assignment: domainResult,
      },
    });

    // 6. Push rebranded files back to GitHub (best-effort)
    let githubPushed = 0;
    for (const f of files.slice(0, 30)) {
      try {
        const content = new TextDecoder().decode(f.data);
        const checkRes = await fetch(`https://api.github.com/repos/${ghOwner}/${ghRepo}/contents/${f.file}?ref=${defaultBranch}`, { headers: ghHeaders });
        let sha: string | undefined;
        if (checkRes.ok) { const ex = await checkRes.json(); sha = ex.sha; }
        const pushBody: any = { message: `Rebrand: ${new_brand_name}`, content: btoa(unescape(encodeURIComponent(content))) };
        if (sha) pushBody.sha = sha;
        const pushRes = await fetch(`https://api.github.com/repos/${ghOwner}/${ghRepo}/contents/${f.file}`, {
          method: 'PUT', headers: { ...ghHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(pushBody),
        });
        if (pushRes.ok) githubPushed++;
      } catch (e) { /* best-effort */ }
    }
    console.log(`Pushed ${githubPushed} rebranded files back to GitHub`);

    return Response.json({
      status: 'success',
      launch_project_id,
      new_brand_name,
      logo_url,
      vercel_url: newVercelUrl,
      files_rebranded: files.length,
      text_replacements: textReplacements,
      github_pushed: githubPushed,
      domain: domainResult,
      message: `Rebranded ${files.length} pages to "${new_brand_name}" with new logo${domain ? ` and assigned domain ${domain}` : ''}. Add the DNS verification record at your registrar to make the domain live.`,
    });
  } catch (error) {
    console.error('rebrandCloneSite error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}