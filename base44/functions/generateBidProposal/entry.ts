import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// AI Bid Writer — generates a professional construction bid/proposal from
// project details. Built as the first original Toolio product ($29 AI Tool).
//
// Input: project_name, project_type, scope_of_work, location, timeline,
//        materials_cost, labor_hours, overhead_pct, profit_pct, contractor info
// Output: a formatted bid with cover letter, line items, pricing breakdown,
//         terms & conditions, and a signature block — ready to send to clients.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const {
      project_name, project_type, scope_of_work, location, timeline,
      materials_cost, labor_hours, labor_rate, overhead_pct, profit_pct,
      contractor_name, contractor_license, contractor_phone, contractor_email,
      client_name, client_company
    } = body;

    if (!project_name || !scope_of_work) {
      return Response.json({ error: 'project_name and scope_of_work are required' }, { status: 400 });
    }

    // Compute the pricing breakdown deterministically (don't trust the LLM with math)
    const matCost = Number(materials_cost) || 0;
    const labHours = Number(labor_hours) || 0;
    const labRate = Number(labor_rate) || 65;
    const laborCost = labHours * labRate;
    const subtotal = matCost + laborCost;
    const ohPct = Number(overhead_pct) || 15;
    const pfPct = Number(profit_pct) || 20;
    const overheadCost = subtotal * (ohPct / 100);
    const profitCost = (subtotal + overheadCost) * (pfPct / 100);
    const total = subtotal + overheadCost + profitCost;

    const pricing = {
      materials: Math.round(matCost * 100) / 100,
      labor_hours: labHours,
      labor_rate: labRate,
      labor_total: Math.round(laborCost * 100) / 100,
      subtotal: Math.round(subtotal * 100) / 100,
      overhead_pct: ohPct,
      overhead_total: Math.round(overheadCost * 100) / 100,
      profit_pct: pfPct,
      profit_total: Math.round(profitCost * 100) / 100,
      total: Math.round(total * 100) / 100
    };

    // Generate the professional bid document via LLM
    const prompt = `You are a professional construction bid writer. Generate a complete, client-ready bid proposal for the following construction project. The output must be professional, detailed, and ready to send to a client.

CONTRACTOR INFO:
- Company: ${contractor_name || '[Contractor Name]'}
- License #: ${contractor_license || '[License #]'}
- Phone: ${contractor_phone || '[Phone]'}
- Email: ${contractor_email || '[Email]'}

CLIENT INFO:
- Client: ${client_name || '[Client Name]'}
- Company: ${client_company || '[Client Company]'}

PROJECT INFO:
- Project: ${project_name}
- Type: ${project_type || 'General Construction'}
- Location: ${location || '[Project Address]'}
- Timeline: ${timeline || '[Timeline]'}
- Scope of Work: ${scope_of_work}

PRICING BREAKDOWN (use these exact numbers — do NOT recalculate):
- Materials: $${pricing.materials.toLocaleString()}
- Labor: ${pricing.labor_hours} hrs @ $${pricing.labor_rate}/hr = $${pricing.labor_total.toLocaleString()}
- Subtotal: $${pricing.subtotal.toLocaleString()}
- Overhead (${pricing.overhead_pct}%): $${pricing.overhead_total.toLocaleString()}
- Profit (${pricing.profit_pct}%): $${pricing.profit_total.toLocaleString()}
- TOTAL BID: $${pricing.total.toLocaleString()}

Generate the bid with these sections, using markdown formatting:

1. **COVER LETTER** — A professional 2-3 paragraph cover letter thanking the client for the opportunity, referencing the project, and expressing confidence in delivering quality work on time and on budget.

2. **PROJECT OVERVIEW** — A clear summary of what will be done, referencing the scope of work in professional construction language.

3. **SCOPE OF WORK** — A detailed breakdown of the work to be performed, organized into logical phases (e.g., Site Prep, Demolition, Construction, Finishing, Cleanup). Each phase should have 3-5 specific tasks.

4. **MATERIALS & SUPPLIES** — A list of major materials needed for the project with estimated quantities.

5. **LABOR BREAKDOWN** — The labor requirements by trade (e.g., general labor, electrician, plumber) with estimated hours.

6. **PRICING SUMMARY** — A clean table with the exact pricing breakdown provided above.

7. **PROJECT TIMELINE** — A phased timeline with milestones and estimated durations totaling the overall timeline.

8. **TERMS & CONDITIONS** — Standard construction contract terms: payment schedule (e.g., 30% deposit, 30% at midpoint, 40% on completion), warranty period, change order policy, and validity period of the bid (30 days).

9. **ACCEPTANCE & SIGNATURE BLOCK** — A signature block for both the contractor and the client to sign and date.

Write this as a complete, professional document. Use markdown headings (##), bold text, and tables where appropriate. Make it specific to the project type and scope provided.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'gpt_5_4'
    });

    const bidMarkdown = typeof result === 'string' ? result : result?.content || result?.response || JSON.stringify(result);

    return Response.json({
      status: 'success',
      bid_markdown: bidMarkdown,
      pricing,
      project_name,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('generateBidProposal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}