import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// CategorizeWebsite — takes any URL, scrapes the page, and uses LLM to
// auto-classify it into the correct industry from the Clone Gallery taxonomy.
// Returns { site_name, industry, industry_group, description, confidence }.
// If the user is authenticated, also creates a CloneQueue record so the site
// enters the same clone → customize → gallery workflow as the Studio.

const INDUSTRY_TAXONOMY = [
  // Sector One — Construction & Contracting
  { group: 'Construction & Contracting', label: 'General Contractors' },
  { group: 'Construction & Contracting', label: 'Roofing Contractors' },
  { group: 'Construction & Contracting', label: 'HVAC Contractors' },
  { group: 'Construction & Contracting', label: 'Plumbing Contractors' },
  { group: 'Construction & Contracting', label: 'Electrical Contractors' },
  { group: 'Construction & Contracting', label: 'Concrete & Foundation' },
  { group: 'Construction & Contracting', label: 'Epoxy & Flooring' },
  { group: 'Construction & Contracting', label: 'Drywall & Painting' },
  { group: 'Construction & Contracting', label: 'Landscaping & Hardscaping' },
  { group: 'Construction & Contracting', label: 'Fencing Contractors' },
  { group: 'Construction & Contracting', label: 'Demolition Services' },
  { group: 'Construction & Contracting', label: 'Remodeling & Renovation' },
  // Sector One — Home Services
  { group: 'Home Services', label: 'Cleaning Services' },
  { group: 'Home Services', label: 'Pest Control' },
  { group: 'Home Services', label: 'Pool Services' },
  { group: 'Home Services', label: 'Window Cleaning' },
  { group: 'Home Services', label: 'Junk Removal' },
  { group: 'Home Services', label: 'Moving Services' },
  { group: 'Home Services', label: 'Locksmith Services' },
  { group: 'Home Services', label: 'Appliance Repair' },
  // Sector One — Auto Services
  { group: 'Automotive', label: 'Auto Repair Shops' },
  { group: 'Automotive', label: 'Auto Body & Collision' },
  { group: 'Automotive', label: 'Car Wash & Detailing' },
  { group: 'Automotive', label: 'Towing Services' },
  { group: 'Automotive', label: 'Tire & Wheel Shops' },
  { group: 'Automotive', label: 'Oil Change Services' },
  // Sector Two — Professional Services
  { group: 'Professional Services', label: 'Law Firms' },
  { group: 'Professional Services', label: 'Accounting & Tax' },
  { group: 'Professional Services', label: 'Insurance Agencies' },
  { group: 'Professional Services', label: 'Real Estate Agencies' },
  { group: 'Professional Services', label: 'Mortgage Brokers' },
  { group: 'Professional Services', label: 'Financial Advisors' },
  { group: 'Professional Services', label: 'Consulting Firms' },
  { group: 'Professional Services', label: 'Marketing Agencies' },
  { group: 'Professional Services', label: 'Architecture & Engineering' },
  // Sector Two — Health & Beauty
  { group: 'Health & Beauty', label: 'Dental Practices' },
  { group: 'Health & Beauty', label: 'Medical Practices' },
  { group: 'Health & Beauty', label: 'Chiropractic Clinics' },
  { group: 'Health & Beauty', label: 'Physical Therapy' },
  { group: 'Health & Beauty', label: 'Veterinary Clinics' },
  { group: 'Health & Beauty', label: 'Med Spas & Aesthetics' },
  { group: 'Health & Beauty', label: 'Hair Salons & Barbershops' },
  { group: 'Health & Beauty', label: 'Nail Salons' },
  { group: 'Health & Beauty', label: 'Tattoo Studios' },
  { group: 'Health & Beauty', label: 'Fitness & Gyms' },
  // Sector Two — Food & Hospitality
  { group: 'Food & Hospitality', label: 'Restaurants & Dining' },
  { group: 'Food & Hospitality', label: 'Cafes & Coffee Shops' },
  { group: 'Food & Hospitality', label: 'Bars & Nightclubs' },
  { group: 'Food & Hospitality', label: 'Catering Services' },
  { group: 'Food & Hospitality', label: 'Food Trucks' },
  { group: 'Food & Hospitality', label: 'Hotels & Lodging' },
  { group: 'Food & Hospitality', label: 'Event Venues' },
  // Sector Two — Retail & E-commerce
  { group: 'Retail & E-commerce', label: 'Online Stores' },
  { group: 'Retail & E-commerce', label: 'Boutique Shops' },
  { group: 'Retail & E-commerce', label: 'Furniture & Home Goods' },
  { group: 'Retail & E-commerce', label: 'Electronics Stores' },
  { group: 'Retail & E-commerce', label: 'Sporting Goods' },
  { group: 'Retail & E-commerce', label: 'Jewelry Stores' },
  { group: 'Retail & E-commerce', label: 'Flower Shops' },
  // Sector Two — Education & Childcare
  { group: 'Education & Childcare', label: 'Daycare & Preschools' },
  { group: 'Education & Childcare', label: 'Tutoring Services' },
  { group: 'Education & Childcare', label: 'Music & Arts Schools' },
  { group: 'Education & Childcare', label: 'Driving Schools' },
  { group: 'Education & Childcare', label: 'Trade Schools' },
  // Sector Two — Technology & SaaS
  { group: 'Technology & SaaS', label: 'Software Companies' },
  { group: 'Technology & SaaS', label: 'IT Services & MSPs' },
  { group: 'Technology & SaaS', label: 'Web Design Agencies' },
  { group: 'Technology & SaaS', label: 'Cybersecurity Firms' },
  { group: 'Technology & SaaS', label: 'Data & Analytics' },
  { group: 'Technology & SaaS', label: 'AI & Automation Tools' },
];

