import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { slugify, createVercelProject, disableVercelSso, deployToVercel } from '../../shared/launchInfra.ts';

// FINALIZE REBRAND
// Takes a deployed rebranded/rewritten clone URL, scrubs ALL residual
// source-brand references (emails, meta tags, og:url, addresses), replaces
// the dead contact form with a CTA to the actual LGNY platform, and redeploys.

const APP_URL = 'https://fault-line.base44.app';
const LGNY_REGISTER = `${APP_URL}/register`;
const LGNY_APP = `${APP_URL}/lgny`;

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { source_url, clone_name, rebrand_project_id } = body;
    if (!source_url) return Response.json({ error: 'source_url required' }, { status: 400 });

    // 1. Fetch the current HTML
    const r = await fetch(source_url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FinalizeRebrand/1.0)' } });
    if (!r.ok) throw new Error(`Fetch failed (${r.status})`);
    let html = await r.text();

    const fixes: string[] = [];

    // 2. Scrub residual source-brand emails
    const emailRe = /[a-z._-]+@[a-z0-9.-]*duda[a-z0-9.-]*\.[a-z]{2,}/gi;
    if (emailRe.test(html)) { html = html.replace(emailRe, 'hello@leadgennearyou.com'); fixes.push('emails → hello@leadgennearyou.com'); }

    // 3. Scrub residual duda.co / www.duda.co URLs (og:url, canonical, etc.)
    if (/duda\.co/i.test(html)) { html = html.replace(/duda\.co/gi, 'leadgennearyou.com'); fixes.push('duda.co URLs → leadgennearyou.com'); }

    // 4. Scrub any remaining "Duda" word references in text/meta (case-insensitive, whole word)
    if (/\bDuda\b/g.test(html)) { html = html.replace(/\bDuda\b/g, 'Lead Gen Near You'); fixes.push('residual "Duda" → "Lead Gen Near You"'); }

    // 5. Fix address
    if (html.includes('Palo Alto, CA')) { html = html.split('Palo Alto, CA').join('Local Service Area, USA'); fixes.push('address → Local Service Area, USA'); }

    // 6. Fix internal anchor links that got the full vercel URL prefix
    //    e.g. href="https://duda-lgny-xxx.vercel.app/#services" → href="#services"
    html = html.replace(/href="https:\/\/[^"]*vercel\.app\/#([a-z]+)"/gi, 'href="#$1"');
    fixes.push('internal anchor links normalized');

    // 7. Replace the dead contact form section with a CTA to the actual platform
    const contactSectionRe = /<section[^>]*id="contact"[\s\S]*?<\/section>/i;
    const ctaSection = `<section class="section-padding" id="contact" style="background: #080a11; color: #fff;">
        <div class="container">
            <div style="text-align: center; max-width: 640px; margin: 0 auto;">
                <span class="section-tag" style="color: #CCFF00;">Get Started</span>
                <h2 style="color: #fff; margin-top: 16px;">Ready to capture more leads and book more jobs?</h2>
                <p style="color: #a0a8b8; margin-top: 20px; font-size: 18px; line-height: 1.7;">Stop filling out forms. Start using the platform. Lead Gen Near You gives you CRM, funnels, automations, and booking tools — all in one place. Try it free for 14 days, no credit card required.</p>
                <div style="display: flex; gap: 16px; justify-content: center; margin-top: 36px; flex-wrap: wrap;">
                    <a href="${LGNY_REGISTER}" target="_blank" rel="noopener" class="btn btn-primary" style="background: #CCFF00; color: #000; font-weight: 700; padding: 16px 32px; border-radius: 8px; text-decoration: none; display: inline-block;">Start 14-Day Free Trial</a>
                    <a href="${LGNY_APP}" target="_blank" rel="noopener" class="btn btn-outline" style="border: 1px solid #CCFF00; color: #CCFF00; font-weight: 700; padding: 16px 32px; border-radius: 8px; text-decoration: none; display: inline-block;">Explore the Platform</a>
                </div>
                <p style="color: #666; margin-top: 24px; font-size: 13px;">Questions? Email hello@leadgennearyou.com</p>
            </div>
        </div>
    </section>`;
    if (contactSectionRe.test(html)) {
      html = html.replace(contactSectionRe, ctaSection);
      fixes.push('contact form replaced with CTA to LGNY platform');
    } else {
      // Fallback: replace just the form element
      const formRe = /<form[^>]*id="contactForm"[\s\S]*?<\/form>/i;
      if (formRe.test(html)) {
        html = html.replace(formRe, `<div style="text-align:center; padding: 30px;"><a href="${LGNY_REGISTER}" target="_blank" rel="noopener" style="display:inline-block; background:#CCFF00; color:#000; font-weight:700; padding:16px 32px; border-radius:8px; text-decoration:none;">Start 14-Day Free Trial</a></div>`);
        fixes.push('contact form replaced with trial CTA (fallback)');
      }
    }

    // 8. (Do NOT strip contactForm JS — orphaned handler is harmless and
    //    stripping it risks corrupting the page's other scripts.)

    // 9. Deploy
    const token = secrets.get('VERCEL_TOKEN');
    if (!token) throw new Error('VERCEL_TOKEN secret not set');
    const teamId = secrets.get('VERCEL_TEAM_ID') || null;
    const baseSlug = slugify(clone_name || 'lead-gen-near-you') || 'lead-gen-near-you';
    const slug = `${baseSlug}-final`;
    const vProject = await createVercelProject(token, teamId, slug);
    try { await disableVercelSso(token, teamId, vProject.id); } catch (e) { /* non-fatal */ }
    const deploy = await deployToVercel(token, teamId, slug, vProject.id, html);

    // 10. Update the RebrandProject if provided
    if (rebrand_project_id) {
      try {
        await base44.entities.RebrandProject.update(rebrand_project_id, {
          status: 'completed',
          approval_state: 'approved',
          provisioned: {
            vercel_project_url: `https://${slug}.vercel.app`,
            vercel_deployment_url: deploy.url,
            domain_name: slug,
          },
        });
      } catch (e) { /* non-fatal */ }
    }

    return Response.json({
      status: 'success',
      source_url,
      final_url: deploy.url,
      fixes_applied: fixes,
      project_slug: slug,
    });
  } catch (error) {
    console.error('finalizeRebrandSite error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}