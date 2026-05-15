# Gentleborn

HIPAA-compliant telehealth platform connecting mothers with community-based
maternal care providers. See `PROJECT_CONTEXT.md` for the full picture.

## Quick start

```bash
# 1. Install deps
npm install

# 2. Set up env
cp .env.example .env.local
# Edit .env.local. At minimum, set:
#   SUPABASE_SERVICE_ROLE_KEY (from Supabase dashboard > Settings > API)
#   GENTLEBORN_PHI_KEY        (generate: `openssl rand -hex 32`)
#   STEDI_API_KEY             (from Stedi dashboard; sandbox is fine for Day 1-7)

# 3. Run tests (no live DB needed)
npm test

# 4. Run the dev server
npm run dev
# http://localhost:3000

# 5. Run E2E (requires dev server)
npm run test:e2e
```

## Architecture

```
src/
  app/                    # Next.js App Router
  lib/
    crypto/               # AES-256-GCM (Day 1-7) → Vault (post-BAA)
    db/                   # Supabase service-role client. SERVER ONLY.
    phi.ts                # Single PHI access boundary. Audit-logged.
    nppes/                # NPI lookup (free public API)
    stedi/                # X12 270/837P client
supabase/
  migrations/             # Mirror of live schema (single source of truth)
tests/
  e2e/                    # Playwright
```

### PHI rules (non-negotiable)

- `src/lib/phi.ts` is the ONLY module that reads or writes patient data.
  ESLint enforces this via `no-restricted-imports`.
- Every PHI read/write produces an `audit_log` row.
- PHI columns (`patients.*_ct`, `visits.soap_note_ct`) are AES-256-GCM
  ciphertext on Day 1-7. Post-BAA: swap `src/lib/crypto/provider.ts`
  to Supabase Vault. Column types do not change.

### Day 1-7 (synthetic data, free tier)

- Supabase: `gentleborn-stack` (free tier).
- Vercel: hobby/free.
- Stedi: sandbox.
- No real PHI may enter the system.

### Post-BAA cutover checklist

1. Upgrade Supabase to Team + HIPAA add-on.
2. Replace `EnvKeyProvider` impl in `src/lib/crypto/provider.ts` with
   `VaultProvider`. Existing ciphertext stays valid (version byte 0x01)
   until migrated.
3. Switch Stedi env vars from sandbox to production.
4. Add provider-scoped RLS policies (currently default-deny, service-role
   only).
5. Wire patient consent flow + signed PDF storage.

See `TODOS.md` for the structured deferred items.

## Commands

| Command            | What it does                              |
|--------------------|-------------------------------------------|
| `npm run dev`      | Next.js dev server                        |
| `npm run build`    | Production build                          |
| `npm run lint`     | ESLint (includes PHI boundary rule)       |
| `npm run typecheck`| `tsc --noEmit`                            |
| `npm test`         | Vitest (unit + integration)               |
| `npm run test:e2e` | Playwright (against running dev server)   |

## Live Supabase

| Project         | Ref                       | Region    | Tier        |
|-----------------|---------------------------|-----------|-------------|
| gentleborn-stack| `trglagdeoihtnwmgrxie`    | us-west-2 | Free (Day 1-7) |

Migrations live in `supabase/migrations/` and are applied via the Supabase
MCP tool. Mirror only — never the source of truth for schema state. To
verify: `mcp__supabase__list_tables` against the project ref.
