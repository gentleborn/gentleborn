# Gentleborn — Project Context

> **For AI assistants and developers working on this codebase.**
> This document is the single source of truth for everything about Gentleborn. Read this before answering any architectural, technical, or strategic questions about the project.

---

## Quick Summary

**Gentleborn** is a HIPAA-compliant telehealth platform that connects mothers with community-based maternal care providers (midwives, doulas, lactation consultants). We handle credentialing, insurance billing, and scheduling on the providers' behalf so they can focus on care, not paperwork.

**Founder & CEO:** Rahul Aakaram
**Legal Entity:** Gentleborn, Inc. (Delaware C-Corp)
**Operating Entity:** Techpods LLC (Florida) — being phased out
**Domain:** gentleborn.com
**EIN:** 42-2407398
**NPI Type 2:** Issued (verify in NPPES dashboard)

**Mission:** Make community-based maternal care economically viable. Mothers find their care team. Providers actually get paid by Medicaid and private insurance. Both sides get the infrastructure that doesn't exist today.

---

## The Founder

Rahul Aakaram is a Lead Software Engineer at Somos Inc with nearly a decade of experience across:
- **Cigna Healthcare** (Senior Full Stack, 3+ years) — knows insurance from the inside
- **PwC** (Senior UI Engineer, Contract) — healthcare consulting
- **Global Payments** (UI Developer) — payment infrastructure
- **Capital One** (UI Developer) — fintech platforms
- **Somos Inc** (Lead, current) — telecom infrastructure for US Toll-Free Number Registry

Production engineering experience in three of the most regulated industries in tech: healthcare, fintech, payments. That's the exact intersection Gentleborn lives in.

Beyond engineering, Rahul came from generational trauma and used Raja Yoga and contemplative practice to rewire inherited patterns. The science of epigenetics and the prenatal-to-3 window led him to maternal care as the highest-leverage point in human society.

**How Rahul works:** Direct, honest, calm. Values presence over speed. Avoids meetings that could be emails. Avoids "ASAP" framing. Returns to one concrete action when overwhelm rises.

**Fears to respect:** Limiting beliefs and overwhelm. When too many priorities pile up, focus drops. Always offer one clear next action, not five.

---

## The Vision

The mother is the highest-leverage point in human society. What happens to her in pregnancy and her child's first three years shapes that child's nervous system, attachment patterns, and emotional baseline for life. Most maternal health companies are optimizing visit volume or chasing OB/GYN efficiency. They're solving the wrong problem.

The right problem is making heart-centered, community-based, continuous care economically viable for the providers who actually deliver it. Solve that, and you don't just improve birth outcomes. You change a generation.

Gentleborn is the platform that makes that economically possible.

---

## The Market Insight

- Medicaid covers 42% of US births (1.6 million annually)
- Combined with commercial insurance, addressable market reaches over 90% of US births
- 30,000+ independent doulas, midwives, and lactation consultants in the US
- Most can't sustain practices because credentialing and billing systems aren't built for them
- 26 US states now reimburse doulas through Medicaid (as of September 2025), up from 14 in 2024
- Six new states added Medicaid doula coverage in 2025 alone

**Pomelo Care employs 200 doulas in a top-down model. We make 30,000 independent doulas billable.**

That single sentence is the core differentiator. We are infrastructure, not a clinic.

---

## Launch Strategy

### Tier 1 Launch States (Priority)
1. **Virginia** — First to launch. Active Medicaid doula coverage, expanded from 8 to 10 visits in 2025
2. **Oregon** — Active doula coverage via Traditional Health Worker (THW) program, $1,505 global bundle
3. **Colorado** — Active doula coverage since July 2024, mandates private insurance parity (SB24-175)

