/**
 * PHI access layer. ALL reads and writes of patient health data go through
 * this module. Side effect of every call: a row in `audit_log`.
 *
 * Architectural rules (enforced by ESLint `no-restricted-imports`):
 *   1. Code outside this file MUST NOT import `@/lib/db/client` to query
 *      `patients`, `visits`, or `audit_log`.
 *   2. Code outside this file MUST NOT import `@/lib/crypto/provider`.
 *   3. Server Actions, route handlers, and scripts call exported functions
 *      from THIS file only.
 *
 * Audit-row writes happen via `rpc('write_with_audit', ...)` once that RPC
 * exists. For Day 1 we write the audit row immediately after the data
 * write/read in a second statement; the limitation is that an audit-write
 * failure does not roll back the data write. TODO: wrap in a Postgres
 * function for transactional integrity (post-Day-1 hardening).
 */
import 'server-only';
import { getServiceClient } from '@/lib/db/client';
import { getCryptoProvider } from '@/lib/crypto/provider';
import type {
  Actor,
  AuditAction,
  Patient,
  Visit,
  ProviderRow,
} from '@/lib/db/types';

// ============================================================
// AUDIT
// ============================================================

interface AuditOptions {
  actor: Actor;
  action: AuditAction;
  resource_type: 'patient' | 'visit' | 'claim' | 'provider';
  resource_id?: string;
  metadata?: Record<string, unknown>;
}

async function writeAudit(opts: AuditOptions): Promise<void> {
  const supabase = getServiceClient();
  const { error } = await supabase.from('audit_log').insert({
    actor_id: opts.actor.id,
    actor_type: opts.actor.type,
    action: opts.action,
    resource_type: opts.resource_type,
    resource_id: opts.resource_id ?? null,
    ip_address: opts.actor.ip ?? null,
    user_agent: opts.actor.user_agent ?? null,
    metadata: opts.metadata ?? null,
  });
  if (error) {
    throw new Error(`audit_log write failed: ${error.message}`);
  }
}

// ============================================================
// PATIENTS
// ============================================================

interface PatientCreateInput {
  va_medicaid_member_id: string;
  name: string;
  dob: string;
  mco_assignment?: string;
}

export async function createPatient(
  input: PatientCreateInput,
  actor: Actor,
): Promise<Patient> {
  const crypto = getCryptoProvider();
  const supabase = getServiceClient();

  const [va_medicaid_member_id_ct, name_ct, dob_ct] = await Promise.all([
    crypto.encrypt(input.va_medicaid_member_id),
    crypto.encrypt(input.name),
    crypto.encrypt(input.dob),
  ]);

  const { data, error } = await supabase
    .from('patients')
    .insert({
      va_medicaid_member_id_ct,
      name_ct,
      dob_ct,
      mco_assignment: input.mco_assignment ?? null,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`createPatient failed: ${error?.message ?? 'no data'}`);
  }

  await writeAudit({
    actor,
    action: 'write',
    resource_type: 'patient',
    resource_id: data.id,
  });

  return hydratePatient(data);
}

export async function readPatient(
  id: string,
  actor: Actor,
): Promise<Patient | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    await writeAudit({
      actor,
      action: 'failed_access',
      resource_type: 'patient',
      resource_id: id,
      metadata: { reason: error.message },
    });
    throw new Error(`readPatient failed: ${error.message}`);
  }

  if (!data) {
    await writeAudit({
      actor,
      action: 'failed_access',
      resource_type: 'patient',
      resource_id: id,
      metadata: { reason: 'not_found' },
    });
    return null;
  }

  await writeAudit({
    actor,
    action: 'read',
    resource_type: 'patient',
    resource_id: id,
  });

  return hydratePatient(data);
}

