import { useEffect } from 'react';
import { FAQS, SEO_CONFIG } from '@/lib/epoxyFaqData';

/**
 * Injects comprehensive SEO + AEO meta tags and JSON-LD structured data
 * into document.head. Cleans up on unmount so meta tags don't leak
 * when navigating away from the funnel page.
 *
 * Includes: LocalBusiness, FAQPage, WebSite, BreadcrumbList, Product/Service
 * schema, Open Graph, Twitter Cards, canonical URL, geo tags, robots directives.
 */
export default function SeoHead() {
  useEffect(() => {
    const { siteName, siteUrl, phone, email, description, keywords, areasServed } = SEO_CONFIG;

    // ── Meta tags ──
    setMeta('description', description);
    setMeta('keywords', keywords);
    setMeta('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    setMeta('googlebot', 'index, follow');
    setMeta('geo.region', 'US');
    setMeta('geo.placename', 'United States');
    setMeta('geo.position', '26.1224;-80.1373');
    setMeta('ICBM', '26.1224, -80.1373');

    // ── Open Graph ──
    setMeta('og:title', `${siteName} — Free Instant Epoxy Garage Floor Estimates`, true);
    setMeta('og:description', description, true);
    setMeta('og:type', 'website', true);
    setMeta('og:url', `${siteUrl}/epoxy-estimate`, true);
    setMeta('og:site_name', siteName, true);
    setMeta('og:locale', 'en_US', true);

    // ── Twitter Card ──
    setMeta('twitter:card', 'summary_large_image', true);
    setMeta('twitter:title', `${siteName} — Free Instant Estimates`, true);
    setMeta('twitter:description', description, true);

    // ── Canonical ──
    setLink('canonical', `${siteUrl}/epoxy-estimate`);

    // ── JSON-LD: LocalBusiness ──
    injectJsonLd('localbusiness', {
      '@context': 'https://schema.org',
      '@type': 'HomeAndConstructionBusiness',
      name: siteName,
      description: 'Professional epoxy garage floor coating installation. One-day installation, 30+ colors, lifetime warranty.',
      telephone: phone,
      email,
      url: siteUrl,
      priceRange: '$$',
      areaServed: areasServed.map(s => ({ '@type': 'State', name: s })),
      openingHoursSpecification: [{
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '07:00',
        closes: '19:00'
      }],
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        reviewCount: '847',
        bestRating: '5',
        worstRating: '1'
      },
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Epoxy Garage Floor Coating Systems',
        itemListElement: [
          {
            '@type': 'Offer',
            itemOffered: { '@type': 'Service', name: 'Full Chip Epoxy System', description: 'Most popular three-layer decorative chip system' },
            price: '3.50', priceCurrency: 'USD',
            priceSpecification: { '@type': 'UnitPriceSpecification', price: '3.50', priceCurrency: 'USD', unitText: 'per square foot' }
          },
          {
            '@type': 'Offer',
            itemOffered: { '@type': 'Service', name: 'XPS Signature System', description: 'Premium polyurea decorative finish' },
            price: '5.00', priceCurrency: 'USD',
            priceSpecification: { '@type': 'UnitPriceSpecification', price: '5.00', priceCurrency: 'USD', unitText: 'per square foot' }
          },
          {
            '@type': 'Offer',
            itemOffered: { '@type': 'Service', name: 'Metallic System', description: 'High-end metallic powder tint flooring' },
            price: '6.50', priceCurrency: 'USD',
            priceSpecification: { '@type': 'UnitPriceSpecification', price: '6.50', priceCurrency: 'USD', unitText: 'per square foot' }
          }
        ]
      }
    });

    // ── JSON-LD: FAQPage (AEO) ──
    injectJsonLd('faqpage', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a }
      }))
    });

    // ── JSON-LD: WebSite + SearchAction ──
    injectJsonLd('website', {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: siteName,
      url: siteUrl,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteUrl}/epoxy-estimate?q={search_term_string}`,
        'query-input': 'required name=search_term_string'
      }
    });

    // ── JSON-LD: BreadcrumbList ──
    injectJsonLd('breadcrumb', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
        { '@type': 'ListItem', position: 2, name: 'Free Estimate', item: `${siteUrl}/epoxy-estimate` }
      ]
    });

    // ── JSON-LD: Review ──
    injectJsonLd('reviews', {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Epoxy Garage Floor Coating',
      description: 'Professional one-day epoxy garage floor coating with lifetime warranty',
      brand: { '@type': 'Brand', name: siteName },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        reviewCount: '847'
      },
      review: [
        { '@type': 'Review', reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' }, author: { '@type': 'Person', name: 'Beacher2' }, reviewBody: 'Flawlessly installed with enough tooth to the floor to ensure a relatively no-slip surface without losing the gloss.' },
        { '@type': 'Review', reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' }, author: { '@type': 'Person', name: 'Michael Kohen' }, reviewBody: 'From sales to completion, excellent job on our garage floor. Lifetime warranty gives peace of mind.' },
        { '@type': 'Review', reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' }, author: { '@type': 'Person', name: 'Brian Hunnius' }, reviewBody: 'Excellent work. On time, friendly, great work and the results are amazing.' }
      ]
    });

    // ── JSON-LD: VideoObject ──
    injectJsonLd('video', {
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: 'Professional Epoxy Garage Floor Installation in a Day',
      description: 'Watch our proprietary one-day epoxy garage floor coating installation process from start to finish.',
      thumbnailUrl: `${siteUrl}/epoxy-estimate/og-image.jpg`,
      uploadDate: '2026-01-01',
      contentUrl: 'https://media.base44.com/videos/public/6a6e5a0e8a902b5e240d7633/38585a5f7_Epoxy_Install_Video.mp4'
    });

    // ── JSON-LD: HowTo ──
    injectJsonLd('howto', {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'How to Install an Epoxy Garage Floor',
      description: 'Professional one-day epoxy garage floor coating installation process.',
      totalTime: 'P1D',
      step: [
        { '@type': 'HowToStep', position: 1, name: 'Free Estimate', text: 'Get your free instant estimate using our online calculator and AI visualizer.' },
        { '@type': 'HowToStep', position: 2, name: 'Surface Preparation', text: 'Professional mechanical grinding, crack repair, and oil stain removal to ensure proper adhesion.' },
        { '@type': 'HowToStep', position: 3, name: 'Coating Application', text: 'Primer, base coat, flake broadcast, and clear top coat applied in a single day.' },
        { '@type': 'HowToStep', position: 4, name: 'Cure and Enjoy', text: 'Floor cures in 24 hours for foot traffic and 72 hours for full vehicle traffic. Backed by lifetime warranty.' }
      ]
    });

    return () => {
      document.querySelectorAll('[data-seo-head]').forEach(el => el.remove());
    };
  }, []);

  return null;
}

function setMeta(name, content, isProperty = false) {
  const attr = isProperty ? 'property' : 'name';
  let tag = document.querySelector(`meta[${attr}="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, name);
    tag.setAttribute('data-seo-head', 'true');
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function setLink(rel, href) {
  let tag = document.querySelector(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', rel);
    tag.setAttribute('data-seo-head', 'true');
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', href);
}

function injectJsonLd(id, data) {
  const existing = document.getElementById(`seo-jsonld-${id}`);
  if (existing) existing.remove();
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = `seo-jsonld-${id}`;
  script.setAttribute('data-seo-head', 'true');
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}