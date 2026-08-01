# Architecture

## Layers
1. **Vite frontend** for public marketing, authentication UI, checkout UI, portal, admin, and preview content.
2. **Supabase** for authentication, tenant data, RLS, storage, audit logs, workflow records, and reports.
3. **Vercel functions and Workflow** for the five-minute orchestrator, bounded jobs, idempotency, retries, receipts, and dead-letter handling.
4. **AI Gateway** for model routing across extraction, analysis, repair planning, drafting, reporting, and validation.
5. **Base44** for editable handoff and optional prototype entities.

## Canonical data flow
Approved source → Evidence → Finding → Human review → Approval → Repair plan → Action → Validation → Report → Monitoring.

## Split-brain prevention
Production records belong in Supabase. Base44 records must be marked as sample unless an adapter documents ownership, conflict resolution, idempotency, retries, deletion behavior, and audit logging.