async function hydratePatient(row: PatientRow): Promise<Patient> {
  const crypto = getCryptoProvider();
  const [va_medicaid_member_id, name, dob] = await Promise.all([
    crypto.decrypt(toBuffer(row.va_medicaid_member_id_ct)),
    crypto.decrypt(toBuffer(row.name_ct)),
    crypto.decrypt(toBuffer(row.dob_ct)),
  ]);
  return {
    id: row.id,
    va_medicaid_member_id,
    name,
    dob,
    mco_assignment: row.mco_assignment,
    eligibility_last_checked_at: row.eligibility_last_checked_at,
    eligibility_status: row.eligibility_status,
    consent_document_id: row.consent_document_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// Supabase serializes bytea as a Uint8Array, a base64 string, or (with the
// `\x` hex prefix) a string. Normalize to Buffer.
function toBuffer(v: unknown): Buffer {
  if (Buffer.isBuffer(v)) return v;
  if (v instanceof Uint8Array) return Buffer.from(v);
  if (typeof v === 'string') {
    if (v.startsWith('\\x')) return Buffer.from(v.slice(2), 'hex');
    return Buffer.from(v, 'base64');
  }
  throw new Error(`Unknown bytea representation: ${typeof v}`);
}

interface PatientRow {
  id: string;
  va_medicaid_member_id_ct: unknown;
  name_ct: unknown;
  dob_ct: unknown;
  mco_assignment: string | null;
  eligibility_last_checked_at: string | null;
  eligibility_status: string | null;
  consent_document_id: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// VISITS
// ============================================================

interface VisitCreateInput {
  provider_id: string;
  patient_id: string;
  date_of_service: string;
  cpt_code: string;
  hcpcs_modifier?: string;
  icd10_primary: string;
  place_of_service: string;
  soap_note?: string;
}

export async function createVisit(
  input: VisitCreateInput,
  actor: Actor,
): Promise<Visit> {
  const crypto = getCryptoProvider();
  const supabase = getServiceClient();

  const soap_note_ct = input.soap_note
    ? await crypto.encrypt(input.soap_note)
    : null;

  const { data, error } = await supabase
    .from('visits')
    .insert({
      provider_id: input.provider_id,
      patient_id: input.patient_id,
      date_of_service: input.date_of_service,
      cpt_code: input.cpt_code,
      hcpcs_modifier: input.hcpcs_modifier ?? null,
      icd10_primary: input.icd10_primary,
      place_of_service: input.place_of_service,
      soap_note_ct,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`createVisit failed: ${error?.message ?? 'no data'}`);
  }

  await writeAudit({
    actor,
    action: 'write',
    resource_type: 'visit',
    resource_id: data.id,
  });

  return {
    id: data.id,
    provider_id: data.provider_id,
    patient_id: data.patient_id,
    date_of_service: data.date_of_service,
    cpt_code: data.cpt_code,
    hcpcs_modifier: data.hcpcs_modifier,
    icd10_primary: data.icd10_primary,
    place_of_service: data.place_of_service,
    soap_note: input.soap_note ?? null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

// ============================================================
// PROVIDERS (no PHI but kept here for uniform access pattern; audited
// at lower confidentiality level)
// ============================================================

export async function listProviders(actor: Actor): Promise<ProviderRow[]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`listProviders failed: ${error.message}`);

  await writeAudit({
    actor,
    action: 'read',
    resource_type: 'provider',
  });

  return (data ?? []) as ProviderRow[];
}

export async function createProvider(
  input: Omit<
    ProviderRow,
    'id' | 'created_at' | 'updated_at' | 'caqh_status' | 'prss_status' | 'mco_contracts' | 'va_medicaid_provider_id'
  >,
  actor: Actor,
): Promise<ProviderRow> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('providers')
    .insert(input)
    .select('*')
    .single();
  if (error || !data) {
    throw new Error(`createProvider failed: ${error?.message ?? 'no data'}`);
  }
  await writeAudit({
    actor,
    action: 'write',
    resource_type: 'provider',
    resource_id: data.id,
  });
  return data as ProviderRow;
}
