# Rollback

## Frontend
Revert to the previous known-good commit and restore the previous Vercel preview deployment.

## Supabase
Every production migration requires a reviewed down-migration or restore procedure. Automated rollback must not destroy production data.

## Base44
Create a checkpoint named `FaultLine AI Foundation` after import and a new checkpoint before every structural edit. Restore the last accepted checkpoint when tests fail.

## Workflows
Disable the workflow or feature flag, preserve the failed receipt, and move exhausted jobs into dead letter with a remediation record.
