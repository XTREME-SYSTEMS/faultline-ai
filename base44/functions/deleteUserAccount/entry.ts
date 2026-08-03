import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Mark the user's account for deletion
    await base44.auth.updateMe({
      account_deleted: true,
      deletion_requested_at: new Date().toISOString()
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('deleteUserAccount error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}