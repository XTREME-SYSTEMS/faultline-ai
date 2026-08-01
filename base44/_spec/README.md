# FaultLine AI Vite + Base44 Handoff Package

A governed Vite, React, and TypeScript implementation for **FaultLine AI**, an evidence-based business diagnostic, repair, building, and operating system.

## Included

- Full-length white marketing homepage with an abstract fracture-to-network hero
- Marketing pages, authentication shell, test-mode checkout, customer portal, AI assistant, and admin console
- Customer modules for audits, website intelligence, discovery, system mapping, revenue leaks, risk, AI readiness, repair plans, business building, outreach, leads, tasks, projects, reports, monitoring, team, integrations, billing, and settings
- Supabase schema, organization-aware RLS, private storage policies, workflow receipts, and dead-letter tables
- Vercel five-minute cron contract
- Base44 app manifest, entity schema, route map, workflow map, connector matrix, RLS matrix, environment map, tests, and rollback plan
- Recursive static audit script and Playwright acceptance-test scaffold
- Approved source-truth images and the operator master prompt

## Run

```bash
npm install
npm run dev
```

## Validate

```bash
npm run build
npm run audit:recursive
npx playwright install chromium
npx playwright test
```

This package does not apply migrations, configure secrets, send outreach, charge cards, publish content, assign domains, merge to a default branch, or deploy to production.
