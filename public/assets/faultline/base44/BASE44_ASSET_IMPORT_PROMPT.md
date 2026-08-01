# FaultLine AI Base44 Asset Import Prompt

Use the attached `faultline-ai-base44-brand-pack.zip` as the locked visual asset source for FaultLine AI.

## Mandatory import sequence

1. Unpack the ZIP into `/public/assets/faultline/` or the Base44 equivalent.
2. Read `brand-assets.json`, `tokens/brand-tokens.json`, and `icons/icon-manifest.json`.
3. Use `logos/svg/logo-horizontal-dark-transparent.svg` in the public white navigation and footer.
4. Use `logos/svg/logo-horizontal-light-transparent.svg` on black backgrounds.
5. Use `monogram/svg/monogram-gold-black-transparent.svg` for compact navigation and loading states.
6. Use `favicons/favicon.svg`, `favicons/apple-touch-icon.png`, and the files inside `pwa/` for metadata and installable-app icons.
7. Use `social/og-image-1200x630.png` for Open Graph and social sharing.
8. Use only the supplied SVG icons for application navigation. SVG icons use `currentColor`; control their state through CSS rather than editing the SVG.
9. Apply `tokens/brand-tokens.css` globally.
10. Preserve the approved white, black, and restrained metallic-gold system.

## Locked design rules

- The public homepage is white and marketing-first.
- Do not place a computer, dashboard, laptop, phone, or browser mockup in the hero.
- The customer portal uses a black sidebar and white workspace.
- Gold is an accent, not the page background.
- Do not regenerate or reinterpret the logo.
- Do not use emoji as interface icons.
- Do not substitute third-party icons when a matching supplied icon exists.
- Use SVG first, PNG only where Base44 or a platform requires raster images.

## Verification required

Return a file-by-file asset inventory, screenshot the public navigation, footer, auth page, customer sidebar, favicon, and mobile home screen, and confirm that no missing asset returns a 404.
