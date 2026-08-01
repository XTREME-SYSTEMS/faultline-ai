# FaultLine AI Project Manifest

## Identity
- Project: FaultLine AI
- Slug: `faultline-ai`
- Framework: Vite + React + TypeScript
- Core promise: **Expose What’s Broken. Build What Works.**
- Visual contract: white primary background, black interface, restrained metallic gold, editorial serif headings, modern sans-serif UI

## Architecture
- Vite package: canonical frontend handoff
- Supabase: intended production source of truth after project creation and migration approval
- Base44: editable app and prototype layer; sample data only until a documented Supabase adapter is approved
- Vercel: preview first
- Orchestration: Vercel Workflow triggered by a five-minute cron at `/api/cron/orchestrator`
- AI: provider routing through AI Gateway, secrets server-side only
- Outreach: draft-only until explicit approval

## Resource status
- Local Vite package: created
- Recursive audit: included and executed
- GitHub repository: dry-run complete, not executed
- Drive folder: dry-run complete, not executed
- Vercel preview project: dry-run complete, not executed
- Supabase project: not created; organization and cost confirmation required
- Base44 app: not created; package is ready for import or assisted recreation
- Production: blocked pending acceptance, security validation, environment setup, and explicit approval
