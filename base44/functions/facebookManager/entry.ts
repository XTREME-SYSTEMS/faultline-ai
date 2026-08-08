import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Facebook Page Manager - manages multiple Facebook Pages via the Graph API.
// Uses the SHARED facebook_pages connector (builder's account).
//
// Actions:
//   list_pages  - list all managed Facebook Pages
//   post       - publish a post to a page immediately
//   schedule   - schedule a post for future publishing
//   posts      - list recent posts on a page
//   insights   - get engagement insights for a page
//
// All actions (except list_pages) require page_id + page_access_token from list_pages.

const FB_API = 'https://graph.facebook.com/v25.0';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;

    // Get the builder's Facebook OAuth token
    let token;
    try {
      const conn = await base44.asServiceRole.connectors.getConnection('facebook_pages');
      token = conn.accessToken;
    } catch (e) {
      return Response.json({ error: 'Facebook Pages connector not connected. Authorize it in the portal first.' }, { status: 401 });
    }
    if (!token) return Response.json({ error: 'No Facebook access token' }, { status: 401 });

    // --- LIST PAGES ---
    if (action === 'list_pages') {
      const r = await fetch(`${FB_API}/me/accounts?fields=id,name,access_token,category,fan_count,followers_count&access_token=${token}`);
      const data = await r.json();
      if (data.error) return Response.json({ error: data.error.message }, { status: 400 });
      return Response.json({ pages: data.data || [] });
    }

    // --- POST TO PAGE ---
    if (action === 'post') {
      const { page_id, page_access_token, message, link_url, media_url } = body;
      if (!page_id || !page_access_token || !message) return Response.json({ error: 'page_id, page_access_token, message required' }, { status: 400 });

      const postData = { message, access_token: page_access_token };
      if (link_url) postData.link = link_url;

      const r = await fetch(`${FB_API}/${page_id}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });
      const data = await r.json();
      if (data.error) return Response.json({ error: data.error.message }, { status: 400 });

      // Track in SocialPost entity
      if (orgId) {
        try {
          await base44.entities.SocialPost.create({
            organization_id: orgId,
            platform: 'facebook',
            page_id, page_name: body.page_name || '',
            post_type: link_url ? 'link' : 'text',
            content: message,
            link_url: link_url || null,
            media_url: media_url || null,
            status: 'published',
            published_time: new Date().toISOString(),
            platform_post_id: data.id || null
          });
        } catch (e) { console.error('SocialPost save failed:', e.message); }
      }

      return Response.json({ status: 'success', post_id: data.id, message: 'Post published successfully' });
    }

    // --- SCHEDULE POST ---
    if (action === 'schedule') {
      const { page_id, page_access_token, message, link_url, scheduled_time } = body;
      if (!page_id || !page_access_token || !message || !scheduled_time) return Response.json({ error: 'page_id, page_access_token, message, scheduled_time required' }, { status: 400 });

      const ts = Math.floor(new Date(scheduled_time).getTime() / 1000);
      if (ts < Math.floor(Date.now() / 1000) + 600) {
        return Response.json({ error: 'Scheduled time must be at least 10 minutes in the future' }, { status: 400 });
      }

      const postData = { message, access_token: page_access_token, published: false, scheduled_publish_time: ts };
      if (link_url) postData.link = link_url;

      const r = await fetch(`${FB_API}/${page_id}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });
      const data = await r.json();
      if (data.error) return Response.json({ error: data.error.message }, { status: 400 });

      // Track in SocialPost entity
      if (orgId) {
        try {
          await base44.entities.SocialPost.create({
            organization_id: orgId,
            platform: 'facebook',
            page_id, page_name: body.page_name || '',
            post_type: link_url ? 'link' : 'text',
            content: message,
            link_url: link_url || null,
            status: 'scheduled',
            scheduled_time: scheduled_time,
            platform_post_id: data.id || null
          });
        } catch (e) { console.error('SocialPost save failed:', e.message); }
      }

      return Response.json({ status: 'success', post_id: data.id, message: 'Post scheduled successfully' });
    }

    // --- LIST RECENT POSTS ---
    if (action === 'posts') {
      const { page_id, page_access_token } = body;
      if (!page_id || !page_access_token) return Response.json({ error: 'page_id, page_access_token required' }, { status: 400 });

      const r = await fetch(`${FB_API}/${page_id}/posts?fields=id,message,created_time,permalink_url,full_picture&limit=20&access_token=${page_access_token}`);
      const data = await r.json();
      if (data.error) return Response.json({ error: data.error.message }, { status: 400 });
      return Response.json({ posts: data.data || [] });
    }

    // --- PAGE INSIGHTS ---
    if (action === 'insights') {
      const { page_id, page_access_token } = body;
      if (!page_id || !page_access_token) return Response.json({ error: 'page_id, page_access_token required' }, { status: 400 });

      const metrics = 'page_impressions,page_post_engagements,page_fans,page_views';
      const r = await fetch(`${FB_API}/${page_id}/insights?metric=${metrics}&period=day&access_token=${page_access_token}`);
      const data = await r.json();
      if (data.error) return Response.json({ error: data.error.message }, { status: 400 });

      // Summarize the insights
      const summary = {};
      for (const m of (data.data || [])) {
        const recent = (m.values || []).slice(-7);
        summary[m.name] = {
          total: recent.reduce((s, v) => s + v.value, 0),
          values: recent.map(v => v.value)
        };
      }

      return Response.json({ insights: summary, raw: data.data });
    }

    return Response.json({ error: 'Unknown action. Use: list_pages, post, schedule, posts, insights' }, { status: 400 });
  } catch (error) {
    console.error('facebookManager error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}