/**
 * Database row types.
 *
 * Hand-written for Day 1. Replace with `supabase gen types typescript` output
 * later for full fidelity (every column, generated enums, etc.).
 */

export type ProviderCaqhStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'verified'
  | 'expired';

export type ProviderPrssStatus =
  | 'not_started'
  | 'submitted'
  | 'pending_review'
  | 'approved'
  | 'rejected';

export type ClaimSubmissionStatus =
  | 'pending_submit'
  | 'submitted'
  | 'accepted_999'
  | 'accepted_277ca'
  | 'rejected_999'
  | 'rejected_277ca'
  | 'paid'
  | 'denied';

export type AuditAction =
  | 'read'
  | 'write'
  | 'delete'
  | 'submit'
  | 'login'
  | 'logout'
  | 'failed_access';

export interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface McoContract {
  mco_id: string;
  mco_payer_id: string;
  contract_status: 'pending' | 'active' | 'terminated';
  effective_date?: string;
  ends_at?: string;
}

export interface ProviderRow {
  id: string;
  npi_type1: string;
  name: string;
  taxonomy: string | null;
  address: Address | null;
  caqh_status: ProviderCaqhStatus;
  prss_status: ProviderPrssStatus;
  va_medicaid_provider_id: string | null;
  mco_contracts: McoContract[];
  created_at: string;
  updated_at: string;
}

/** Plaintext patient view returned by lib/phi.ts. */
export interface Patient {
  id: string;
  va_medicaid_member_id: string;
  name: string;
  dob: string;
  mco_assignment: string | null;
  eligibility_last_checked_at: string | null;
  eligibility_status: string | null;
  consent_document_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Visit {
  id: string;
  provider_id: string;
  patient_id: string;
  date_of_service: string;
  cpt_code: string;
  hcpcs_modifier: string | null;
  icd10_primary: string;
  place_of_service: string;
  soap_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClaimRow {
  id: string;
  visit_id: string;
  submission_status: ClaimSubmissionStatus;
  stedi_tracking_id: string | null;
  status_999: string | null;
  status_277ca: string | null;
  status_835: string | null;
  submitted_at: string | null;
  accepted_at: string | null;
  paid_at: string | null;
  denial_reasons: unknown | null;
  created_at: string;
  updated_at: string;
}

export interface Actor {
  id: string;
  type: 'admin' | 'provider' | 'system' | 'mother';
  ip?: string;
  user_agent?: string;
}
