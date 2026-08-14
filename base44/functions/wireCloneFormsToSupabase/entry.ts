import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { slugify, createVercelProject, disableVercelSso, deployToVercel } from '../../shared/launchInfra.ts';

// Wires a deployed rebranded clone's forms to its provisioned Supabase backend.
// Injects a script that intercepts form submissions (demo request, partner apply,
// register) and POSTs them to the Supabase REST API using the anon key, then
// redeploys the updated HTML to Vercel.

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { source_url, clone_name } = body;
    if (!source_url) return Response.json({ error: 'source_url required' }, { status: 400 });

    const supabaseUrl = secrets.get('IBEAM_SUPABASE_URL');
    const anonKey = secrets.get('IBEAM_SUPABASE_ANON_KEY');
    if (!supabaseUrl || !anonKey) {
      return Response.json({ error: 'Supabase URL/anon key not set as secrets (IBEAM_SUPABASE_URL, IBEAM_SUPABASE_ANON_KEY)' }, { status: 500 });
    }

    // 1. Fetch current HTML
    const r = await fetch(source_url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WireCloneForms/1.0)' } });
    if (!r.ok) throw new Error(`Fetch failed (${r.status})`);
    let html = await r.text();

    // 2. Build the form-wiring script
    const wireScript = `
<script>
(function(){
  var SB_URL = ${JSON.stringify(supabaseUrl)};
  var SB_ANON = ${JSON.stringify(anonKey)};
  function fieldVal(fd, names){ for(var i=0;i<names.length;i++){ var v=fd.get(names[i]); if(v) return v; } return ''; }
  function tableFor(form){
    var sig = ((form.id||'')+' '+(form.name||'')+' '+(form.getAttribute('action')||'')+' '+(form.className||'')).toLowerCase();
    if(sig.indexOf('partner')>=0) return 'partner_applications';
    if(sig.indexOf('register')>=0||sig.indexOf('signup')>=0||sig.indexOf('sign-up')>=0) return 'estimator_profiles';
    return 'demo_leads';
  }
  function mapPayload(table, fd){
    var email = fieldVal(fd,['email','Email','work_email','user_email']);
    var phone = fieldVal(fd,['phone','Phone','phone_number','tel']);
    var first = fieldVal(fd,['first_name','firstName','fname','name']);
    var last = fieldVal(fd,['last_name','lastName','lname']);
    var company = fieldVal(fd,['company','Company','company_name','organization']);
    var trade = fieldVal(fd,['trade','trade_type','specialty','trade_specialty','role']);
    var website = fieldVal(fd,['website','website_url','url']);
    var contact = (first||'') + (last?(' '+last):'') || fieldVal(fd,['full_name','fullname','name']);
    if(table==='partner_applications'){
      return { company_name: company||contact, contact_person: contact, website_url: website };
    }
    if(table==='estimator_profiles'){
      return { company_name: company||contact, trade_type: trade, phone_number: phone };
    }
    return { full_name: contact, email: email, company: company, trade_specialty: trade };
  }
  function showMsg(form, ok, msg){
    var box = document.createElement('div');
    box.style.cssText = 'padding:14px;margin:12px 0;border-radius:8px;font-size:14px;font-family:DM Sans,sans-serif;'+
      (ok ? 'background:#e7f6ec;color:#1a7d3a;border:1px solid #b7e3c4' : 'background:#fdecec;color:#a52d23;border:1px solid #f5c6c2');
    box.textContent = msg;
    form.prepend(box);
    setTimeout(function(){ if(box.parentNode) box.parentNode.removeChild(box); }, 6000);
  }
  document.querySelectorAll('form').forEach(function(form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var fd = new FormData(form);
      var table = tableFor(form);
      var payload = mapPayload(table, fd);
      var btn = form.querySelector('button[type=submit],input[type=submit]');
      if(btn){ btn.disabled = true; var orig = btn.textContent; btn.textContent='Submitting...'; }
      fetch(SB_URL + '/rest/v1/' + table, {
        method: 'POST',
        headers: { 'apikey': SB_ANON, 'Authorization': 'Bearer ' + SB_ANON, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify(payload)
      }).then(function(res){
        if(btn){ btn.disabled = false; btn.textContent = orig || 'Submit'; }
        if(res.ok){ showMsg(form, true, 'Thank you — your request was received. We will be in touch shortly.'); form.reset(); }
        else { res.text().then(function(t){ showMsg(form, false, 'Sorry, something went wrong. Please try again or email hello@autoleads.ai'); }); }
      }).catch(function(){
        if(btn){ btn.disabled = false; btn.textContent = orig || 'Submit'; }
        showMsg(form, false, 'Network error — please try again.');
      });
    });
  });
})();
</script>`;

    // 3. Inject before </body> (or append if no </body>)
    if (/<\/body>/i.test(html)) {
      html = html.replace(/<\/body>/i, wireScript + '\n</body>');
    } else {
      html = html + wireScript;
    }

    // 4. Deploy to Vercel
    const token = secrets.get('VERCEL_TOKEN');
    if (!token) throw new Error('VERCEL_TOKEN secret not set');
    const teamId = secrets.get('VERCEL_TEAM_ID') || null;
    const baseSlug = slugify(clone_name || 'auto-leads') || 'auto-leads';
    const slug = `${baseSlug}-live`;
    const vProject = await createVercelProject(token, teamId, slug);
    try { await disableVercelSso(token, teamId, vProject.id); } catch (e) { /* non-fatal */ }
    const deploy = await deployToVercel(token, teamId, slug, vProject.id, html);

    return Response.json({
      status: 'success',
      source_url,
      final_url: deploy.url,
      supabase_url: supabaseUrl,
      forms_wired: true,
      project_slug: slug
    });
  } catch (error) {
    console.error('wireCloneFormsToSupabase error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}