import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { runSystemMap } from '../../shared/systemMapper.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found on user profile' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const companyId = body.company_id;
    if (!companyId) return Response.json({ error: 'company_id required' }, { status: 400 });

    const result = await runSystemMap(base44, orgId, companyId);

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId, system: 'system_cloner', action: 'map_company_systems',
      status: 'success',
      summary: `Cloned system map: ${result.nodes.length} nodes, ${result.edges.length} edges, ${result.leak_point_count} leak points`,
      evidence: { company_id: companyId, node_count: result.nodes.length, edge_count: result.edges.length }
    });

    return Response.json({ status: 'success', company_id: companyId, ...result });
  } catch (error) {
    console.error('mapCompanySystems error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}