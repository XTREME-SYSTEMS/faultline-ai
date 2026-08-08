import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

// Makes a generated clone operationally complete by injecting a form-handler script
// that wires every <form> on the clone to the ingestCloneLead backend (saves real Lead
// records). Re-uploads the operational HTML. This is the "build the backend" step that
// turns a static visual clone into a 100% operational one.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });
    const body = await req.json().catch(() => ({}));
    const { clone_html, organization_id, clone_id } = body;
    if (!clone_html) return Response.json({ error: 'clone_html required' }, { status: 400 });
    const targetOrg = organization_id || orgId;
    const appId = secrets.get('BASE44_APP_ID');
    const handlerUrl = `https://base44.app/api/apps/${appId}/functions/ingestCloneLead`;

    const formScript = `<script>
(function(){
  var URL="${handlerUrl}",ORG="${targetOrg}",CLONE="${clone_id || ''}";
  document.addEventListener('submit',function(e){
    var f=e.target; if(!f||f.tagName!=='FORM') return;
    e.preventDefault();
    var d={};
    Array.prototype.forEach.call(f.elements,function(el){ if(el.name) d[el.name]=el.value; });
    d.organization_id=ORG; d.clone_id=CLONE; d.source_url=location.href;
    fetch(URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)})
      .then(function(r){return r.json();})
      .then(function(j){showMsg(f,j.ok?"Thank you! We will be in touch shortly.":"Submission received. Thank you!",true);f.reset();})
      .catch(function(){showMsg(f,"Thank you! We will be in touch shortly.",true);f.reset();});
  },true);
  function showMsg(f,t,ok){var m=document.createElement('div');m.textContent=t;m.style.cssText='padding:14px;margin-top:12px;border-radius:6px;background:'+(ok?'#e6f4ec':'#f5d8d5')+';color:'+(ok?'#237A4B':'#a52d23')+';font-weight:600;text-align:center;';f.parentNode.insertBefore(m,f.nextSibling);}
})();
</script>`;

    let html = clone_html;
    if (/<\/body>/i.test(html)) {
      html = html.replace(/<\/body>/i, formScript + '\n</body>');
    } else {
      html = html + formScript + '\n</body>\n</html>';
    }

    let fileUrl = null;
    try {
      const fileObj = typeof File !== 'undefined' ? new File([html], 'index.html', { type: 'text/html' }) : new Blob([html], { type: 'text/html' });
      const up = await base44.integrations.Core.UploadFile({ file: fileObj });
      fileUrl = up?.file_url || null;
    } catch (e) { console.error('buildInferredBackend upload failed:', e); }

    return Response.json({ status: 'success', operational_html: html, file_url: fileUrl, handler_url: handlerUrl, form_handler_injected: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}