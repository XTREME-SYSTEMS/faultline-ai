import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { generateTemplatePackCore } from '../../shared/templateFactory.ts';

// Template Factory endpoint — thin HTTP wrapper around the shared core so
// both this function and the autonomous build cycle use identical logic.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'Unauthorized — no organization' }, { status: 401 });
    if (!body.business_name) return Response.json({ error: 'business_name required' }, { status: 400 });

    const result = await generateTemplatePackCore(base44, orgId, body);
    return Response.json({ status: 'success', ...result });
  } catch (error) {
    console.error('generateTemplatePack error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}