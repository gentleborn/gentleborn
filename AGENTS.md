<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project context

Load [`../PROJECT_CONTEXT.md`](../PROJECT_CONTEXT.md) (from this app folder: sibling `PROJECT_CONTEXT.md` one level above the `gentleborn/` app directory) for HIPAA rules, payer routing (Stedi primary, Availity conditional per `payer_directory`), AI safety, and provider lifecycle before significant work.

## gstack — workflow (installed globally)

Skills live under `~/.claude/skills/` (slash commands for Claude Code) and `~/.cursor/skills/gstack*` (symlinked from `~/.claude/skills/gstack/.cursor/skills/`). Gentleborn grooming before implementation runs best as:

`/office-hours` → `/plan-ceo-review` → `/plan-eng-review`; then `/autoplan` once scope is frozen; `/review` → `/qa` → `/ship` when coding.

Always read **this repo's context** alongside gstack prompts so HIPAA and payer strategy stay non-negotiable.

## Coding Tasks (spawned sessions)

When spawning a coding-focused agent session:

- **Architecture & planning:** Load gstack, run `/office-hours`, then `/autoplan`, save plan; do **not** implement until plan is explicitly approved for Gentleborn HIPAA scope.
- **Security / compliance:** Load gstack, run `/cso` (adapt output to HIPAA: no PHI in logs, BAAs for vendors touching PHI).
- **Code review:** Load gstack, run `/review`.
- **Browser QA:** Use gstack's `/browse` skill for substantive web retrieval and UI verification; prefer it over miscellaneous ad-hoc browser MCP tooling for consistency with gstack workflows.
- **Ship:** Load gstack, run `/ship` after tests and checklist pass.

Concrete examples:

- `"Load gstack. Run /cso — flag any PHI leakage, missing RLS, or URL/localStorage PHI."`
- `"Load gstack. Run /review on this branch."`
- `"Load gstack. Run /qa https://… for the provider dashboard."`
- `"Load gstack. Run /autoplan for Phase 1 foundation; implement later only after Rahul signs off."`
