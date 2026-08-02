import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { industry } = body;

    // Get all companies (optionally filtered by industry)
    const companies = await base44.asServiceRole.entities.Company.filter({ organization_id: orgId }, '-created_date', 500);
    const filtered = industry ? companies.filter(c => c.industry?.toLowerCase().includes(industry.toLowerCase())) : companies;

    // Get scan snapshots for all companies
    const allSnapshots = await base44.asServiceRole.entities.ScanSnapshot.filter({ organization_id: orgId }, '-created_date', 500);

    // Group by company and get latest health score
    const companyScores = {};
    for (const snap of allSnapshots) {
      if (!companyScores[snap.company_id] || new Date(snap.created_date) > new Date(companyScores[snap.company_id].date)) {
        companyScores[snap.company_id] = { score: snap.health_score || 0, date: snap.created_date };
      }
    }

    // Also use competitor_scores from Company entity
    for (const c of filtered) {
      if (!companyScores[c.id] && c.competitor_scores?.health_score) {
        companyScores[c.id] = { score: c.competitor_scores.health_score, date: c.created_date };
      }
    }

    const scores = Object.values(companyScores).map(s => s.score).filter(s => s > 0);
    if (scores.length === 0) {
      return Response.json({
        status: 'success',
        industry: industry || 'all',
        company_count: filtered.length,
        benchmark: { average: 0, median: 0, top_quartile: 0, bottom_quartile: 0, scored_companies: 0 }
      });
    }

    scores.sort((a, b) => a - b);
    const avg = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
    const median = scores[Math.floor(scores.length / 2)];
    const topQuartile = scores[Math.floor(scores.length * 0.75)];
    const bottomQuartile = scores[Math.floor(scores.length * 0.25)];

    return Response.json({
      status: 'success',
      industry: industry || 'all',
      company_count: filtered.length,
      scored_companies: scores.length,
      benchmark: {
        average: avg,
        median,
        top_quartile: topQuartile,
        bottom_quartile: bottomQuartile,
        distribution: scores
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}