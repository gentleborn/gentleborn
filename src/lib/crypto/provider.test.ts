import { describe, it, expect, beforeEach } from 'vitest';
import { getCryptoProvider, __setCryptoProviderForTests } from './provider';

describe('CryptoProvider (env-key AES-256-GCM)', () => {
  beforeEach(() => {
    __setCryptoProviderForTests(undefined);
  });

  it('round-trips a UTF-8 string', async () => {
    const p = getCryptoProvider();
    const ct = await p.encrypt('Victoria the doula');
    const pt = await p.decrypt(ct);
    expect(pt).toBe('Victoria the doula');
  });

  it('produces different ciphertext for the same plaintext (random IV)', async () => {
    const p = getCryptoProvider();
    const a = await p.encrypt('same input');
    const b = await p.encrypt('same input');
    expect(a.equals(b)).toBe(false);
    expect(await p.decrypt(a)).toBe('same input');
    expect(await p.decrypt(b)).toBe('same input');
  });

  it('handles non-ASCII (Unicode names, emoji)', async () => {
    const p = getCryptoProvider();
    const inputs = ['María Sánchez', '宝宝', '👶🏽 Patient #1'];
    for (const s of inputs) {
      const ct = await p.encrypt(s);
      expect(await p.decrypt(ct)).toBe(s);
    }
  });

  it('rejects tampered ciphertext (auth tag mismatch)', async () => {
    const p = getCryptoProvider();
    const ct = await p.encrypt('Medicaid ID 1234567890ABCD');
    // Flip a byte inside the ciphertext body (after version + IV).
    const tampered = Buffer.from(ct);
    tampered[20] ^= 0xff;
    await expect(p.decrypt(tampered)).rejects.toThrow();
  });

  it('rejects truncated ciphertext', async () => {
    const p = getCryptoProvider();
    const ct = await p.encrypt('something');
    const truncated = ct.subarray(0, 10);
    await expect(p.decrypt(truncated)).rejects.toThrow(/too short/);
  });

  it('rejects unknown ciphertext version (forward compatibility)', async () => {
    const p = getCryptoProvider();
    const ct = await p.encrypt('hello');
    const bad = Buffer.from(ct);
    bad[0] = 0x99;
    await expect(p.decrypt(bad)).rejects.toThrow(/version/);
  });

  it('exposes a stable name for audit/debug', () => {
    expect(getCryptoProvider().name).toBe('env-key-aes-256-gcm');
  });
});

describe('CryptoProvider (key validation)', () => {
  const originalKey = process.env.GENTLEBORN_PHI_KEY;
  beforeEach(() => {
    __setCryptoProviderForTests(undefined);
  });

  it('throws when GENTLEBORN_PHI_KEY is missing', async () => {
    delete process.env.GENTLEBORN_PHI_KEY;
    const p = getCryptoProvider();
    await expect(p.encrypt('x')).rejects.toThrow(/GENTLEBORN_PHI_KEY/);
    process.env.GENTLEBORN_PHI_KEY = originalKey;
  });

  it('throws when key is not 32 bytes hex', async () => {
    process.env.GENTLEBORN_PHI_KEY = 'too-short';
    __setCryptoProviderForTests(undefined);
    const p = getCryptoProvider();
    await expect(p.encrypt('x')).rejects.toThrow(/hex chars/);
    process.env.GENTLEBORN_PHI_KEY = originalKey;
  });
});
