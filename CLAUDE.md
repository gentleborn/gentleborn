# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gentleborn is a HIPAA-compliant telehealth platform connecting mothers with community-based maternal care providers (midwives, doulas, lactation consultants). It handles credentialing, insurance billing, and scheduling on providers' behalf. Read `gentleborn/PROJECT_CONTEXT.md` for full context before working on any feature.

## Commands

All commands run from inside the `gentleborn/` subdirectory:

```bash
cd gentleborn
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build
npm run lint     # ESLint
```

No test suite yet (Day 0 of MVP build).

## Stack

- **Next.js 16** with App Router and TypeScript strict mode (this is NOT Next.js 13/14/15 -- APIs differ; read `node_modules/next/dist/docs/` before writing Next.js-specific code)
- **React 19** with Server Components by default
- **Supabase** (PostgreSQL + Auth + Storage, HIPAA tier) via `@supabase/ssr` and `@supabase/supabase-js`
- **Mastra** (`@mastra/core`, `@mastra/engine`) for AI agent orchestration
- **Anthropic Claude** (`@anthropic-ai/sdk`) as primary reasoning engine
- **Tailwind CSS v4** + shadcn/ui (shadcn not yet installed)
- **Vercel Pro (HIPAA tier)** for hosting

### Healthcare integrations

- **Stedi** (primary clearinghouse) -- API-first eligibility verification (270/271), claim submission (837P), remittance processing (835). Default route for every transaction.
- **Availity** (secondary, conditional) -- only invoked for any payer or MCO that specifically requires Availity-routed transactions or provider portal access. Per-payer routing decision lives in the `payer_directory` table.
- **CAQH ProView for Groups** -- credentialing data hub (manual via web portal at MVP; API after Participating Organization approval).
- **NPI Registry (NPPES)** -- provider verification at intake.

App code talks to a vendor-neutral interface at `lib/clearinghouse/`. Stedi and Availity are concrete implementations behind it.

## Architecture

The app lives in `gentleborn/src/app/` using Next.js App Router. Planned route groups (not yet built):

```
src/app/
  (auth)/       # Authentication
  (provider)/   # Provider portal
  (mother)/     # Mother portal
  (admin)/      # Internal admin
  api/          # API routes
```

Additional top-level directories to be created alongside `src/`:
- `agents/` -- Mastra agent implementations (7 agents: Provider Onboarding, Eligibility Verification, Visit Documentation, Between-Visit Support, Claim Generation, Denial Management, Compliance)
- `lib/` -- Server-only utilities and third-party integrations (`lib/clearinghouse/` for Stedi/Availity, Twilio, Stripe Connect, Checkr)
- `components/` -- React components (`ui/` for shadcn)
- `workflows/` -- Mastra workflows
- `types/` -- TypeScript types
- `supabase/` -- Migrations and config

## Coding Conventions

- TypeScript strict mode, no `any` (use `unknown` when type is truly unknown)
- Explicit return types on all exported functions
- Server Actions for all mutations -- never expose database directly to client
- Server Components by default; Client Components only when interaction requires it
- All PHI-handling code must be in server-only modules
- Database queries always parameterized
- API response format: `{ data: T | null, error: { message: string, code: string } | null }`
- `cn()` for conditional Tailwind classes
- Functional components with hooks only

## HIPAA Rules (Non-Negotiable)

- Never log PHI in console, Sentry, or analytics
- All PHI database operations require Supabase Row Level Security (RLS) policies
- File uploads use encrypted Supabase Storage with signed URLs only
- No PHI in URL params, query strings, or `localStorage`
- Audit log every PHI access (who, what, when)
- All third-party services touching PHI must have a signed BAA (Supabase, Vercel, Anthropic zero-retention, OpenAI zero-retention, Twilio, Stripe, Checkr)

## AI Safety Rules

- AI agents never make clinical recommendations independently
- Risk scoring uses validated algorithms only (NICE preeclampsia, Edinburgh PPD, preterm birth) -- never raw LLM output
- Every clinical document requires human provider review and signature before billing
- Mother-facing agent escalates any clinical concern to the provider; it never advises
- Birth support is never AI-mediated

## Healthcare Domain

Provider lifecycle order (strict): NPI Type 1 already held by provider → Gentleborn intake → CAQH credentialing → background check → Virginia PRSS enrollment → MCO contracts → billing active.

Every claim requires: Provider NPI Type 1, Gentleborn NPI Type 2, Virginia Medicaid Provider ID (or MCO Provider ID), 12-digit Virginia Medicaid Member ID, date of service, CPT/HCPCS + modifier, ICD-10, place of service code (02 telehealth, 11 office, 12 home).

Claim routing: FFS (Open Card) mothers → Virginia DMAS via the clearinghouse adapter. MCO members → specific MCO via the clearinghouse adapter using the MCO's payer ID. The adapter consults `payer_directory.channel` to decide whether the transaction goes through Stedi (default) or Availity (fallback). Stedi covers DMAS plus all five Virginia MCOs (Humana Healthy Horizons, Anthem HealthKeepers Plus, Aetna Better Health VA, Sentara Community Plan, UnitedHealthcare Community Plan VA), so Availity is not on the critical path at MVP.

## gstack (global workflow toolkit)

[Garry Tan's gstack](https://github.com/garrytan/gstack) is installed at `~/.claude/skills/gstack` (`./setup` after clone). Bun is required (installed to `~/.bun/bin` if missing). **Cursor integration:** current gstack `./setup --host cursor` was removed from the installer; Cursor agent skills were generated with `cd ~/.claude/skills/gstack && ~/.bun/bin/bun run gen:skill-docs --host cursor`, then symlinked into `~/.cursor/skills/`.

When working in Claude Code / Cursor Agent with gstack conventions:

### Web browsing

Use gstack skill **`browse`** (`/browse` in Claude Code sessions that load gstack slash commands). Prefer consistent gstack browser flows over miscellaneous one-off MCP browser integrations when doing substantive browsing or scripted checks.

### Available gstack skills / commands

`/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/design-shotgun`, `/design-html`, `/review`, `/ship`, `/land-and-deploy`, `/canary`, `/benchmark`, `/browse`, `/connect-chrome`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/setup-deploy`, `/setup-gbrain`, `/retro`, `/investigate`, `/document-release`, `/codex`, `/cso`, `/autoplan`, `/plan-devex-review`, `/devex-review`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`, `/learn` (subset may appear per host; Cursor loads generated `gstack-*` skills from `~/.cursor/skills`).

### Grooming before implementation

1. Anchor every session with **`gentleborn/PROJECT_CONTEXT.md`** (HIPAA, payer routing, AI safety).
2. Run **`/office-hours`** → **`/plan-ceo-review`** → **`/plan-eng-review`** to pressure-test scope.
3. Use **`/autoplan`** to produce an implementation plan; **do not** treat raw LLM output as clinical guidance (per Gentleborn AI safety rules).
4. **`/review`**, **`/qa`**, **`/ship`** as you move from plan to code.

### Upgrade gstack later

From `~/.claude/skills/gstack`: `./gstack-upgrade` or `git pull` then `./setup`.

### Team mode (optional)

To pin gstack auto-update behavior for collaborators: `(cd ~/.claude/skills/gstack && ./setup --team)` then `$HOME/.claude/skills/gstack/bin/gstack-team-init required` from the repo; commit `.claude/` and `CLAUDE.md` updates (see upstream README).

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