function deriveName(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const parts = host.split('.');
    if (parts.length >= 2) return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    return host;
  } catch { return 'Unknown'; }
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const url = (body.url || '').trim();
    if (!url) return Response.json({ error: 'URL is required' }, { status: 400 });

    const normalizedUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;

    // Step 1: Scrape the site for title, meta description, and text content
    let siteName = deriveName(normalizedUrl);
    let description = '';
    let pageContent = '';

    try {
      const r = await fetch(normalizedUrl, {
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FaultLineScanner/1.0)' },
      });
      const html = await r.text();

      // Extract title
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      if (titleMatch && titleMatch[1].trim()) siteName = titleMatch[1].trim().slice(0, 100);

      // Extract meta description
      const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
      if (descMatch) description = descMatch[1].trim().slice(0, 500);

      // Extract meta keywords
      const kwMatch = html.match(/<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']+)["']/i);
      const keywords = kwMatch ? kwMatch[1].trim() : '';

      // Extract og:title and og:description as fallbacks
      const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
      if (ogTitleMatch && !titleMatch) siteName = ogTitleMatch[1].trim().slice(0, 100);
      const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
      if (ogDescMatch && !description) description = ogDescMatch[1].trim().slice(0, 500);

      // Strip HTML tags and get text content for LLM analysis
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      pageContent = (text + ' ' + description + ' ' + keywords).slice(0, 3000);
    } catch (e) {
      console.log('Scrape failed, will use LLM with URL only:', e.message);
      pageContent = normalizedUrl;
    }

    // Step 2: Use LLM to categorize the site into the industry taxonomy
    const taxonomyList = INDUSTRY_TAXONOMY.map(t => `${t.group} → ${t.label}`).join('\n');

    const llmRes = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a business classification expert. Analyze the following website and classify it into the EXACT industry category from the taxonomy below.

Website URL: ${normalizedUrl}
Site Name: ${siteName}
Description: ${description}
Page Content (truncated): ${pageContent}

AVAILABLE INDUSTRY TAXONOMY (pick exactly one):
${taxonomyList}

Respond with a JSON object containing:
- "industry_group": the group name from the taxonomy (e.g. "Construction & Contracting")
- "industry": the specific label from the taxonomy (e.g. "Roofing Contractors")
- "site_name": a clean, proper business name (extracted from the page or derived from the URL)
- "description": a 1-2 sentence summary of what this business does
- "confidence": your confidence level (high, medium, or low)

Pick the closest match. If the site doesn't fit any category perfectly, pick the closest one.`,
      response_json_schema: {
        type: 'object',
        properties: {
          industry_group: { type: 'string' },
          industry: { type: 'string' },
          site_name: { type: 'string' },
          description: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['industry_group', 'industry', 'site_name', 'confidence'],
      },
    });

    const categorization = llmRes.data || llmRes;

    // Validate the industry exists in our taxonomy; if not, find closest match
    let finalIndustry = categorization.industry || 'General Contractors';
    let finalGroup = categorization.industry_group || 'Construction & Contracting';

    const exactMatch = INDUSTRY_TAXONOMY.find(
      t => t.label.toLowerCase() === finalIndustry.toLowerCase() && t.group.toLowerCase() === finalGroup.toLowerCase()
    );
    if (!exactMatch) {
      const partialMatch = INDUSTRY_TAXONOMY.find(
        t => t.label.toLowerCase().includes(finalIndustry.toLowerCase()) || finalIndustry.toLowerCase().includes(t.label.toLowerCase())
      );
      if (partialMatch) {
        finalIndustry = partialMatch.label;
        finalGroup = partialMatch.group;
      }
    }

    const result = {
      url: normalizedUrl,
      site_name: categorization.site_name || siteName,
      industry: finalIndustry,
      industry_group: finalGroup,
      description: categorization.description || description,
      confidence: categorization.confidence || 'medium',
    };

    // Step 3: If auto_queue is true, create a CloneQueue record
    if (body.auto_queue) {
      const user = await base44.auth.me().catch(() => null);
      const orgId = user?.data?.organization_id;
      if (orgId) {
        try {
          const queueItem = await base44.entities.CloneQueue.create({
            organization_id: orgId,
            target_url: normalizedUrl,
            site_name: result.site_name,
            industry: result.industry,
            priority: 'medium',
            status: 'queued',
            source: 'manual',
            notes: `Auto-categorized: ${result.industry_group} → ${result.industry} (${result.confidence} confidence)`,
          });
          result.queue_item_id = queueItem.id;
        } catch (e) {
          console.error('Failed to create queue item:', e.message);
        }
      }
    }

    return Response.json({ status: 'success', ...result });
  } catch (error) {
    console.error('categorizeWebsite error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}