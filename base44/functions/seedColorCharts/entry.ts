import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { COLOR_DATA, FLOOR_SYSTEM_DATA } from "../../shared/colorData.js";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    // 1. Clear existing ColorChart records
    const oldColors = await base44.asServiceRole.entities.ColorChart.list(undefined, 1000);
    if (oldColors.length) {
      await base44.asServiceRole.entities.ColorChart.deleteMany(
        { id: { $in: oldColors.map((c) => c.id) } }
      );
    }

    // 2. Seed new ColorChart records (real XPS official swatch data)
    const colorRecords = COLOR_DATA.map((c) => ({
      system: c.system,
      color_name: c.color_name,
      code: c.code,
      hex: c.hex,
      image_url: c.image_url,
      collection: c.collection,
      sheen: c.sheen,
      in_stock: c.in_stock,
      rank: c.rank,
      vendor: "Xtreme Polishing Systems",
    }));
    // bulkCreate max 500 per call
    const createdColors = [];
    for (let i = 0; i < colorRecords.length; i += 500) {
      const batch = colorRecords.slice(i, i + 500);
      const res = await base44.asServiceRole.entities.ColorChart.bulkCreate(batch);
      createdColors.push(...res);
    }

    // 3. Clear existing FloorSystem records
    const oldSystems = await base44.asServiceRole.entities.FloorSystem.list(undefined, 100);
    if (oldSystems.length) {
      await base44.asServiceRole.entities.FloorSystem.deleteMany(
        { id: { $in: oldSystems.map((s) => s.id) } }
      );
    }

    // 4. Seed new FloorSystem records (aligned with real products, colors, sheen, pricing)
    const systemRecords = FLOOR_SYSTEM_DATA.map((s) => ({
      name: s.name,
      slug: s.slug,
      category: s.category,
      description: s.description,
      finishes: s.finishes,
      sheen_levels: s.sheen_levels,
      colors: s.colors,
      product_skus: s.product_skus,
      base_rate_low: s.base_rate_low,
      base_rate_high: s.base_rate_high,
      active: true,
    }));
    const createdSystems = await base44.asServiceRole.entities.FloorSystem.bulkCreate(systemRecords);

    return Response.json({
      ok: true,
      colorsSeeded: createdColors.length,
      systemsSeeded: createdSystems.length,
      colorSystems: [...new Set(COLOR_DATA.map((c) => c.system))],
      floorSystems: FLOOR_SYSTEM_DATA.map((s) => s.name),
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}