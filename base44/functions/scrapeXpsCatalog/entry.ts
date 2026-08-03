import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const VENDOR = "Xtreme Polishing Systems";
const BASE = "https://xtremepolishingsystems.com";

// Collection slug -> Product entity category
const DEFAULT_COLLECTIONS = [
  { slug: "epoxy-floor-coatings", category: "epoxy_kit" },
  { slug: "epoxy-color-pigments", category: "pigment" },
  { slug: "moisture-barriers", category: "moisture_barrier" },
  { slug: "diy-epoxy-resin", category: "epoxy_kit" },
  { slug: "pre-mixed-quartz-coatings", category: "quartz" },
  { slug: "glitter-epoxy-coating", category: "glitter" },
  { slug: "epoxy-cove-base", category: "cove_base" },
  { slug: "protective-coatings", category: "polyaspartic" },
  { slug: "concrete-epoxy-applicator-tools", category: "tooling" },
  { slug: "traction-additives", category: "traction" },
  { slug: "cleaners-degreasers", category: "cleaner" },
  { slug: "concrete-densifiers-hardeners", category: "densifier" },
  { slug: "decorative-concrete-dyes-stains", category: "pigment" },
  { slug: "concrete-sealers-and-floor-protection", category: "sealer" },
  { slug: "joint-fillers-surface-repair", category: "joint_filler" },
  { slug: "overlayments", category: "overlayment" },
  { slug: "underlayments", category: "overlayment" },
  { slug: "primers", category: "epoxy_kit" },
  { slug: "burnishing-buffing-machines", category: "equipment" },
  { slug: "dust-collectors", category: "equipment" },
  { slug: "edge-grinding-machines", category: "equipment" },
  { slug: "grinding-polishing-machines", category: "equipment" },
  { slug: "angle-grinders", category: "equipment" },
  { slug: "air-scrubbers", category: "equipment" },
  { slug: "floor-polishing-pads", category: "tooling" },
  { slug: "flake-flooring-epoxy-coating", category: "flake" },
];

function parsePrice(v) {
  if (!v || !v.variants || !v.variants.length) return null;
  let min = null;
  for (const vr of v.variants) {
    const p = parseFloat(vr.price);
    if (!isNaN(p) && (min === null || p < min)) min = p;
  }
  return min;
}

async function fetchCollection(slug, maxPages) {
  const out = [];
  for (let page = 1; page <= maxPages; page++) {
    const url = `${BASE}/collections/${encodeURIComponent(slug)}/products.json?limit=250&page=${page}`;
    let data;
    try {
      const r = await fetch(url, { headers: { "User-Agent": "VisualQuoteAI-CatalogSync/1.0" } });
      if (!r.ok) break;
      data = await r.json();
    } catch {
      break;
    }
    const products = data && data.products ? data.products : [];
    if (!products.length) break;
    out.push(...products);
    if (products.length < 250) break;
  }
  return out;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const collections = body.collections && body.collections.length
      ? body.collections
      : DEFAULT_COLLECTIONS;
    const maxPages = body.maxPages || 5;
    const dryRun = !!body.dryRun;

    // 1. Scrape all collections
    const scraped = [];
    const perCollection = [];
    for (const c of collections) {
      const products = await fetchCollection(c.slug, maxPages);
      perCollection.push({ slug: c.slug, count: products.length });
      for (const p of products) {
        const productUrl = `${BASE}/products/${p.handle}`;
        const price = parsePrice(p);
        if (!p.title || price === null) continue;
        const size = (p.variants && p.variants[0])
          ? (p.variants[0].option1 || p.variants[0].title || "")
          : "";
        scraped.push({
          name: p.title,
          sku: (p.variants && p.variants[0] && p.variants[0].sku) || "",
          category: c.category,
          size,
          price,
          price_unit: "per unit",
          specs: p.product_type || "",
          product_url: productUrl,
          vendor: VENDOR,
          active: true,
        });
      }
    }

    if (dryRun) {
      return Response.json({
        dryRun: true,
        collections: perCollection,
        scrapedCount: scraped.length,
        sample: scraped.slice(0, 5),
      });
    }

    // 2. Dedupe scraped by product_url (products can appear in multiple collections)
    const scrapedByUrl = new Map();
    for (const s of scraped) {
      if (!scrapedByUrl.has(s.product_url)) scrapedByUrl.set(s.product_url, s);
    }

    // 3. Load existing XPS products and index by product_url
    const existing = await base44.asServiceRole.entities.Product.filter(
      { vendor: VENDOR }, undefined, 1000
    );
    const byUrl = new Map();
    for (const e of existing) byUrl.set(e.product_url, e);

    // 4. Diff into creates / updates
    const toCreate = [];
    const toUpdate = [];
    const seenUrls = new Set();
    for (const s of scrapedByUrl.values()) {
      seenUrls.add(s.product_url);
      const cur = byUrl.get(s.product_url);
      if (!cur) {
        toCreate.push(s);
      } else {
        const changed =
          cur.price !== s.price ||
          cur.size !== s.size ||
          cur.sku !== s.sku ||
          cur.category !== s.category ||
          cur.name !== s.name ||
          cur.active !== true;
        if (changed) {
          toUpdate.push({
            id: cur.id,
            name: s.name,
            sku: s.sku,
            category: s.category,
            size: s.size,
            price: s.price,
            specs: s.specs,
            active: true,
          });
        }
      }
    }

    // 5. Apply in batches of 500
    let created = 0;
    for (let i = 0; i < toCreate.length; i += 500) {
      const batch = toCreate.slice(i, i + 500);
      await base44.asServiceRole.entities.Product.bulkCreate(batch);
      created += batch.length;
    }
    let updated = 0;
    for (let i = 0; i < toUpdate.length; i += 500) {
      const batch = toUpdate.slice(i, i + 500);
      await base44.asServiceRole.entities.Product.bulkUpdate(batch);
      updated += batch.length;
    }

    return Response.json({
      ok: true,
      collections: perCollection,
      scrapedCount: scraped.length,
      created,
      updated,
      unchanged: scraped.length - created - updated,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}