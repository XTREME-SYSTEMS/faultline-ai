# Backend Architecture

Supabase owns authentication, tenant data, RLS, storage, workflow records, receipts, and dead letter. Vercel Workflow owns bounded recurring orchestration. AI Gateway routes models. Production adapters remain approval-gated.
