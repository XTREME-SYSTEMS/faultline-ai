import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { resolvePrompt } from '../../shared/promptLibrary.ts';

// High-end AI App Generator
// Generates complete, production-ready single-page web applications with:
// - Dashboard/portal layouts with sidebar navigation
// - Interactive charts, data tables, forms, modals
// - Modern UI with animations and responsive design
// - App-type-specific templates (CRM, booking, inventory, analytics, etc.)
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const {
      app_name, app_type, business_name, industry, description, target_audience,
      primary_color, secondary_color, font_style, tone,
      features, pages, company_id, logo_url, competitor_analysis
    } = body;

    if (!app_name) return Response.json({ error: 'app_name required' }, { status: 400 });
    if (!description) return Response.json({ error: 'description required' }, { status: 400 });

    const color = primary_color || '#C89B3C';
    const color2 = secondary_color || '#0a0a0a';
    const font = font_style || 'modern';
    const voice = tone || 'professional';
    const appType = app_type || 'dashboard';
    const appFeatures = features || ['sidebar', 'dashboard', 'charts', 'tables', 'forms'];
    const appPages = pages || ['dashboard', 'analytics', 'settings'];

    const appTypeDescriptions = {
      dashboard: 'an analytics dashboard with KPI cards, charts, and data tables',
      crm: 'a CRM system with contact management, deal pipeline, and activity tracking',
      booking: 'a booking/scheduling app with calendar, appointment slots, and client management',
      inventory: 'an inventory management system with stock tracking, alerts, and supplier management',
      project_management: 'a project management board with kanban columns, tasks, and team collaboration',
      customer_portal: 'a customer portal with account management, support tickets, and order history',
      pos: 'a point-of-sale system with product catalog, cart, and checkout',
      lms: 'a learning management system with course catalog, progress tracking, and quizzes'
    };

    const googleFonts = font === 'classic' ? 'Playfair Display + Lato' : font === 'bold' ? 'Oswald + Open Sans' : 'Inter + Poppins';
    const competitorSection = competitor_analysis ? `
COMPETITOR ANALYSIS — exceed these apps in design and functionality:
${JSON.stringify(competitor_analysis, null, 2)}
` : '';

    const promptVars = {
      APP_NAME: app_name,
      APP_TYPE: appType,
      APP_TYPE_DESCRIPTION: appTypeDescriptions[appType] || 'a modern web application',
      BUSINESS_NAME: business_name || app_name,
      INDUSTRY: industry || 'General',
      DESCRIPTION: description,
      TARGET_AUDIENCE: target_audience || 'General users',
      PRIMARY_COLOR: color,
      SECONDARY_COLOR: color2,
      FONT_STYLE: font,
      TONE: voice,
      PAGES: appPages.join(', '),
      FEATURES: appFeatures.join(', '),
      LOGO_INSTRUCTION: logo_url ? `Use this logo image: ${logo_url}` : 'Create a text-based wordmark',
      COMPETITOR_SECTION: competitorSection,
      GOOGLE_FONTS: googleFonts
    };

    const prompt = await resolvePrompt(base44, orgId, 'fl-app', 'GENERATE', promptVars,
      `You are an elite full-stack developer and UI/UX designer. Generate a COMPLETE, production-ready single-page web application. Output ONLY valid HTML with embedded CSS and JS — no markdown, no explanations, no code fences.

APP NAME: ${app_name}
APP TYPE: ${appType} — ${appTypeDescriptions[appType] || 'a modern web application'}
BUSINESS: ${business_name || app_name}
INDUSTRY: ${industry || 'General'}
DESCRIPTION: ${description}
TARGET AUDIENCE: ${target_audience || 'General users'}
BRAND COLOR: ${color}
SECONDARY COLOR: ${color2}
FONT STYLE: ${font} (modern=sans-serif/Inter, classic=serif/Playfair, bold=condensed/Oswald)
TONE: ${voice}
PAGES: ${appPages.join(', ')}
FEATURES: ${appFeatures.join(', ')}
LOGO: ${logo_url ? `Use this logo image: ${logo_url}` : 'Create a text-based wordmark'}
${competitorSection}

REQUIREMENTS — this must be an ULTRA-PREMIUM, production-grade application:
1. Single HTML file with ALL CSS in <style> tags and ALL JS in <script> tags
2. Use Chart.js from CDN (https://cdn.jsdelivr.net/npm/chart.js) for all charts
3. Use Tailwind CSS from CDN (https://cdn.tailwindcss.com) for rapid styling — configure it with the brand colors
4. Sidebar navigation layout: fixed left sidebar with nav links, main content area on right
5. Sidebar must collapse to a hamburger menu on mobile (JS toggle)
6. Top header bar with search, notifications bell, and user avatar dropdown
7. Dashboard page with:
   - 4 KPI metric cards with trend indicators (up/down arrows, % change)
   - 2+ Chart.js charts (line chart for trends, doughnut for distribution, bar for comparison)
   - Recent activity feed or data table with sorting
8. ${appFeatures.includes('tables') ? 'Data table page with: search, column sorting, pagination, row hover, action buttons (view/edit/delete), status badges' : ''}
9. ${appFeatures.includes('forms') ? 'Form page with: validated inputs, select dropdowns, date pickers, file upload area, submit with loading state, success toast notification' : ''}
10. ${appFeatures.includes('kanban') ? 'Kanban board with: 4 columns (To Do, In Progress, Review, Done), draggable cards (HTML5 drag-and-drop), card count badges' : ''}
11. ${appFeatures.includes('calendar') ? 'Calendar view with: month grid, event dots, click to add event, prev/next navigation' : ''}
12. ${appFeatures.includes('chat') ? 'Chat/messaging interface with: message bubbles, input box, send button, auto-scroll' : ''}
13. ${appFeatures.includes('settings') ? 'Settings page with: toggle switches, profile form, theme selector, save button' : ''}
14. SPA routing: use JS to show/hide page sections based on sidebar nav clicks (no page reload)
15. Dark mode toggle in the header (JS class toggle on body)
16. Smooth page transitions (fade-in animation on page switch)
17. Toast notification system (JS) for actions (success, error, info)
18. Modal dialog system (JS) for confirmations and detail views
19. Loading skeleton states for async-feeling data loads
20. Fully responsive — mobile-first with breakpoints at 768px and 1024px
21. CSS custom properties for brand colors: --primary:${color}, --secondary:${color2}
22. Google Fonts: ${googleFonts}
23. Micro-interactions: button hover effects, card lift on hover, ripple on click
24. Accessible: ARIA labels, keyboard navigation, semantic HTML5
25. Generate realistic sample data (at least 10-20 rows for tables, realistic chart data)
26. The design must be VISUALLY STUNNING — glassmorphism cards, gradient accents, soft shadows, rounded corners

Generate the COMPLETE application now. Start with <!DOCTYPE html> and end with </html>. Make it long, detailed, and fully functional. Every page must have real, working interactivity. Write actual JavaScript that makes the app work — not just static HTML.`);

    const res = await base44.integrations.Core.InvokeLLM({ prompt });

    let appHtml = typeof res === 'string' ? res : res?.content || res?.text || JSON.stringify(res);
    appHtml = appHtml.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    if (!appHtml.startsWith('<!DOCTYPE') && !appHtml.startsWith('<!doctype')) {
      appHtml = '<!DOCTYPE html>\n' + appHtml;
    }

    // Save as a Deliverable
    const deliverableData = {
      organization_id: orgId,
      deliverable_type: 'website',
      title: `App — ${app_name}`,
      content: appHtml,
      metadata: {
        app_name, app_type: appType, business_name, industry,
        primary_color: color, secondary_color: color2,
        font_style: font, tone: voice, pages: appPages, features: appFeatures,
        logo_url: logo_url || null, deliverable_subtype: 'app',
        generated_at: new Date().toISOString()
      },
      status: 'generated'
    };
    if (company_id) deliverableData.company_id = company_id;
    const deliverable = await base44.asServiceRole.entities.Deliverable.create(deliverableData);

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'app_generator',
      action: 'generate',
      status: 'success',
      summary: `Generated ${appType} app for ${app_name} (${industry || 'general'})`,
      evidence: { deliverable_id: deliverable.id, app_name, app_type: appType }
    });

    return Response.json({
      status: 'success',
      deliverable_id: deliverable.id,
      app_html: appHtml,
      app_name,
      app_type: appType,
      message: 'App generated successfully'
    });
  } catch (error) {
    console.error('generateApp error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}