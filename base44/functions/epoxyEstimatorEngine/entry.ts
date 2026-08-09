import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Epoxy Garage Floor Estimate Engine
// Handles: visualizer (before/after generation), address sqft scraper, bid generation + email
export default async function (req) {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { action } = body;

  try {
    // ─── ACTION 1: Generate Before/After Visualization ───
    // User uploads garage photo + picks flake color → AI generates "after" image
    if (action === 'generate_visualization') {
      const { photo_url, flake_color_name, flake_hex, color_image_url, sheen } = body;
      if (!photo_url) return Response.json({ error: 'photo_url required' }, { status: 400 });

      const sheenDesc = sheen === 'matte' ? 'matte (flat, low-reflection, no shine)' : sheen === 'satin' ? 'satin (soft sheen, subtle reflection)' : 'gloss (high shine, mirror-like reflection)';

      // Generate the "after" image — use the uploaded photo as the base and the
      // color chart swatch image as the exact color reference so the AI matches it precisely
      const refImages = color_image_url ? [photo_url, color_image_url] : [photo_url];
      const afterRes = await base44.integrations.Core.GenerateImage({
        prompt: `Professional photograph of a garage floor that has been resurfaced with a premium epoxy coating in the EXACT color "${flake_color_name}" (hex ${flake_hex}).

CRITICAL: Match the exact color from the provided color chart swatch image. The floor color must be an exact match to the swatch — do not alter, shift, or approximate the color. The floor has a decorative finish with uniform color distribution. The sheen/finish must be ${sheenDesc}.

Use the uploaded garage photo as the base — keep the same room layout, walls, and garage door. Only change the floor surface to show the new ${flake_color_name} coating with a ${sheen || 'gloss'} finish. The garage is clean, well-lit. Photorealistic, high-end home improvement photography, wide angle. The floor looks brand new and professionally installed.`,
        existing_image_urls: refImages
      });

      return Response.json({
        status: 'success',
        before_url: photo_url,
        after_url: afterRes.url,
        flake_color: flake_color_name,
        flake_hex,
        sheen: sheen || 'gloss'
      });
    }

    // ─── ACTION 2: Lookup Garage Sq Ft from Public Records ───
    // Uses LLM with web search to find property details on Zillow/county records
    if (action === 'lookup_sqft') {
      const { address, garage_size } = body;
      if (!address) return Response.json({ error: 'address required' }, { status: 400 });

      const llmRes = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a property records lookup system. Search for the property at this address: "${address}".

Look up this property on Zillow, Redfin, or county property appraiser records. Find:
1. The property type (single family, condo, townhouse)
2. The year built
3. The total living area (sq ft)
4. The estimated garage size based on the property

If the garage size was specified by the homeowner as "${garage_size}", use that as a cross-reference.

Standard garage sizes:
- 1-car garage: ~240 sq ft (12x20)
- 2-car garage: ~440 sq ft (22x20)
- 3-car garage: ~660 sq ft (22x30)
- 4-car garage: ~880 sq ft (22x40)

Return the detected garage square footage and property details. If you cannot find exact records, estimate based on the property type and garage size specified.`,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            found: { type: 'boolean' },
            property_type: { type: 'string' },
            year_built: { type: 'number' },
            living_area_sqft: { type: 'number' },
            garage_sqft: { type: 'number' },
            garage_size_estimate: { type: 'string' },
            source: { type: 'string' },
            confidence: { type: 'string', enum: ['high', 'medium', 'low'] }
          }
        }
      });

      // If LLM couldn't find it, estimate from garage_size
      let garageSqft = llmRes.garage_sqft || 0;
      if (!garageSqft && garage_size) {
        const sizeMap = { '1-car': 240, '2-car': 440, '3-car': 660, '4-car': 880 };
        garageSqft = sizeMap[garage_size] || 440;
      }

      return Response.json({
        status: 'success',
        found: llmRes.found || false,
        property_type: llmRes.property_type || 'Unknown',
        year_built: llmRes.year_built || null,
        living_area_sqft: llmRes.living_area_sqft || null,
        garage_sqft: garageSqft,
        garage_size_estimate: llmRes.garage_size_estimate || garage_size || '2-car (estimated)',
        source: llmRes.source || 'Estimated from garage size',
        confidence: llmRes.confidence || 'medium'
      });
    }

    // ─── ACTION 3: Generate Bid + Email to Homeowner ───
    // Takes all collected info, generates a professional bid, emails it
    if (action === 'generate_bid') {
      const { lead_id, name, email, phone, address, garage_sqft, garage_size, floor_condition, flake_color, flake_hex, before_url, after_url } = body;
      if (!email) return Response.json({ error: 'email required' }, { status: 400 });

      // Pricing calculation — epoxy flake system at $3-7/sq ft
      const lowRate = 3.5;
      const highRate = 6.5;
      const lowEstimate = Math.round(garage_sqft * lowRate);
      const highEstimate = Math.round(garage_sqft * highRate);

      // Generate professional bid via LLM
      const bidRes = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a professional epoxy garage floor contractor bid writer for Epoxy Garage Floors Near You. Generate a detailed, professional bid proposal for the following customer:

Customer: ${name}
Address: ${address}
Garage Size: ${garage_size} (${garage_sqft} sq ft detected from public records)
Floor Condition: ${floor_condition}
Selected Flake Color: ${flake_color}

Estimated Price Range: $${lowEstimate} - $${highEstimate}

Write a professional bid proposal that includes:
1. Project summary
2. Detected garage square footage (from public records lookup)
3. Recommended system: Full Flake Epoxy System in ${flake_color}
4. Price breakdown (materials, labor, preparation, coating)
5. What's included (surface prep, crack repair, primer, base coat, flake broadcast, top coat)
6. Timeline (2-day installation, 24-hour cure)
7. Warranty (10 year residential)
8. Next steps

Format as clean HTML for email. Professional, trustworthy tone. Brand: Epoxy Garage Floors Near You.`,
        response_json_schema: {
          type: 'object',
          properties: {
            bid_html: { type: 'string' },
            project_summary: { type: 'string' },
            total_low: { type: 'number' },
            total_high: { type: 'number' }
          }
        }
      });

      // Email the bid to the homeowner
      try {
        await base44.integrations.Core.SendEmail({
          to: email,
          subject: `Your Epoxy Garage Floor Estimate — ${flake_color} — $${lowEstimate}–$${highEstimate}`,
          body: bidRes.bid_html || `<h2>Your Epoxy Garage Floor Estimate</h2><p>Hi ${name},</p><p>Based on your garage at ${address} (${garage_sqft} sq ft detected from public records), your estimated price range for a Full Flake Epoxy System in ${flake_color} is <strong>$${lowEstimate} – $${highEstimate}</strong>.</p><p>A specialist from Epoxy Garage Floors Near You will contact you within 24 hours to schedule your free in-home consultation.</p><p>Call us: (954) 555-0199</p>`
        });
      } catch (e) {
        console.error('Email send failed:', e.message);
      }

      // Update lead record if provided
      if (lead_id) {
        await base44.asServiceRole.entities.Lead.update(lead_id, {
          status: 'estimate_sent',
          color_name: flake_color,
          color_hex: flake_hex,
          square_feet: garage_sqft,
          estimate_low: lowEstimate,
          estimate_high: highEstimate,
          photo_url: before_url,
          notes: `Garage: ${garage_sqft} sq ft | Flake: ${flake_color} | Bid emailed to ${email}`
        }).catch(() => {});
      }

      return Response.json({
        status: 'success',
        low_estimate: lowEstimate,
        high_estimate: highEstimate,
        garage_sqft,
        bid_sent: true,
        project_summary: bidRes.project_summary
      });
    }

    // ─── ACTION 4: Create Lead ───
    // Stores the lead in the database (service role — public page, no auth)
    if (action === 'create_lead') {
      const { name, email, phone, address, garage_size, floor_condition } = body;
      const user = await base44.auth.me().catch(() => null);
      const orgId = user?.data?.organization_id || 'public';
      const lead = await base44.asServiceRole.entities.Lead.create({
        customer_name: name,
        email,
        phone,
        project_address: address,
        space_type: 'garage',
        floor_type: garage_size,
        finish: floor_condition,
        status: 'new',
        source: 'lead_generator',
        organization_id: orgId,
        notes: `Garage: ${garage_size} | Conditions: ${floor_condition} | Source: epoxygaragefloorsnearyou.com`
      });

      return Response.json({ status: 'success', lead_id: lead.id });
    }

    return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });
  } catch (error) {
    console.error('EpoxyEstimatorEngine error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}