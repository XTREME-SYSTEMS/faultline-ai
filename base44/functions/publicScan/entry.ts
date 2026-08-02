import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { fetchPage, extractData } from '../../shared/scraper.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { url, email, company_name, name } = body;

    if (!url) return Response.json({ error: 'url required' }, { status: 400 });

    // Normalize URL
    let scanUrl = url.trim();
    if (!scanUrl.startsWith('http')) scanUrl = 'https://' + scanUrl;

    // Fetch the page
    const page = await fetchPage(scanUrl);
    if (!page.ok) return Response.json({ error: `Could not fetch ${scanUrl}: ${page.error || 'unknown error'}` }, { status: 502 });

    const data = extractData(page.html, scanUrl);

    // Quick security header check (from the fetch response — we don't have headers here, so infer from HTML)
    const securityIssues = [];
    if (!data.trustSignals.ssl) securityIssues.push('No SSL certificate — visitor data is not encrypted');
    if (data.imagesWithoutAlt > 5) securityIssues.push(`${data.imagesWithoutAlt} images without alt text — accessibility failure`);
    if (!data.hasViewport) securityIssues.push('No mobile viewport — site is broken on phones');
    if (!data.hasAnalytics) securityIssues.push('No analytics installed — flying blind on conversion data');
    if (data.h1Count === 0) securityIssues.push('No H1 heading — SEO and accessibility failure');
    if (!data.trustSignals.privacy) securityIssues.push('No privacy policy — GDPR/CCPA risk');
    if (data.ctaCount < 2) securityIssues.push(`Only ${data.ctaCount} call-to-action elements — visitors don't know what to do`);

    // Use LLM to generate 3 critical findings + revenue leak estimate
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are FaultLine AI's instant website diagnostic engine. A prospect just entered their website URL for a free 60-second scan. Analyze the extracted data and produce exactly 3 critical findings and a revenue leak estimate.

WEBSITE: ${scanUrl}
PAGE TITLE: ${data.title}
META DESCRIPTION: ${data.description || '(missing)'}

EXTRACTED DATA:
- Mobile responsive: ${data.hasViewport ? 'Yes' : 'NO — broken on mobile'}
- H1 headings: ${data.h1Count}
- Images without alt text: ${data.imagesWithoutAlt} (accessibility issue)
- Call-to-action elements: ${data.ctaCount}
- Analytics tracking: ${data.hasAnalytics ? 'Yes' : 'NO — no conversion data'}
- Structured data (SEO): ${data.hasStructuredData ? 'Yes' : 'NO'}
- Contact info visible: ${data.contactInfo.phone ? 'phone' : 'no phone'}, ${data.contactInfo.email ? 'email' : 'no email'}
- Trust signals: privacy=${data.trustSignals.privacy}, terms=${data.trustSignals.terms}, reviews=${data.trustSignals.reviews}, certifications=${data.trustSignals.certifications}
- SSL: ${data.trustSignals.ssl ? 'Yes' : 'NO'}
- Social links: facebook=${data.socialLinks.facebook}, linkedin=${data.socialLinks.linkedin}
- Page size: ${data.pageSize} chars, ${data.wordCount} words
- Forms: ${data.formCount}
- Mixed content warning: ${data.hasMixedContent ? 'YES — insecure elements on secure page' : 'No'}

PRE-DETECTED ISSUES:
${securityIssues.join('\n') || 'None pre-detected'}

Generate a JSON response with:
1. "findings": exactly 3 findings, each with: title (short, punchy), severity (critical/high/medium), description (1-2 sentences explaining the problem in plain English), impact (why it costs them money)
2. "revenue_leak_estimate": a dollar range (min and max, annual) with a brief explanation of how it was calculated
3. "health_score": 0-100 based on the issues found
4. "headline": a one-line punchy summary for the prospect (e.g., "Your website is losing you $40K-$80K per year")

Be specific and honest. Don't invent issues that aren't supported by the data. If the site looks good, say so — but still find the 3 most impactful improvement opportunities.`,
      response_json_schema: {
        type: 'object',
        properties: {
          findings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                severity: { type: 'string', enum: ['critical', 'high', 'medium'] },
                description: { type: 'string' },
                impact: { type: 'string' }
              }
            }
          },
          revenue_leak_estimate: {
            type: 'object',
            properties: {
              min: { type: 'number' },
              max: { type: 'number' },
              explanation: { type: 'string' }
            }
          },
          health_score: { type: 'number' },
          headline: { type: 'string' }
        }
      }
    });

    // Save as AuditLead (public, no login required)
    let lead = null;
    if (email && company_name) {
      try {
        lead = await base44.asServiceRole.entities.AuditLead.create({
          name: name || company_name,
          email,
          company: company_name,
          website: scanUrl,
          concern: 'website_performance',
          plan: 'Diagnostic',
          status: 'new',
          source: 'public_scan'
        });
      } catch (e) {
        // Lead save is best-effort — don't fail the scan
      }
    }

    return Response.json({
      status: 'success',
      url: scanUrl,
      headline: llmResponse.headline,
      health_score: llmResponse.health_score,
      findings: llmResponse.findings,
      revenue_leak_estimate: llmResponse.revenue_leak_estimate,
      lead_id: lead?.id || null
    });
  } catch (error) {
    console.error('publicScan error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}