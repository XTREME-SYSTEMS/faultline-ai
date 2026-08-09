import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Autonomous SEO Agent for "Epoxy Garage Floors Near You"
// Persistently enhances the site's search ranking through:
//   - SEO/AEO analysis and recommendations
//   - Content generation (FAQs, location pages, blog outlines)
//   - Keyword monitoring and opportunity discovery
//   - Full audit with prioritized action plan
//
// Runs daily via the "Autonomous SEO Agent" workflow.

const SITE_NAME = 'Epoxy Garage Floors Near You';
const SITE_URL = 'https://epoxygaragefloorsnearyou.com';

export default async function (req) {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { action } = body;

  try {
    // ─── ACTION: full_audit ───
    // Comprehensive SEO/AEO audit — the main action the daily workflow calls.
    // Returns a prioritized action plan for reaching page 1 as fast as possible.
    if (action === 'full_audit') {
      const [audit, keywords] = await Promise.all([
        base44.integrations.Core.InvokeLLM({
          prompt: `You are a world-class SEO and AEO strategist. Perform a comprehensive audit for "${SITE_NAME}" — a lead generation funnel for epoxy garage floor coating services at ${SITE_URL}/epoxy-estimate.

The site offers: free instant estimates, 30+ color choices with AI visualizer, one-day installation, lifetime warranty, and serves 8+ states.

Identify ALL opportunities to reach page 1 of Google as fast as technologically possible:
1. Quick-win keywords (low competition, decent volume, high commercial intent)
2. Content gaps vs top competitors (GarageForce, Penntek, Spartan Epoxies)
3. Technical SEO issues to fix
4. Schema markup gaps
5. AEO / voice search / AI assistant optimization opportunities
6. Local SEO quick wins (Google Business Profile, citations, NAP)
7. Backlink opportunities
8. Content velocity plan (how many pages/week to publish)
9. Internal linking strategy
10. Conversion rate optimization recommendations

Return a structured, prioritized action plan.`,
          add_context_from_internet: true,
          model: 'gemini_3_flash',
          response_json_schema: {
            type: 'object',
            properties: {
              quick_wins: { type: 'array', items: { type: 'object', properties: {
                action: { type: 'string' }, keyword: { type: 'string' }, expected_impact: { type: 'string' }, timeframe: { type: 'string' }
              } } },
              content_plan: { type: 'array', items: { type: 'object', properties: {
                week: { type: 'number' }, deliverables: { type: 'array', items: { type: 'string' } }
              } } },
              technical_fixes: { type: 'array', items: { type: 'string' } },
              aeo_opportunities: { type: 'array', items: { type: 'string' } },
              local_seo_actions: { type: 'array', items: { type: 'string' } },
              backlink_strategy: { type: 'array', items: { type: 'string' } },
              cro_recommendations: { type: 'array', items: { type: 'string' } },
              estimated_timeline_page1: { type: 'string' }
            }
          }
        }),
        base44.integrations.Core.InvokeLLM({
          prompt: `Generate 30 long-tail keyword variations for "epoxy garage floor" with low competition and high commercial intent. Focus on:
- Local keywords (city + epoxy garage floor)
- Question keywords (how, what, why, cost, near me)
- Comparison keywords (epoxy vs polyurea, epoxy vs tiles)
- Problem keywords (cracked garage floor, oil stains garage)
Return each with search intent, estimated difficulty, and recommended content type.`,
          add_context_from_internet: true,
          model: 'gemini_3_flash',
          response_json_schema: {
            type: 'object',
            properties: {
              keywords: { type: 'array', items: { type: 'object', properties: {
                keyword: { type: 'string' }, intent: { type: 'string' }, difficulty: { type: 'string' }, content_type: { type: 'string' }
              } } }
            }
          }
        })
      ]);

      // Store the audit as a QAReport for tracking
      try {
        await base44.asServiceRole.entities.QAReport.create({
          organization_id: 'public',
          target_type: 'website',
          target_title: `${SITE_NAME} — SEO/AEO Audit`,
          check_type: 'qa_validation',
          status: 'passed',
          score: 0,
          summary: `Autonomous SEO audit: ${audit.quick_wins?.length || 0} quick wins, ${keywords.keywords?.length || 0} keyword opportunities. Estimated page 1 timeline: ${audit.estimated_timeline_page1 || 'TBD'}`,
          recommendations: [
            ...(audit.quick_wins || []).map((w) => `${w.action} (keyword: ${w.keyword}, impact: ${w.expected_impact}, timeframe: ${w.timeframe})`),
            ...(audit.technical_fixes || []).map((t) => `Technical: ${t}`),
            ...(audit.aeo_opportunities || []).map((a) => `AEO: ${a}`),
            ...(audit.local_seo_actions || []).map((l) => `Local SEO: ${l}`),
            ...(audit.backlink_strategy || []).map((b) => `Backlink: ${b}`),
            ...(audit.cro_recommendations || []).map((c) => `CRO: ${c}`)
          ],
          auto_generated: true
        });
      } catch (e) {
        console.error('Failed to store audit:', e.message);
      }

      return Response.json({
        status: 'success',
        audit,
        keyword_opportunities: keywords.keywords,
        audit_timestamp: new Date().toISOString()
      });
    }

    // ─── ACTION: generate_content ───
    // Generates SEO-optimized content: FAQs, location pages, or blog outlines
    if (action === 'generate_content') {
      const { content_type, keyword, location } = body;

      if (content_type === 'faq') {
        const content = await base44.integrations.Core.InvokeLLM({
          prompt: `Generate 10 SEO-optimized FAQ entries for "${SITE_NAME}" targeting the keyword "${keyword}". Each answer should be concise (2-3 sentences), factual, and optimized for voice search and AI assistants (AEO). Include pricing, timing, durability, and warranty information where relevant. Format as question/answer pairs.`,
          add_context_from_internet: true,
          model: 'gemini_3_flash',
          response_json_schema: {
            type: 'object',
            properties: {
              faqs: { type: 'array', items: { type: 'object', properties: {
                question: { type: 'string' }, answer: { type: 'string' }
              } } }
            }
          }
        });
        return Response.json({ status: 'success', content_type, keyword, content });
      }

      if (content_type === 'location_page') {
        const content = await base44.integrations.Core.InvokeLLM({
          prompt: `Generate SEO-optimized content for a location landing page for "${SITE_NAME}" targeting "${location}". Include:
1. H1 heading with location name
2. Intro paragraph (200 words) mentioning local landmarks and climate considerations for epoxy
3. 3 service highlights specific to the area
4. FAQ section (5 questions) specific to the location
5. Call-to-action
Target keyword: "epoxy garage floors ${location}" and "garage floor coating ${location}"`,
          add_context_from_internet: true,
          model: 'gemini_3_flash',
          response_json_schema: {
            type: 'object',
            properties: {
              h1: { type: 'string' },
              meta_description: { type: 'string' },
              intro: { type: 'string' },
              highlights: { type: 'array', items: { type: 'string' } },
              faqs: { type: 'array', items: { type: 'object', properties: {
                question: { type: 'string' }, answer: { type: 'string' }
              } } },
              cta: { type: 'string' }
            }
          }
        });
        return Response.json({ status: 'success', content_type, location, content });
      }

      if (content_type === 'blog_post') {
        const content = await base44.integrations.Core.InvokeLLM({
          prompt: `Generate an SEO-optimized blog post outline for "${SITE_NAME}" targeting the keyword "${keyword}". Include:
1. Catchy, keyword-rich title (under 60 chars)
2. Meta description (under 160 chars)
3. 5-7 H2 section headings
4. Key points for each section
5. FAQ schema questions (3-5)
6. Recommended internal links to /epoxy-estimate`,
          add_context_from_internet: true,
          model: 'gemini_3_flash',
          response_json_schema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              meta_description: { type: 'string' },
              sections: { type: 'array', items: { type: 'object', properties: {
                heading: { type: 'string' }, key_points: { type: 'array', items: { type: 'string' } }
              } } },
              faq_questions: { type: 'array', items: { type: 'string' } }
            }
          }
        });
        return Response.json({ status: 'success', content_type, keyword, content });
      }

      return Response.json({ error: 'Unknown content_type: ' + content_type }, { status: 400 });
    }

    // ─── ACTION: monitor_keywords ───
    // Checks keyword competition and search intent
    if (action === 'monitor_keywords') {
      const keywords = body.keywords || [
        'epoxy garage floor near me',
        'epoxy garage floor cost',
        'garage floor coating',
        'epoxy flooring installation',
        'polyurea garage floor',
        'garage floor resurfacing near me',
        'best epoxy for garage floor',
        'garage floor epoxy price per sq ft'
      ];

      const data = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze search intent and competition for these keywords related to epoxy garage floor coating: ${keywords.join(', ')}. For each keyword provide:
1. Search intent (commercial, informational, transactional)
2. Estimated monthly search volume (US)
3. Competition level (low, medium, high)
4. Recommended content type to rank
5. SERP features available (featured snippet, FAQ, local pack, video, etc.)`,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            keywords: { type: 'array', items: { type: 'object', properties: {
              keyword: { type: 'string' }, intent: { type: 'string' }, volume: { type: 'string' },
              competition: { type: 'string' }, content_type: { type: 'string' },
              serp_features: { type: 'array', items: { type: 'string' } }
            } } }
          }
        }
      });

      return Response.json({ status: 'success', monitoring: data });
    }

    // ─── ACTION: generate_location_pages ───
    // Bulk-generates location page content for all service areas
    if (action === 'generate_location_pages') {
      const locations = body.locations || [
        'Florida', 'Georgia', 'Texas', 'California',
        'North Carolina', 'South Carolina', 'Tennessee', 'Arizona'
      ];

      const content = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate SEO-optimized location page summaries for "${SITE_NAME}" for each of these states: ${locations.join(', ')}. For each state, provide:
1. A unique H1 heading
2. A 100-word intro paragraph mentioning the state's climate and how it affects garage floor coating
3. 3 target keywords for that location
Make each location page unique — avoid duplicate content.`,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            pages: { type: 'array', items: { type: 'object', properties: {
              state: { type: 'string' }, h1: { type: 'string' }, intro: { type: 'string' }, keywords: { type: 'array', items: { type: 'string' } }
            } } }
          }
        }
      });

      return Response.json({ status: 'success', location_pages: content.pages });
    }

    return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });
  } catch (error) {
    console.error('AutonomousSeoAgent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}