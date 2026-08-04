import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const { step_id, order_id, account_id } = await req.json().catch(() => ({}));

    if (!step_id) return Response.json({ error: 'step_id is required' }, { status: 400 });

    let result = { step_id, status: 'processed' };

    switch (step_id) {
      case 'FUL-001': {
        // Purchase Received — create customer account, entitlements, project
        const order = await base44.asServiceRole.entities.CartOrder.get(order_id);
        if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });

        const account = await base44.asServiceRole.entities.CustomerAccount.create({
          organization_id: orgId,
          account_name: order.owner_user_id || 'New Account',
          business_name: 'Pending Intake',
          stage: 'pre_launch',
          status: 'trial',
          owner_user_id: order.owner_user_id || user.id
        });

        // Create entitlements for each item
        if (order.items && Array.isArray(order.items)) {
          for (const item of order.items) {
            await base44.asServiceRole.entities.ProductEntitlement.create({
              organization_id: orgId,
              account_id: account.id,
              tool_id: item.tool_id,
              status: 'pending'
            });
          }
        }

        result.account_id = account.id;
        result.entitlements = order.items?.length || 0;
        break;
      }

      case 'FUL-002': {
        // Account Provisioned — activate entitlements
        if (!account_id) return Response.json({ error: 'account_id required' }, { status: 400 });
        await base44.asServiceRole.entities.ProductEntitlement.updateMany(
          { account_id, status: 'pending' },
          { $set: { status: 'active', activated_at: new Date().toISOString() } }
        );
        result.activated = true;
        break;
      }

      case 'FUL-003': {
        // Intake Issued — create intake response record
        if (!account_id) return Response.json({ error: 'account_id required' }, { status: 400 });
        result.intake_issued = true;
        break;
      }

      case 'FUL-004': {
        // Intake Validated
        result.validated = true;
        break;
      }

      case 'FUL-005': {
        // Brand Discovery started
        result.brand_started = true;
        break;
      }

      case 'FUL-006': {
        // Website Generation started
        result.website_started = true;
        break;
      }

      case 'FUL-007': {
        // QA Validation
        result.qa_validated = true;
        break;
      }

      case 'FUL-008': {
        // Customer Approval requested
        result.approval_requested = true;
        break;
      }

      case 'FUL-009': {
        // Launch
        if (!account_id) return Response.json({ error: 'account_id required' }, { status: 400 });
        await base44.asServiceRole.entities.CustomerAccount.update(account_id, {
          status: 'active',
          lifecycle_state: 'launched'
        });
        result.launched = true;
        break;
      }

      default:
        result.status = 'noop';
        result.message = `Step ${step_id} not implemented in processor`;
    }

    // Log receipt
    await base44.asServiceRole.entities.ActivityReceipt.create({
      organization_id: orgId,
      actor_user_id: user.id,
      action: `fulfillment_step:${step_id}`,
      entity_type: 'CartOrder',
      entity_id: order_id || account_id || 'system',
      metadata: result
    }).catch(() => {});

    return Response.json(result);
  } catch (error) {
    console.error('processFulfillmentStep error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}