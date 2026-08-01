# Base44 Rollback

1. Create checkpoint **FaultLine AI Foundation** after initial import.
2. Create a new checkpoint before every structural edit.
3. Restore the last accepted checkpoint when acceptance tests fail.
4. Preserve test results and receipts before rollback.
5. Never overwrite the canonical Vite package or source-truth assets.
