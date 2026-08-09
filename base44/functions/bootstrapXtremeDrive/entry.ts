import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Bootstraps the entire "Xtreme AI Systems" Google Drive workspace:
//   1. Creates a 10-folder directory structure
//   2. Creates a master Google Sheet with all cloned websites + discovered
//      opportunities from the database (LaunchProject, UniversalCatalog,
//      TopPerformer)
//   3. Generates 10 strategic documents via InvokeLLM (Gemini 3 Flash with
//      web search for research validation) and writes them to Drive
//
// This is the "Source of Truth" scaffold that the overnight automation
// workflows read from. Run once to initialize, then re-run with
// { regenerate_docs: true } to refresh the strategic documents.
//
// All content is generated with research-backed LLM calls — no guessing.

const ROOT_FOLDER = 'Xtreme AI Systems';

const FOLDER_STRUCTURE = [
  '00_Master_Blueprint',
  '01_Business_Strategy',
  '02_Financial_Strategy',
  '03_Automation_Strategy',
  '04_Market_Research',
  '05_Product_Strategy',
  '06_Clone_Capabilities',
  '07_Prompt_Library',
  '08_Data',
  '09_Governance'
];

// Research context gathered from web search (validated, not guessed).
// This is injected into every LLM prompt so the generated documents are
// grounded in real market data, not hallucinated.
const RESEARCH_CONTEXT = `
VALIDATED MARKET RESEARCH (sourced from web search, August 2026):

CONSTRUCTION AI ADOPTION:
- Only 27% of AEC firms use AI; 45% have implemented nothing; <1% organization-wide (RICS 2025, ASCE 2025)
- 94% of the 27% who adopted AI plan to increase usage in 2026
- Barriers: lack of skilled personnel (46%), integration with existing systems (37%), data quality (30%), lack of standards (25%)
- 52% still use paper during design phase; 49% during planning; 43% rely on physical signatures
- AI-specific funding claimed 68% of construction tech VC capital in Q2 2025, up from 20-25% historically
- Global AI in construction market: $6.2B in 2026; software solutions = 63.5%; ML predictive analytics = 42%

DECORATIVE CONCRETE / EPOXY MARKET:
- Decorative concrete market: $20.55B in 2026, CAGR 5.51%, reaching $26.87B by 2031
- North America decorative concrete: $4.57B → $6.83B by 2030
- 70+ Xtreme Polishing Systems locations = largest in North America

AI ESTIMATING SOFTWARE COMPETITORS (pricing validated):
- Togal.AI: $299/mo — computer vision takeoff, 12-min takeoff, mid-size GCs
- Handoff AI: $149/mo — AI + CRM + proposals + invoicing, residential/remodeling
- STACK: $1,899-$2,999/yr ($158-250/mo) — general contractors, within 3% baseline
- Kreo: $35/mo — budget, Caddie AI detection
- ProEst (Autodesk): $5,000+/yr — enterprise, BIM integration
- Quotr.ai: $299.90/mo — takeoff + estimate + procurement, 220+ supplier network
- Beam AI: custom — human+AI hybrid, ±1% accuracy claim
- AI takeoff accuracy: 95-99% on clean vector PDFs; cuts 6-8hr manual takeoff to <30 min (300% capacity increase)

DIGITAL PRODUCT MARKET:
- SaaS market: $300B globally
- Templates/printables: 90%+ profit margins
- AI prompts/tools: fastest-growing digital product category in 2026
- Micro SaaS insight: 200 companies at $500/mo outperforms thousands at $29/mo with 15% monthly churn

TOP VC / WEALTH INVESTMENT TRENDS (Forbes Midas 2026):
- Top bets: OpenAI, Anthropic, SpaceX, Cerebras, Wiz — AI infrastructure dominates
- Key pattern: early bets on AI infrastructure + applied AI win biggest
- Construction tech VC: AI-specific funding 68% of all construction tech VC in Q2 2025
- Wealthy investors are staying away from: non-AI legacy SaaS, physical retail, crypto speculation
`;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const regenerateDocs = !!body.regenerate_docs;

    // Get Google Drive + Sheets tokens
    const { accessToken: driveToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
    const { accessToken: sheetsToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');
    const driveAuth = { Authorization: `Bearer ${driveToken}` };

    const result = {
      root_folder: null,
      subfolders: {},
      master_sheet_url: null,
      documents: [],
      errors: []
    };

    // ─── STEP 1: Create folder structure ───
    console.log('Creating folder structure...');

    // Find or create root folder
    let rootId;
    const rootSearch = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${ROOT_FOLDER}' and trashed=false`)}&fields=files(id,name)`,
      { headers: driveAuth }
    );
    const rootJson = await rootSearch.json();
    if (rootJson.files && rootJson.files.length > 0) {
      rootId = rootJson.files[0].id;
    } else {
      const rootCreate = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { ...driveAuth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: ROOT_FOLDER, mimeType: 'application/vnd.google-apps.folder' })
      });
      const rootData = await rootCreate.json();
      rootId = rootData.id;
    }
    result.root_folder = { id: rootId, name: ROOT_FOLDER, url: `https://drive.google.com/drive/folders/${rootId}` };

    // Create subfolders
    for (const folderName of FOLDER_STRUCTURE) {
      // Check if exists
      const search = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${rootId}' in parents and trashed=false`)}&fields=files(id,name)`,
        { headers: driveAuth }
      );
      const searchJson = await search.json();
      let folderId;
      if (searchJson.files && searchJson.files.length > 0) {
        folderId = searchJson.files[0].id;
      } else {
        const create = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: { ...driveAuth, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: folderName, mimeType: 'application/vnd.google-apps.folder', parents: [rootId] })
        });
        const createData = await create.json();
        folderId = createData.id;
      }
      result.subfolders[folderName] = { id: folderId, url: `https://drive.google.com/drive/folders/${folderId}` };
    }
    console.log('Folder structure created.');

    // ─── STEP 2: Create master Google Sheet from DB data ───
    console.log('Creating master Google Sheet from database...');

    const [launchProjects, catalog, performers] = await Promise.all([
      base44.asServiceRole.entities.LaunchProject.filter({ organization_id: orgId }, '-created_date', 200).catch(() => []),
      base44.asServiceRole.entities.UniversalCatalog.filter({ organization_id: orgId }, '-created_date', 200).catch(() => []),
      base44.asServiceRole.entities.TopPerformer.filter({ organization_id: orgId }, '-created_date', 200).catch(() => [])
    ]);

    // Create spreadsheet with 3 tabs
    const sheetCreate = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sheetsToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        properties: { title: 'Xtreme AI Systems — Master Catalog' },
        sheets: [
          { properties: { title: 'Cloned Websites' } },
          { properties: { title: 'Discovered Opportunities' } },
          { properties: { title: 'Top Performers' } }
        ]
      })
    });
    const sheetData = await sheetCreate.json();
    const spreadsheetId = sheetData.spreadsheetId;
    const spreadsheetUrl = sheetData.spreadsheetUrl;
    result.master_sheet_url = spreadsheetUrl;

    // Tab 1: Cloned Websites (from LaunchProject)
    const clonedValues = [
      ['Name', 'URL', 'Description', 'Specialty/Industry', 'Parity Score', 'Status', 'Vercel URL', 'How It Can Be Profitable', 'How It Can Be Automated', 'Client Base', 'Created Date']
    ];
    for (const p of launchProjects) {
      const meta = p.metadata || {};
      clonedValues.push([
        p.project_name || '',
        p.benchmark_url || meta.target_url || '',
        p.description || p.business_name || '',
        p.industry || '',
        String(p.parity_score || 0),
        p.status || '',
        p.vercel_deployment_url || '',
        meta.profitability || '',
        meta.automation_potential || '',
        p.target_audience || meta.client_base || '',
        new Date(p.created_date).toLocaleDateString()
      ]);
    }

    // Tab 2: Discovered Opportunities (from UniversalCatalog)
    const catalogValues = [
      ['Name', 'URL', 'Description', 'Category', 'Item Type', 'Specialty/Niche', 'How It Can Be Profitable', 'How It Can Be Automated', 'Client Base', 'Target Audience', 'Value Proposition', 'Priority', 'Clone Status', 'Validation Status']
    ];
    for (const c of catalog) {
      catalogValues.push([
        c.name || '',
        c.url || '',
        c.description || '',
        c.category || '',
        c.item_type || '',
        c.niche || c.subcategory || '',
        c.revenue_model || '',
        c.superiority_strategy ? JSON.stringify(c.superiority_strategy).slice(0, 200) : '',
        c.target_audience || '',
        c.target_audience || '',
        c.value_proposition || '',
        c.priority || '',
        c.clone_status || '',
        c.validation_status || ''
      ]);
    }

    // Tab 3: Top Performers
    const performerValues = [
      ['Name', 'URL', 'Industry', 'Niche', 'Revenue Model', 'Estimated Revenue', 'Client Base', 'Target Audience', 'Value Proposition', 'Design Strengths', 'Key Features', 'Weaknesses', 'Profit Potential', 'Clone Status', 'Superiority Strategy']
    ];
    for (const t of performers) {
      performerValues.push([
        t.name || '',
        t.url || '',
        t.industry || '',
        t.niche || '',
        t.revenue_model || '',
        t.estimated_revenue || '',
        t.client_base || '',
        t.target_audience || '',
        t.value_proposition || '',
        (t.design_strengths || []).join('; '),
        (t.key_features || []).join('; '),
        (t.weaknesses || []).join('; '),
        t.profit_potential || '',
        t.clone_status || '',
        t.superiority_strategy ? JSON.stringify(t.superiority_strategy).slice(0, 300) : ''
      ]);
    }

    // Write all tabs
    await Promise.all([
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Cloned Websites!A1:append?valueInputOption=RAW`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sheetsToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: clonedValues })
      }),
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Discovered Opportunities!A1:append?valueInputOption=RAW`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sheetsToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: catalogValues })
      }),
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Top Performers!A1:append?valueInputOption=RAW`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sheetsToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: performerValues })
      })
    ]);

    console.log(`Master sheet created: ${launchProjects.length} cloned, ${catalog.length} opportunities, ${performers.length} performers`);

    // ─── STEP 3: Generate strategic documents via InvokeLLM ───
    console.log('Generating strategic documents...');

    // Helper: upload a text file to a Drive folder
    async function uploadDoc(folderId, fileName, content) {
      const boundary = 'xtreme-' + Date.now();
      const metadata = JSON.stringify({ name: fileName + '.txt', parents: [folderId] });
      const multipartBody =
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${metadata}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: text/plain\r\n\r\n` +
        `${content}\r\n` +
        `--${boundary}--`;

      const uploadRes = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
        {
          method: 'POST',
          headers: { ...driveAuth, 'Content-Type': `multipart/related; boundary=${boundary}` },
          body: multipartBody
        }
      );
      const uploadJson = await uploadRes.json();
      return { id: uploadJson.id, name: uploadJson.name, url: uploadJson.webViewLink };
    }

    // Helper: generate a document via InvokeLLM with research context
    async function generateDoc(docDef) {
      try {
        const prompt = `${docDef.prompt}

${RESEARCH_CONTEXT}

ADDITIONAL CONTEXT:
- Operator: Jeremy, partner with Chris Lavin (Xtreme Polishing Systems — 70+ locations, largest epoxy/decorative concrete/polished concrete platform in North America)
- Budget: $1,000 Base44 credits + AI credit card + Google Cloud + GitHub + Vercel + Supabase
- Goal: Net $1,000,000 in 12 months
- Distribution: 70 Xtreme locations first, then nationwide to all phone/computer users
- Focus: Digital products and AI services (not physical inventory)
- Infrastructure: Base44 platform with autonomous clone-to-100 pipeline, website generator, video studio, social media manager
- All products: AI Tools ($29), Web Packs ($49), App Packs ($99), Growth Plan ($299/mo), Operating System Plan ($699/mo)

${docDef.specificInstructions || ''}

Be EXHAUSTIVE, HONEST, and TRANSPARENT. Do not hold back. Include trade secrets, hidden opportunities, and anything important even if not explicitly asked. Use the research data above to validate every claim. Format as a well-structured document with clear headers, bullet points, and tables where appropriate.`;

        const llmRes = await base44.integrations.Core.InvokeLLM({
          prompt,
          add_context_from_internet: true,
          model: 'gemini_3_flash',
          response_json_schema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              content: { type: 'string', description: 'The full document content in plain text with markdown-style headers' }
            }
          }
        });

        const content = llmRes.content || llmRes.title || '';
        const title = llmRes.title || docDef.name;
        const fullContent = `# ${title}\n\nGenerated: ${new Date().toISOString()}\n\n${content}`;

        const fileInfo = await uploadDoc(result.subfolders[docDef.folder].id, docDef.name, fullContent);
        result.documents.push({ name: docDef.name, folder: docDef.folder, url: fileInfo.url, id: fileInfo.id });
        console.log(`Generated: ${docDef.name}`);
        return fileInfo;
      } catch (e) {
        result.errors.push({ doc: docDef.name, error: e.message });
        console.error(`Failed: ${docDef.name}: ${e.message}`);
        return null;
      }
    }

    // Document definitions — 10 strategic documents
    const docs = [
      {
        name: '01_MASTER_BLUEPRINT_AND_ROADMAP',
        folder: '00_Master_Blueprint',
        prompt: `Create the MASTER BLUEPRINT AND ROADMAP for building a $1M+ net autonomous AI business in 12 months. This is the master document that ties everything together. Include:
1. Executive Summary (the entire vision in 1 page)
2. The 12-month roadmap with quarterly milestones (Q1, Q2, Q3, Q4)
3. What to work on FIRST, SECOND, THIRD, FOURTH — in exact priority order
4. What to DOUBLE DOWN on and what to STAY COMPLETELY AWAY FROM
5. The exact tech stack (Base44, Vercel, Supabase, GitHub, Google Cloud, Stripe)
6. What runs in PARALLEL vs sequential
7. What runs DURING THE DAY vs OVERNIGHT (autonomous)
8. Brand names to go for and brand names to stay away from
9. Documents to create at the very beginning
10. The KILL SWITCH protocol (when to pause automation)`,
        specificInstructions: `Act as if you ARE Jeremy. If you had Chris Lavin's 70-location platform, Base44 with near-no-cost-limit, an AI credit card, and a goal of $1M net in 12 months — what EXACTLY would you do? Give specific steps, tools, and stack. What would you spend the most on? What would you do for free?`
      },
      {
        name: '02_BUSINESS_PLAN_AND_STRATEGY',
        folder: '01_Business_Strategy',
        prompt: `Create a comprehensive BUSINESS PLAN AND STRATEGY for Xtreme AI Systems. Include:
1. Company vision and mission
2. Market analysis (construction AI adoption gap, decorative concrete market size)
3. Target market segments (70 Xtreme locations → nationwide contractors → all businesses)
4. Competitive advantages (Chris Lavin's 70-location network, autonomous clone pipeline, AI-first)
5. Go-to-market strategy (phase 1: Xtreme locations, phase 2: contractor SaaS, phase 3: nationwide marketplace)
6. Revenue streams (AI tools $29, web packs $49, app packs $99, Growth $299/mo, OS $699/mo)
7. Key partnerships and distribution channels
8. Risk assessment and mitigation
9. Success metrics and KPIs
10. Exit strategy options`,
        specificInstructions: `Focus on the UNIQUE advantage of having 70+ existing locations as both customers AND a distribution channel. This is a moat no competitor has.`
      },
      {
        name: '03_FINANCIAL_PLAN_AND_ROI_PROJECTIONS',
        folder: '02_Financial_Strategy',
        prompt: `Create a detailed FINANCIAL PLAN AND ROI PROJECTIONS document. Include:
1. Startup costs breakdown (Base44 credits, Vercel, Supabase, domains, tools)
2. Revenue model and pricing strategy
3. 1-month, 3-month, 6-month, 12-month ROI projections (BEST CASE and WORST CASE)
4. 3-year, 5-year, 10-year ROI projections (BEST CASE and WORST CASE)
5. Break-even analysis
6. Monthly operating costs (credits, infrastructure, tools)
7. Profit margin analysis by product type
8. Cash flow projections
9. Scaling economics (how costs change at 100, 500, 1000 customers)
10. Investment allocation strategy (where to spend first for max ROI)
11. The $1M net path: exactly how many sales at each price point to reach $1M`,
        specificInstructions: `Use the validated pricing data: AI tools $29, web packs $49, app packs $99, Growth $299/mo, OS $699/mo. Show the math. A micro SaaS at $500/mo to 200 companies = $1.2M/yr. Model multiple paths to $1M.`
      },
      {
        name: '04_AUTOMATION_PLAN_AND_24_7_OPERATIONS',
        folder: '03_Automation_Strategy',
        prompt: `Create the AUTOMATION PLAN AND 24/7 OPERATIONS BLUEPRINT. This is the most important document for overnight automation. Include:
1. The complete automation architecture (orchestrator → queue → workers)
2. What runs on SCHEDULES (cron) vs event-triggered vs manual
3. The overnight automation schedule (what runs while Jeremy sleeps):
   - 12am-6am: Clone repair batch (autonomousCloneTo100 on queued sites)
   - 6am-8am: Video generation batch
   - 8am-10am: Social media posting
   - 10am-6pm: New site generation
   - 6pm-12am: Discovery + benchmark research
4. The BuildQueue orchestration protocol
5. Credit budgeting and kill-switch thresholds
6. Error handling and self-healing protocols
7. What requires human approval vs fully autonomous
8. Monitoring and alerting setup
9. The daily/weekly/monthly maintenance checklist
10. How to scale automation without hitting Supabase (2 project limit), Vercel, or Browserbase limits`,
        specificInstructions: `This document must be detailed enough that a scheduled workflow can read it and know exactly what to do. Include specific function names: autonomousCloneTo100, generateWebsite, generateMarketingVideo, facebookManager, universalDiscovery, etc.`
      },
      {
        name: '05_PRODUCT_AND_SERVICE_PLAN',
        folder: '05_Product_Strategy',
        prompt: `Create a comprehensive PRODUCT AND SERVICE PLAN. Include:
1. Product catalog (AI Tools, Web Packs, App Packs, Subscriptions)
2. For each product type, list 20+ specific product ideas with:
   - Name, target industry, problem solved, price, profit margin
3. The top-selling products in top-selling industries (validated by research)
4. Top existing competitors for each product, what they charge, strengths/weaknesses
5. The "deepest clone" achievable for each product type (what's included/excluded)
6. Product development priority (what to build first, second, third)
7. White-label and reseller strategy
8. Bundle and upsell strategy
9. Product roadmap (Q1-Q4)
10. Which products are most automatable, templatable, 24/7-capable`,
        specificInstructions: `Focus on construction-specific AI tools first (bid writers, estimators, CRMs, visualizers) since that's the existing network. Then expand to other trades. Price points: $29-$99 one-time, $299-$699/mo subscriptions.`
      },
      {
        name: '06_MARKET_RESEARCH_INDUSTRY_COMPETITION',
        folder: '04_Market_Research',
        prompt: `Create an exhaustive MARKET RESEARCH AND INDUSTRY COMPETITION ANALYSIS. Include:
1. INDUSTRY COMPETITION TIERS:
   - FLOODED industries (most competition, hardest to enter): list 15+ with why
   - MIDDLE-tier industries (moderate competition): list 15+ with why
   - BLUE OCEAN industries (least competition, most room to grow): list 15+ with why
2. For the BLUE OCEAN industries: why haven't they adopted AI? What's stopping them? Which businesses have done well? What are they selling? What opportunities exist?
3. HIDDEN NICHES: niches few have noticed with good/great chance, what products/services, what to do to hit them
4. NO-GO industries/goods/services to stay away from (and why)
5. BEST profit margin + lowest overhead + lowest cost + most automatable + least babysitting + easiest to template + 24/7 + build-and-let-go: rank top 20
6. WORST: most initial work + most maintenance + most money to start + least profit: rank top 10
7. GREATEST future potential: top 10 with 1/3/6/12-month and 1/3/5-year outlook
8. 1/3/6/12-month outlook for EVERY major industry in AI
9. 1/3/5-year outlook for every major good and service
10. Top areas NO ONE is paying attention to with opportunity (and why)`,
        specificInstructions: `Use the validated research: construction AI adoption is only 27%, decorative concrete is $20.55B growing at 5.51% CAGR. The biggest blue ocean is AI for construction trades because 45% have ZERO AI and the barriers are people/skills, not money.`
      },
      {
        name: '07_TOP_COMPETITORS_AND_WEALTH_TRENDS',
        folder: '04_Market_Research',
        prompt: `Create a document on TOP COMPETITORS AND WEALTH INVESTMENT TRENDS. Include:
1. Top 3-5 competitors in each major category (AI estimating, website builders, CRMs, etc.) with:
   - Company name, URL, pricing, strengths, weaknesses, market share estimate
2. Where the top 1-3% wealthiest are investing their time and money in AI and business (validated):
   - What they're investing in, how much, and why
   - What they're staying away from and why
3. Diversified strategy: short-term (0-3mo), mid-term (3-12mo), long-term (1-5yr) in AI and all industries
4. The "Lavin Factor" — how to leverage 70+ existing locations as an unfair advantage
5. Trade secrets and hidden tricks of the trade in AI automation and digital products
6. What the wealthiest know that others don't about AI business models`,
        specificInstructions: `Use validated data: Forbes Midas 2026 shows top VC bets are OpenAI, Anthropic, Cerebras, Wiz. Construction tech VC went 68% AI-specific in Q2 2025. The wealthy are investing in AI infrastructure + applied AI, staying away from legacy non-AI SaaS and physical retail.`
      },
      {
        name: '08_DEEPEST_CLONE_ACHIEVABLE_SPEC',
        folder: '06_Clone_Capabilities',
        prompt: `Create the DEEPEST CLONE ACHIEVABLE specification document. This defines what the autonomous clone-to-100 pipeline can actually achieve for ANY site, ANY industry, A-Z. Include:
1. WHAT IS INCLUDED in the deepest clone (end-to-end):
   - Visual design (HTML, CSS, images, fonts, colors, layout)
   - Content (text, headings, structure)
   - Navigation and page structure
   - Forms and interactive elements
   - Backend functionality (inferred APIs, database schema)
   - SEO metadata, schema markup
   - Mobile responsiveness
   - Performance optimization
   - Analytics and tracking setup
   - Stripe/payment integration
   - Domain and SSL provisioning
   - GitHub repo + CI/CD
   - Supabase backend
   - Vercel deployment
2. WHAT IS EXCLUDED (cannot be cloned):
   - Proprietary backend logic/algorithms
   - User accounts and data
   - Third-party API keys and integrations
   - Custom server-side processing
   - Licensed fonts/images
   - CDN-specific optimizations
   - Real-time features (websockets)
   - Mobile app binaries
3. The 100/100 parity score breakdown (visual + operational)
4. The 12-loop recursive remediation protocol
5. Known limitations (Supabase 2-project limit, Vercel rate limits, Browserbase scaling)
6. When to use deterministic clone vs LLM generation vs hybrid
7. Quality assurance and forensic audit checklist`,
        specificInstructions: `This is the technical spec for the autonomousCloneTo100 function. It already exists and works — document what it actually does: scrapes target, re-hosts assets, injects form handler, deploys to Vercel, validates, heals to 100/100.`
      },
      {
        name: '09_MASTER_PROMPT_LIBRARY_TOP_50',
        folder: '07_Prompt_Library',
        prompt: `Create the MASTER PROMPT LIBRARY with the TOP 50 PROMPTS for operating the entire Xtreme AI Systems platform. These prompts must stretch Base44, the AI, and the technology to maximum capability. For each prompt include:
- The prompt number (1-50)
- The prompt name
- The exact prompt text (ready to copy-paste)
- What it does
- When to use it
- Expected output

Organize into categories:
1. STRATEGIC PROMPTS (1-10): Business planning, market research, financial modeling
2. GENERATION PROMPTS (11-20): Website generation, app generation, brand generation
3. CLONING PROMPTS (21-30): Target analysis, clone instructions, repair directives
4. AUTOMATION PROMPTS (31-40): Workflow setup, scheduling, orchestration
5. OPTIMIZATION PROMPTS (41-50): SEO, conversion, performance, scaling

Also include the 5 MOST IMPORTANT prompts to start with (the absolute first things to run).`,
        specificInstructions: `These prompts should be production-ready, not generic. They should reference specific Base44 functions, entities, and capabilities. They should be designed to extract maximum value from the platform.`
      },
      {
        name: '10_GOVERNANCE_RISK_AND_KILL_SWITCH',
        folder: '09_Governance',
        prompt: `Create a GOVERNANCE, RISK AND KILL SWITCH document. Include:
1. Risk assessment matrix (financial, technical, legal, operational, reputational)
2. Credit burn rate monitoring and thresholds (when to pause)
3. Kill switch protocol (exact conditions that trigger a full pause)
4. Compliance framework (FTC affiliate disclosure, data privacy, copyright for clones)
5. Legal considerations for cloning sites (fair use, transformative work, what's legal)
6. Brand protection (what brand names to avoid, trademark considerations)
7. Data security and privacy protocols
8. Backup and disaster recovery plan
9. Quality gates and approval workflows
10. The "transparency obligation" — everything that must be disclosed to the user that wasn't explicitly asked about
11. Hidden tricks, trade secrets, and non-obvious opportunities
12. What could go wrong and how to prevent it`,
        specificInstructions: `Be FULLY transparent and HONEST. The user explicitly asked: 'if there are any hidden tricks of the trades, or trade secrets, or any possibilities that may help anything, you are obligated to note them.' List everything important that wasn't explicitly asked about.`
      }
    ];

    // Generate documents in parallel batches of 3 (to avoid timeout)
    const batchSize = 3;
    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = docs.slice(i, i + batchSize);
      console.log(`Generating batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(docs.length / batchSize)}...`);
      await Promise.all(batch.map(d => generateDoc(d)));
    }

    // ─── STEP 4: Log receipt ───
    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'xtreme_drive_bootstrap',
      action: 'scaffold_drive',
      status: result.errors.length > 0 ? 'partial' : 'success',
      summary: `Bootstrapped Xtreme AI Systems Drive: ${FOLDER_STRUCTURE.length} folders, master sheet with ${launchProjects.length + catalog.length + performers.length} rows, ${result.documents.length} strategic documents`,
      evidence: {
        root_folder_url: result.root_folder.url,
        master_sheet_url: result.master_sheet_url,
        document_count: result.documents.length,
        error_count: result.errors.length,
        document_urls: result.documents.map(d => ({ name: d.name, url: d.url }))
      }
    });

    console.log(`Bootstrap complete: ${result.documents.length} docs, ${result.errors.length} errors`);

    return Response.json({
      status: 'success',
      root_folder: result.root_folder,
      subfolders: result.subfolders,
      master_sheet_url: result.master_sheet,
      documents: result.documents,
      errors: result.errors,
      summary: {
        folders_created: FOLDER_STRUCTURE.length,
        sheet_rows: { cloned: launchProjects.length, opportunities: catalog.length, performers: performers.length },
        documents_generated: result.documents.length,
        errors: result.errors.length
      }
    });
  } catch (error) {
    console.error('bootstrapXtremeDrive error:', error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}