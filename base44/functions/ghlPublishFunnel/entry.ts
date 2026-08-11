import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Injected into every published funnel page so <form data-ghl-form="FORM_ID">
// submissions POST to the public ghlFormSubmit endpoint and create CRM records.
const FORM_SCRIPT = `<script>(function(){document.addEventListener('submit',async function(e){var f=e.target;if(!f||!f.dataset.ghlForm)return;e.preventDefault();var d={};new FormData(f).forEach(function(v,k){d[k]=v;});d._form_id=f.dataset.ghlForm;try{await fetch('https://fault-line.base44.app/functions/ghlFormSubmit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});}catch(err){}if(f.dataset.ghlRedirect){window.location.href=f.dataset.ghlRedirect;}else{alert('Thank you! We will be in touch shortly.');f.reset();}});})();</script>`;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { funnel_id } = await req.json().catch(() => ({}));
    if (!funnel_id) return Response.json({ error: 'funnel_id required' }, { status: 400 });

    const funnel = await base44.asServiceRole.entities.GhlFunnel.get(funnel_id);
    if (!funnel || funnel.organization_id !== orgId) {
      return Response.json({ error: 'Funnel not found' }, { status: 404 });
    }

    const pages = await base44.asServiceRole.entities.GhlPage.filter({ funnel_id }, '-created_date', 50);
    if (pages.length === 0) return Response.json({ error: 'No pages in funnel' }, { status: 400 });

    const landing = pages.find(p => p.page_type === 'landing') || pages[0];
    let html = landing.html || '';
    if (!html.trim()) return Response.json({ error: 'Landing page has no HTML' }, { status: 400 });

    // Inject the form handler before </body> (or append).
    if (html.includes('</body>')) html = html.replace('</body>', FORM_SCRIPT + '</body>');
    else html = html + FORM_SCRIPT;

    const slug = (funnel.slug || funnel.name || 'funnel').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 20) || 'funnel';
    const lp = await base44.functions.invoke('launchProject', {
      project_name: `lgny-${slug}-${Date.now().toString(36).slice(-4)}`,
      website_html: html,
    });
    const ld = lp?.data || lp;
    if (ld.status !== 'success') throw new Error('Launch failed: ' + JSON.stringify(ld.errors || ld));
    const vercelUrl = ld.results?.vercel?.deploy?.url || ld.results?.vercel?.deploy?.alias?.[0];

    await base44.asServiceRole.entities.GhlFunnel.update(funnel_id, {
      vercel_url: vercelUrl, status: 'published', published_at: new Date().toISOString(),
    });
    await base44.asServiceRole.entities.GhlPage.update(landing.id, { is_published: true });

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId, system: 'website_generator', action: 'ghl_funnel_publish',
      status: 'success', summary: `Published funnel ${funnel.name}`,
      evidence: { funnel_id, vercel_url: vercelUrl },
    });

    return Response.json({ status: 'success', vercel_url: vercelUrl, funnel_id });
  } catch (error) {
    console.error('ghlPublishFunnel error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}