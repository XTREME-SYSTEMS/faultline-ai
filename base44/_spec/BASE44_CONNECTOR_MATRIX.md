# Base44 Connector Matrix

| Connector | Purpose | State |
|---|---|---|
| Supabase | Auth, production data, RLS, storage | Required, not configured |
| Vercel | Preview, cron, workflow | Dry-run prepared |
| AI Gateway | Model routing | Required, environment needed |
| Stripe | Test subscriptions and billing portal | Optional for preview |
| Google Drive | Source truth and delivery | Dry-run prepared |
| Google Chat | Internal notifications | Optional |
| GitHub | Source, branch, PR, CI | Dry-run prepared |
| Base44 | Editable application handoff | Target |
