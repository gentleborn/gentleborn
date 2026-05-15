# TODOs

Deferred work captured during /plan-eng-review (2026-05-15) and 7-day
timeline compression (2026-05-15).
Branch: claude/objective-keller-077983.

---

## TODO 1: Stedi webhooks + signature verification

**Trigger:** Before 10-provider milestone (post-demo).

**What.** Replace MVP polling with a Stedi webhook endpoint at `/api/stedi/webhook`. HMAC signature verification using Stedi's webhook signing key. Idempotent status writes (dedupe on `tracking_id` + `event_type`).

**Why.** Polling at scale (~100 claims/month) wastes Stedi credits and produces laggy UI. Webhooks give realtime updates and clean cost profile.

**Pros.** Lower per-claim cost, real-time UI, scales cleanly to 1,000+ claims/month.

**Cons.** Public webhook endpoint = surface area. Need secret management for the signing key. Dedupe layer required since Stedi may retry deliveries.

**Context.** Polling was chosen for MVP per /plan-eng-review D3 to keep the demo window tight. Replace post-demo before scaling past ~10 providers or ~50 claims/month.

**Depends on.** Stedi production trading partner approval (need webhook signing key).

---

## TODO 2: Background-job system for status polling

**Trigger:** Decided alongside the webhooks TODO above. May be eliminated by webhooks.

**What.** Background-job runner (Inngest, Trigger.dev, or Supabase Edge Functions on a cron) that polls Stedi for outstanding claims and updates rows.

**Why.** Polling from a Server Action only works while a tab is open. Real status updates need to happen autonomously.

**Pros.** Reliable status updates regardless of UI; foundation for retry, escalation, and reminder jobs.

**Cons.** Adds an infra dependency.

**Context.** If webhooks land first (preceding TODO), background polling may not be needed at all. Revisit together.

**Depends on.** Webhooks decision (preceding TODO).

---

## TODO 3: Provider self-service portal

**Trigger:** After Provider #3 onboards via concierge.

**What.** Provider-facing UI: view CAQH/PRSS status, see their claims and 277CA statuses, download 835 ERAs, view payment history. Currently all admin-only.

**Why.** The white-glove concierge model breaks past ~5 providers. The architecture choice in the May 15 design doc is self-service eventually wins on cost structure.

**Pros.** Unblocks scaling past concierge. Surfaces value to providers. Reduces founder time per provider.

**Cons.** Provider auth flow (separate from admin). Permission model (provider can only see their own data). UI work.

**Context.** Premise 3 in design doc: automation earned after 3+ providers.

**Depends on.** Provider #2 and #3 onboarded. Concierge pattern stabilized.

---

## TODO 4: Supabase Vault migration for column encryption

**Trigger:** Immediately when Supabase HIPAA BAA is countersigned (estimated 2-4 weeks from 2026-05-15).

**What.** Migrate `lib/phi.ts` from the Day 1-7 env-var-key stub to Supabase Vault for column-level encryption of `va_medicaid_member_id`, `patient.name`, `patient.dob`, `visit.soap_note`. Add key-rotation policy doc.

**Why.** The 7-day MVP uses synthetic data and a simple env-var encryption stub so we can build the pipeline before BAA execution. Real PHI cannot enter the system until Vault is the encryption layer.

**Pros.** Closes the HIPAA encryption gap. Supabase BAA covers Vault. Key rotation handled by Vault.

**Cons.** Schema migration on encrypted columns. Test data needs re-encryption. Vault learning curve.

**Context.** Decided in /plan-eng-review D1 (Vault is the chosen approach); deferred in 7-day compression because no real PHI is in the system yet.

**Depends on.** Supabase HIPAA BAA countersigned. No real Medicaid member data may be written to the system before this lands.

---

## TODO 5: Patient consent flow + signed PDF storage

**Trigger:** Before first real Patient #1 is recruited (post-BAA, post-Vault).

**What.** UI to capture patient HIPAA authorization. Store signed PDF in encrypted Supabase Storage. Signed-URL-only access. Reference document ID from `patients.consent_document_id` column.

**Why.** Real PHI requires signed authorization. Synthetic data does not.

**Pros.** HIPAA-compliant patient intake. Auditable trail of consent.

**Cons.** Signature flow (e-signature integration or paper upload). Storage encryption integration.

**Context.** Deferred in 7-day compression. Was Week 0 in 30-day plan.

**Depends on.** Vault migration (TODO 4) for storage encryption.

---

## TODO 6: Provider authentication + provider-scoped RLS policies

**Trigger:** When Provider #2 needs read access to their own claims (post-demo).

**What.** Auth flow for provider users (Supabase Auth with magic link or password). RLS policies that restrict each provider to their own provider_id, visits, and claims rows. New admin vs provider role split in the auth model.

**Why.** Admin-only RLS works for one-user MVP. Falls apart the moment a second human needs access.

**Pros.** Foundation for self-service portal (TODO 3). HIPAA minimum-necessary principle.

**Cons.** Auth flow work. RLS policies become more complex.

**Context.** Deferred in 7-day compression. Single-admin model was acceptable for synthetic-data MVP.

**Depends on.** None code-wise; gates on the moment a second user shows up.
