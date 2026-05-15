-- Gentleborn initial schema (Day 1, MVP).
-- Synthetic-data tier: PHI fields are bytea (AES-GCM ciphertext) using an
-- env-var key via lib/crypto. Post-BAA: swap crypto provider to Supabase
-- Vault. Column types do not change.

-- ============================================================
-- ENUMS
-- ============================================================

create type provider_caqh_status as enum (
  'not_started', 'in_progress', 'submitted', 'verified', 'expired'
);

create type provider_prss_status as enum (
  'not_started', 'submitted', 'pending_review', 'approved', 'rejected'
);

create type claim_submission_status as enum (
  'pending_submit', 'submitted', 'accepted_999', 'accepted_277ca',
  'rejected_999', 'rejected_277ca', 'paid', 'denied'
);

create type audit_action as enum (
  'read', 'write', 'delete', 'submit', 'login', 'logout', 'failed_access'
);

-- ============================================================
-- TABLES
-- ============================================================

create table public.providers (
  id uuid primary key default gen_random_uuid(),
  npi_type1 text not null unique,
  name text not null,
  taxonomy text,
  address jsonb,
  caqh_status provider_caqh_status not null default 'not_started',
  prss_status provider_prss_status not null default 'not_started',
  va_medicaid_provider_id text,
  mco_contracts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  va_medicaid_member_id_ct bytea not null,
  name_ct bytea not null,
  dob_ct bytea not null,
  mco_assignment text,
  eligibility_last_checked_at timestamptz,
  eligibility_status text,
  consent_document_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  date_of_service date not null,
  cpt_code text not null,
  hcpcs_modifier text,
  icd10_primary text not null,
  place_of_service text not null,
  soap_note_ct bytea,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.claims (
  id uuid primary key,
  visit_id uuid not null references public.visits(id) on delete restrict,
  submission_status claim_submission_status not null default 'pending_submit',
  stedi_tracking_id text,
  status_999 text,
  status_277ca text,
  status_835 text,
  submitted_at timestamptz,
  accepted_at timestamptz,
  paid_at timestamptz,
  denial_reasons jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id text not null,
  actor_type text not null,
  action audit_action not null,
  resource_type text not null,
  resource_id uuid,
  ip_address inet,
  user_agent text,
  metadata jsonb,
  occurred_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index providers_caqh_status_idx on public.providers(caqh_status);
create index providers_prss_status_idx on public.providers(prss_status);
create index visits_provider_id_idx on public.visits(provider_id);
create index visits_patient_id_idx on public.visits(patient_id);
create index visits_date_of_service_idx on public.visits(date_of_service desc);
create index claims_visit_id_idx on public.claims(visit_id);
create index claims_submission_status_idx on public.claims(submission_status);
create index claims_submitted_at_idx on public.claims(submitted_at desc);
create index audit_log_resource_idx on public.audit_log(resource_type, resource_id);
create index audit_log_actor_idx on public.audit_log(actor_id);
create index audit_log_occurred_at_idx on public.audit_log(occurred_at desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.providers enable row level security;
alter table public.patients enable row level security;
alter table public.visits enable row level security;
alter table public.claims enable row level security;
alter table public.audit_log enable row level security;

-- ============================================================
-- TRIGGERS
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger providers_updated_at before update on public.providers
  for each row execute function public.set_updated_at();
create trigger patients_updated_at before update on public.patients
  for each row execute function public.set_updated_at();
create trigger visits_updated_at before update on public.visits
  for each row execute function public.set_updated_at();
create trigger claims_updated_at before update on public.claims
  for each row execute function public.set_updated_at();

-- ============================================================
-- COMMENTS
-- ============================================================

comment on table public.providers is 'Doulas/midwives. NPI Type 1 is public (NPPES). No PHI in this table.';
comment on table public.patients is 'Mothers. PHI columns are AES-GCM ciphertext via lib/crypto. Post-BAA swap to Supabase Vault.';
comment on table public.visits is 'Documented visits. SOAP note is PHI (encrypted).';
comment on table public.claims is 'X12 837P submissions. id is X12 control number; pass to Stedi for idempotent retry.';
comment on table public.audit_log is 'HIPAA audit trail. Written by lib/phi.ts in same transaction as PHI access.';