### Tier 2 (Months 6-12)
- Florida (founder's home state, lower reimbursement rates need advocacy)
- New York, Minnesota, New Mexico, New Jersey

### Tier 3 (Year 2)
- Texas, Arkansas, Delaware, Illinois (legislation in progress)

---

## Revenue Model

### Primary Revenue
- **4-6% take rate on every insurance claim processed for providers**
- Providers pay nothing upfront, we earn when they get paid

### Secondary Revenue
- Platform subscriptions for larger practices: $200-1,000/month
- Per-Member-Per-Month (PMPM) contracts with MCOs: $3-5 PMPM
- Value-based care contracts tied to outcomes (reduced C-sections, NICU admissions)

### TAM
- 3 launch states alone: $400M+ annual maternal claim volume
- National TAM exceeds $5B and growing

### Competitive Reference
Same revenue playbook as Pomelo Care and Maven, but bottom-up infrastructure model instead of top-down employed network.

---

## Product Architecture: The Provider Lifecycle

A provider goes through 6 stages from sign-up to receiving payment. Every stage produces data that feeds the next.

### Stage 1: Provider Onboarding (Gentleborn Intake)
Provider signs up. Gentleborn collects personal info, professional credentials, identifiers, malpractice insurance, work history, education, uploaded documents. Output: complete provider profile in Gentleborn database.

### Stage 2: CAQH Credentialing
Provider data flows to CAQH ProView (initially manual via web portal, eventually via API after Participating Organization approval). CAQH verifies and issues 8-digit CAQH Provider ID.

### Stage 3: State Medicaid Enrollment (Virginia PRSS)
CAQH-verified data flows into Virginia PRSS. State Medicaid agency reviews and approves. Output: 12-digit Virginia Medicaid Provider ID (MID).

### Stage 4: MCO Contracting
Provider applies to each Managed Care Organization (5 in Virginia). MCO pulls data from CAQH automatically and signs contract. Output: separate Provider IDs from each MCO.

**Virginia MCOs:**
1. Humana Healthy Horizons (priority — new plan, urgent network needs)
2. Anthem HealthKeepers Plus (largest member base)
3. Aetna Better Health Virginia
4. Sentara Community Plan / Optima
5. UnitedHealthcare Community Plan VA

### Stage 5: EDI Trading Partner Setup (Organization Level)
Gentleborn (not per-provider) enrolls as EDI Trading Partner with Virginia MES. Done ONCE for the whole platform. Output: Trading Partner ID enabling claims submission for all providers.

### Stage 6: Claim Submission and Payment
Mother books visit → Eligibility verified (270/271 via clearinghouse adapter) → Provider conducts visit → Documentation generated (Whisper + Claude SOAP note) → Provider reviews and signs → Claim auto-generated (837P) → Routed by the clearinghouse adapter to DMAS (FFS) or correct MCO, through Stedi by default and Availity only if `payer_directory.channel = 'availity'` for that payer → Payment received via 835 ERA → Funds disbursed to provider via Stripe Connect.

---

## Data Setup Frequency (Critical for Engineering)

### Bucket 1: One-Time Organization Setup
Done ONCE for Gentleborn. Never repeated.
- Delaware C-Corp formation ✅
- EIN (42-2407398) ✅
- NPI Type 2 ✅
- CAQH ProView for Groups account
- Mercury business bank account
- Malpractice insurance
- HIPAA compliance setup
- MES EDI Trading Partner ID
- Stedi organizational account (primary clearinghouse, sandbox + production)
- Availity organizational account (secondary, only if any payer requires it)
- Stripe Connect account

### Bucket 2: One-Time Per Provider
Done ONCE per provider. Recurring only at re-attestation/renewal.
- NPI Type 1
- Provider profile in Gentleborn DB
- Background check (Checkr)
- Document uploads
- CAQH Provider ID (re-attest every 120 days)
- Virginia Medicaid Provider ID (revalidate every 5 years)
- 5 MCO Provider IDs (renewed per contract terms)

### Bucket 3: Every Claim/Visit
Real-time operations, fully automated.
- Eligibility verification (270/271) before each appointment
- Visit documentation (Whisper + Claude)
- Claim generation (837P with all data pulled from DB)
- Routing logic (FFS → DMAS, MCO → specific MCO; Stedi by default, Availity only when payer requires it)
- Submission via the clearinghouse adapter
- 999 acknowledgment, 277CA, 835 ERA tracking
- Payment posting and provider disbursement

**Engineering principle:** Build infrastructure once, leverage forever. Per-claim manual work for both providers and Gentleborn operations should be ZERO.

---

## Technical Stack (Locked Decisions)

### Application Layer
- **Next.js 15** with App Router and TypeScript
- **Server Actions** for mutations
- **Tailwind CSS** for styling
- **shadcn/ui** for component library
- **React 19** with Server Components

### Database & Auth
- **Supabase** (PostgreSQL + Auth + Storage)
- **HIPAA tier** required (request from Supabase support)
- **Row Level Security (RLS)** policies on every table
- **Audit triggers** on all PHI access

### AI Layer
- **Mastra** for agent orchestration (TypeScript-first)
- **Claude (Anthropic)** as primary reasoning engine
  - Chosen for safety alignment in maternal care contexts
- **Whisper (OpenAI)** for visit transcription only
- **Embeddings** (Voyage or OpenAI) for provider matching
- **Validated clinical algorithms** for risk scoring (NICE preeclampsia, Edinburgh PPD, preterm birth) — never raw LLM output

### Healthcare Integrations
- **Stedi** (primary clearinghouse) — API-first eligibility verification (270/271), claim submission (837P), remittance processing (835). Default route for every transaction. Confirmed coverage for Virginia DMAS and all five Virginia MCOs.
- **Availity** (secondary, conditional) — used only for any payer or MCO that requires Availity-routed transactions or provider portal access. Per-payer routing decision lives in the `payer_directory` table.
- **CAQH ProView for Groups** — credentialing data hub (manual via web portal at MVP, API after Participating Organization approval)
- **NPI Registry (NPPES)** — provider verification at intake
- **Twilio** — HIPAA-compliant video and messaging
- **Checkr** — healthcare-specific background checks

App code talks to a vendor-neutral interface at `lib/clearinghouse/`. Stedi and Availity are concrete implementations behind it.

### Operations
- **Stripe Connect** — provider payouts
- **Mercury** — business banking
- **Compliancy Group** — HIPAA documentation and BAAs
- **OIG LEIE + SAM.gov** — monthly exclusion screening

### Hosting & Infrastructure
- **Vercel Pro (HIPAA tier)** — hosting
- **Sentry** — error tracking (NO PHI in error logs)
- **GitHub** — code repository

### Tooling
- **Cursor** — primary IDE with Claude Sonnet 4.5
- **Claude Code** — terminal-based AI for heavy multi-file builds

---

## The 7 AI Agents (Mastra-Orchestrated)

### Agent 1: Provider Onboarding Agent
**Purpose:** Guide new providers through credentialing capture
**Triggers:** New provider signup
**Tools:** Document validation, NPI verification (NPPES API), license lookup, Checkr background check
**Output:** Completed provider profile, verified credentials
**Escalation:** Human review for incomplete or flagged profiles

### Agent 2: Eligibility Verification Agent
**Purpose:** Auto-check insurance before every visit
**Triggers:** 24 hours before each appointment
**Tools:** 270/271 via the clearinghouse adapter (Stedi by default, Availity for payers routed there), database lookup, notification system
**Output:** Verified eligibility, MCO assignment, copay info
**Escalation:** Provider notification if eligibility fails

### Agent 3: Visit Documentation Agent
**Purpose:** Generate SOAP notes from visit transcripts
**Triggers:** Visit completion
**Tools:** Whisper transcription, Claude reasoning, CPT/HCPCS code suggestions
**Output:** Structured SOAP note + suggested billing codes
**Safety:** Provider must review and sign every note before billing

### Agent 4: Between-Visit Support Agent (Mother-Facing)
**Purpose:** Answer mothers' questions 24/7
**Triggers:** Mother messages between visits
**Tools:** Claude with strict safety prompts, validated clinical risk algorithms, provider notification system, knowledge base
**Critical:** Auto-escalates ANY clinical concern to provider, never advises independently
**Boundaries:** Educational and emotional support only, no clinical recommendations

### Agent 5: Claim Generation Agent
**Purpose:** Build and submit claims after each visit
**Triggers:** Provider signs visit documentation
**Tools:** Database access, CPT/HCPCS validator, ICD-10 lookup, routing logic, 837P submission via the clearinghouse adapter
**Output:** Submitted claim with tracking ID
**Safety:** Pre-submission claim scrubbing catches 80% of errors

### Agent 6: Denial Management Agent
**Purpose:** Handle denials and appeals automatically
**Triggers:** 277CA denial received
**Tools:** CARC code interpreter, appeal letter templates, auto-resubmission logic
**Goal:** Collect 95%+ of denied claims
**Escalation:** Complex denials routed to operations team

### Agent 7: Compliance Agent
**Purpose:** Continuous regulatory monitoring
**Triggers:** Monthly schedule + provider events
**Tools:** OIG LEIE check, SAM.gov check, license expiration tracker, CAQH re-attestation reminders
**Output:** Compliance dashboard, automated alerts to providers and operations

---

## Database Schema (Core Tables)

### `providers`
Master record for every provider on the platform.
- `provider_id` (UUID, primary key)
- Identifiers: `caqh_provider_id`, `npi_type1`, `provider_va_medicaid_id`
- Personal: `legal_name`, `date_of_birth`, `ssn_last_four` (encrypted), `home_address`, contact info
- License: `state_license_number`, `state`, `expiration_date`
- Board cert: `board_certification_body` (AMCB/NARM/IBLCE/VCB), number, expiration
- Insurance: `malpractice_carrier`, policy info, coverage, expiration
- CAQH: `caqh_profile_status`, `last_attestation`, `next_attestation_due`, `authorized_orgs` (jsonb)
- Compliance: `oig_screening_date`, `oig_screening_result`, `sam_screening_date`, `sam_screening_result`
- Status: `provider_status` (enum: pending_caqh/caqh_pending/caqh_complete/state_enrolled/fully_active/suspended/terminated)
- Specialty: `gentleborn_taxonomy_code`, `gentleborn_specialty` (CNM/Doula/Lactation/Therapist)

### `provider_documents`
One row per uploaded document with expiration tracking.

### `provider_status_history`
Audit log of all status changes (provider_id, old status, new status, changed by, timestamp).

### `payer_connections`
One row per provider × payer (provider's status with each payer, payer-specific IDs, contract details).

### `patient_eligibility_cache`
Recent eligibility check results (271 responses, expires after 24 hours).

### `visits`
One row per visit (date, provider, mother, services, status: scheduled/completed/billed/paid).

### `claims`
One row per claim submitted (all 837P data, status, payment posting).

### `denials`
One row per claim denial (CARC code, reason, appeal status, resolution).

---

## HIPAA Compliance Rules (Non-Negotiable)

### Critical Rules
- **Never log PHI** in console, error tracking, or analytics
- **All database operations on PHI** must use Supabase RLS policies
- **All file uploads** to encrypted Supabase Storage with signed URLs
- **All third-party services** handling PHI must have signed BAA
- **Audit log every PHI access** (who, what, when)
- **No PHI in URL parameters**, query strings, or browser localStorage
- **Encrypted at rest and in transit** for all PHI
- **Role-based access control** on every endpoint

### Approved Vendors (BAAs Required)
- Supabase (HIPAA tier)
- Vercel (HIPAA tier)
- Anthropic (zero retention mode)
- OpenAI (zero retention mode for Whisper)
- Twilio (HIPAA-eligible products only)
- Stripe (with BAA)
- Compliancy Group
- Checkr

### What Counts as PHI
- Patient names, addresses, phone numbers, emails
- Date of birth (with other identifiers)
- SSN, Medicaid member IDs
- Medical conditions, diagnoses
- Treatment plans, visit notes
- Photos, voice recordings
- Any combination that could identify a patient

---

## Healthcare Domain Rules

### Provider Lifecycle Sequence (Strict Order)
1. NPI Type 1 (provider has this before joining)
2. Gentleborn intake (collect all data)
3. CAQH profile completed
4. Background check passed
5. State Medicaid enrollment (PRSS)
6. MCO contracts signed
7. Provider can bill claims

### Claim Requirements (Every Claim)
- Provider NPI Type 1
- Gentleborn NPI Type 2 (billing entity)
- Provider's Virginia Medicaid Provider ID OR specific MCO Provider ID
- Member's 12-digit Virginia Medicaid Member ID
- Date of service
- CPT/HCPCS code with appropriate modifier
- ICD-10 diagnosis code (Z34.XX for pregnancy, Z39.X for postpartum)
- Place of service (02=telehealth, 11=office, 12=home)
- Charge amount per Virginia fee schedule

### Virginia-Specific Codes
- 59400 — Routine obstetric care global
- 59409 — Vaginal delivery only
- 59430 — Postpartum care only (with HD modifier for doula)
- 99213/99214 — Established patient prenatal visits
- 99203/99205 — New patient visits
- S9443 — Lactation classes
- S9401 — Childbirth education

### Routing Logic
```
IF mother is FFS (Open Card) → Route to Virginia DMAS via clearinghouse adapter → MES
ELSE IF mother is in MCO → Route to specific MCO via clearinghouse adapter using MCO payer ID

The clearinghouse adapter consults `payer_directory.channel` to choose:
  - 'stedi'    → submit through Stedi REST API (default for all six VA payers at MVP)
  - 'availity' → submit through Availity (only when a payer requires it)
```

---

## AI Safety Rules (Critical for Maternal Care)

- **AI never makes clinical recommendations independently**
- **Validated clinical algorithms** (NICE preeclampsia, Edinburgh PPD, preterm birth models) handle all risk scoring
- **Raw LLM output is never used** for clinical assessment
- **Human provider must review and sign** all clinical documentation
- **Mother-facing AI escalates clinical concerns** to provider, never advises
- **AI never diagnoses, treats, or prescribes**
- **Birth support is never AI-mediated** — only human providers handle labor and delivery
- **AI prompts include explicit safety boundaries** and escalation triggers

---

## Coding Conventions

### TypeScript
- Strict mode, no `any` types
- Explicit return types on all exported functions
- Use `unknown` instead of `any` when type is truly unknown
- Discriminated unions for state management

### Architecture
- **Server Actions** for mutations (never expose database directly to client)
- **Server Components** by default (Client Components only when needed)
- All PHI-handling code in server-only modules
- Database queries always parameterized
- Errors caught and logged (never silently swallowed)

### API Responses
Consistent format:
```typescript
{ data: T | null, error: { message: string, code: string } | null }
```

### React
- Functional components with hooks only
- Custom hooks for shared logic
- `cn()` utility for conditional Tailwind classes
- Component files match component name

### File Organization
```
gentleborn/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── (provider)/        # Provider portal
│   ├── (mother)/          # Mother portal
│   ├── (admin)/           # Internal admin
│   └── api/               # API routes
├── agents/                # Mastra agents
├── lib/                   # Shared utilities
├── components/            # React components
├── workflows/             # Mastra workflows
├── types/                 # TypeScript types
└── supabase/              # Migrations and config
```

---

## Current State (Day 0 of MVP Build)

### Completed ✅
- Delaware C-Corp formation (Stripe Atlas)
- EIN: 42-2407398
- NPI Type 2 issued
- Domain gentleborn.com purchased
- YC application submitted (May 4, 2026)
- Cursor + Claude Sonnet 4.5 configured
- Architecture documented

### In Progress ⏳
- Mercury business bank account (in review)
- CAQH ProView for Groups (consultation booked tomorrow 9:30 AM)
- Stripe Atlas finalization

### Up Next (Week 1)
- Initialize Next.js project
- Configure Supabase HIPAA tier
- Build database schema
- Deploy to Vercel
- Begin provider onboarding agent

### Up Next (Weeks 2-4)
- MES EDI Trading Partner application
- Virginia PRSS organization enrollment
- First provider recruitment from community network
- All 7 agents implemented
- First mother and provider beta tests
- First claim submitted

### Up Next (Day 30 = June 5)
- YC results received
- Demo recording showing full visit-to-claim flow in Virginia
- 1 provider, 2 mothers, 1 visit, 1 claim
- 1 MCO contract in active negotiation

---

## Strategic Frameworks

### When Building, Always Ask:
1. Does this serve the mother?
2. Does this serve the provider?
3. Does this make the operating system stronger?
4. Is this HIPAA compliant?
5. Will this scale to 100+ providers?

### When in Doubt About a Decision:
- Choose speed over perfection
- Choose simplicity over flexibility
- Choose proven over novel
- Choose human-readable over clever
- Choose HIPAA-strict over convenient

### When Overwhelm Rises:
- Return to one concrete action
- Trust the rhythm
- The inner work makes the outer work sustainable
- Calm wins over frantic

---

## Communication Conventions

### Tone for AI Interactions
- Direct, honest, human
- No corporate language
- No em dashes (use periods or commas instead)
- No filler words
- Push back when something is wrong
- Bring focus when scope creeps

### When Generating Code
- Comments only when intent isn't obvious
- Function names describe what they do, not how
- Pure functions when possible
- Magic numbers extracted to named constants
- Component files match component name

### When Generating Documentation
- Plain English over jargon
- Concrete examples over abstract descriptions
- Tables for comparisons
- Numbered lists for sequences
- Bullet points only when items are truly parallel

---

## Things That Make Gentleborn Different

### Why We're Not Pomelo Care
- Pomelo employs 200 doulas. We make 30,000 doulas billable.
- Pomelo sells to health plans and employers (B2B2C).
- We sell to independent providers who want their own practice (B2B).
- Pomelo is a clinic with telehealth. We are infrastructure.

### Why We're Not Maven or Carrot
- Maven and Carrot serve employers (corporate wellness benefits).
- We serve Medicaid and uninsured mothers first.
- Our wedge is the underserved, theirs is the well-insured.

### Why We're Not Doula Match or BirthFit
- They are directories. We are infrastructure.
- They charge providers for listings. We charge no upfront fees.
- They don't handle billing. We are the billing platform.

### Why We Win Long-Term
- Network effects: every state we add strengthens our credentialing relationships
- Data moat: providers who join us never want to leave (data is sticky)
- Cost structure: one engineer can do what funded competitors need 50 engineers for
- Mission alignment: providers feel cared for, not exploited

---

## How to Use This File

### For Cursor / AI Assistants
- Read this file first when starting any session about Gentleborn
- Reference specific sections when answering questions
- Update this file as architectural decisions evolve
- Treat it as the source of truth — newer decisions documented here override older code

### For Engineering Hires
- This is your onboarding doc
- Read end-to-end on day 1
- Ask questions about anything unclear
- Update as you learn what's missing

### For Strategic Partners and Investors
- This shows the depth of thinking behind Gentleborn
- It's evidence that we're not just building a product, we're building infrastructure
- The competitive moat lives in the architectural decisions documented here

---

## Update History

- **May 2026:** Initial version created at start of MVP build sprint
- **May 9, 2026:** Clearinghouse architecture switched from Availity-only to Stedi-primary, Availity-secondary. Stedi confirmed as covering DMAS plus all five Virginia MCOs. App code now talks to a vendor-neutral interface at `lib/clearinghouse/`; per-payer routing lives in the `payer_directory` table. Day 30 demo scope locked to Virginia FFS (DMAS) plus Humana Healthy Horizons.
- (Future updates will be logged here as decisions evolve)

---

## A Note for Future Builders

This document was written by Rahul Aakaram, founder of Gentleborn, with the help of Claude. It represents the strategic and architectural foundation of a company that exists to serve mothers and the people who care for them.

When you're working in this codebase, remember: every line of code, every database schema decision, every UI choice ultimately serves a mother in her most vulnerable moments and a provider trying to do meaningful work. Build with that in mind.

The platform that gets shipped in 30 days beats the perfect platform that ships in 90 days. Always.

— Built with care, in service of mothers and the next generation.