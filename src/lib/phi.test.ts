/**
 * Unit tests for the PHI module that exercise the encryption + audit
 * contract WITHOUT a live Supabase connection. We mock the service client
 * via vitest module mocking.
 *
 * Integration tests against a real Supabase project go in a separate file
 * (phi.integration.test.ts) gated on a CI env flag.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const insertedAuditRows: Array<Record<string, unknown>> = [];
const insertedPatientRows: Array<Record<string, unknown>> = [];

// Reusable mock that captures what each table.insert(...) receives.
function mockClient() {
  return {
    from(table: string) {
      return {
        insert(row: Record<string, unknown>) {
          if (table === 'audit_log') {
            insertedAuditRows.push(row);
            return Promise.resolve({ error: null });
          }
          if (table === 'patients') {
            insertedPatientRows.push(row);
            const created = {
              id: 'pat-1',
              ...row,
              eligibility_last_checked_at: null,
              eligibility_status: null,
              consent_document_id: null,
              created_at: '2026-05-15T00:00:00Z',
              updated_at: '2026-05-15T00:00:00Z',
            };
            return {
              select: () => ({
                single: () => Promise.resolve({ data: created, error: null }),
              }),
            };
          }
          return Promise.resolve({ error: null });
        },
      };
    },
  };
}

vi.mock('@/lib/db/client', () => ({
  getServiceClient: () => mockClient(),
}));

import { createPatient } from './phi';

describe('createPatient', () => {
  beforeEach(() => {
    insertedAuditRows.length = 0;
    insertedPatientRows.length = 0;
  });

  it('encrypts member ID, name, and DOB before insert', async () => {
    const actor = { id: 'rahul', type: 'admin' as const };
    await createPatient(
      {
        va_medicaid_member_id: '123456789012',
        name: 'Test Patient',
        dob: '1990-01-15',
      },
      actor,
    );

    expect(insertedPatientRows).toHaveLength(1);
    const row = insertedPatientRows[0];
    // Stored values should be Buffers (ciphertext), not the plaintext.
    expect(Buffer.isBuffer(row.va_medicaid_member_id_ct)).toBe(true);
    expect(Buffer.isBuffer(row.name_ct)).toBe(true);
    expect(Buffer.isBuffer(row.dob_ct)).toBe(true);
    const allBytes = Buffer.concat([
      row.va_medicaid_member_id_ct as Buffer,
      row.name_ct as Buffer,
      row.dob_ct as Buffer,
    ]).toString('utf8');
    expect(allBytes).not.toContain('123456789012');
    expect(allBytes).not.toContain('Test Patient');
    expect(allBytes).not.toContain('1990-01-15');
  });

  it('writes exactly one audit_log row per createPatient call', async () => {
    const actor = {
      id: 'rahul',
      type: 'admin' as const,
      ip: '127.0.0.1',
      user_agent: 'vitest',
    };
    await createPatient(
      {
        va_medicaid_member_id: 'AAAA1111',
        name: 'Alice',
        dob: '1985-03-20',
        mco_assignment: 'humana_healthy_horizons',
      },
      actor,
    );
    expect(insertedAuditRows).toHaveLength(1);
    expect(insertedAuditRows[0]).toMatchObject({
      actor_id: 'rahul',
      actor_type: 'admin',
      action: 'write',
      resource_type: 'patient',
      resource_id: 'pat-1',
      ip_address: '127.0.0.1',
      user_agent: 'vitest',
    });
  });

  it('returns hydrated plaintext to the caller (round-trip)', async () => {
    const actor = { id: 'rahul', type: 'admin' as const };
    const patient = await createPatient(
      {
        va_medicaid_member_id: 'MEM-XYZ-001',
        name: 'María Sánchez',
        dob: '1992-07-04',
      },
      actor,
    );
    expect(patient.va_medicaid_member_id).toBe('MEM-XYZ-001');
    expect(patient.name).toBe('María Sánchez');
    expect(patient.dob).toBe('1992-07-04');
    expect(patient.id).toBe('pat-1');
  });
});
