# Supabase

This directory mirrors the migrations applied to the live Gentleborn
Supabase project (`gentleborn-stack`, ref `trglagdeoihtnwmgrxie`).

## Day 1-7 (synthetic data)

The schema lives in `migrations/`. Migration 0001 was applied via the
Supabase MCP on 2026-05-15. Tables: `providers`, `patients`, `visits`,
`claims`, `audit_log`. RLS enabled on every table; default deny — only
the service role can read or write. Server-only code in `src/lib/db/`
uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS.

PHI columns (`patients.*_ct`, `visits.soap_note_ct`) are `bytea` ciphertext
produced by `src/lib/crypto/`. Day 1-7 uses AES-256-GCM with an env-var
key (`GENTLEBORN_PHI_KEY`). Post-BAA the crypto provider swaps to
Supabase Vault. Column types do not change.

## Post-BAA (real PHI)

When the Supabase HIPAA BAA is countersigned:

1. Upgrade the project to Team + HIPAA add-on.
2. Replace `src/lib/crypto/provider.ts` impl with the Vault adapter.
3. Run migration to re-encrypt existing rows (if any) under the Vault key.
4. Delete `GENTLEBORN_PHI_KEY` from env (no longer used).
5. Add provider-scoped RLS policies (TODO 6).

## Seeding

`scripts/seed.ts` populates synthetic test fixtures. Run with `npm run seed`.
Never seed real PHI.
