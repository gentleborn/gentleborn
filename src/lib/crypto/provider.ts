/**
 * Encryption provider interface.
 *
 * Day 1-7: implemented by `envKeyProvider` (AES-256-GCM with env-var key).
 * Post-BAA: replace with `vaultProvider` (Supabase Vault). The interface
 * does not change; callers in `lib/phi.ts` are unaffected.
 *
 * Ciphertext format produced by Day-1 provider (so we can detect/migrate
 * later):
 *
 *   [1 byte version=0x01]
 *   [12 bytes IV]
 *   [N bytes ciphertext+auth_tag]
 *
 * Vault impl will use version=0x02 and Vault's native format. Migrations
 * branch on version byte.
 */
export interface CryptoProvider {
  encrypt(plaintext: string): Promise<Buffer>;
  decrypt(ciphertext: Buffer): Promise<string>;
  /** Stable identifier of the provider implementation for audit/debug. */
  readonly name: string;
}

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const VERSION_ENV_KEY = 0x01;
const IV_LENGTH = 12;
const KEY_LENGTH = 32; // 256 bits

function loadKey(): Buffer {
  const hex = process.env.GENTLEBORN_PHI_KEY;
  if (!hex) {
    throw new Error(
      'GENTLEBORN_PHI_KEY is not set. Run `openssl rand -hex 32` and add it to .env.local.',
    );
  }
  if (hex.length !== KEY_LENGTH * 2) {
    throw new Error(
      `GENTLEBORN_PHI_KEY must be ${KEY_LENGTH * 2} hex chars (${KEY_LENGTH} bytes); got ${hex.length}.`,
    );
  }
  const key = Buffer.from(hex, 'hex');
  if (key.length !== KEY_LENGTH) {
    throw new Error('GENTLEBORN_PHI_KEY is not valid hex.');
  }
  return key;
}

class EnvKeyProvider implements CryptoProvider {
  readonly name = 'env-key-aes-256-gcm';

  async encrypt(plaintext: string): Promise<Buffer> {
    const key = loadKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([Buffer.from([VERSION_ENV_KEY]), iv, ct, tag]);
  }

  async decrypt(buf: Buffer): Promise<string> {
    if (buf.length < 1 + IV_LENGTH + 16) {
      throw new Error('Ciphertext too short to be valid.');
    }
    const version = buf[0];
    if (version !== VERSION_ENV_KEY) {
      throw new Error(
        `Unsupported ciphertext version 0x${version.toString(16).padStart(2, '0')}. ` +
          'Post-BAA Vault decrypt path not yet wired.',
      );
    }
    const iv = buf.subarray(1, 1 + IV_LENGTH);
    const ctAndTag = buf.subarray(1 + IV_LENGTH);
    const tag = ctAndTag.subarray(ctAndTag.length - 16);
    const ct = ctAndTag.subarray(0, ctAndTag.length - 16);
    const key = loadKey();
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    return pt.toString('utf8');
  }
}

let cached: CryptoProvider | undefined;

export function getCryptoProvider(): CryptoProvider {
  if (!cached) {
    cached = new EnvKeyProvider();
  }
  return cached;
}

// Test-only escape hatch to swap the provider (e.g., for a mock).
export function __setCryptoProviderForTests(p: CryptoProvider | undefined): void {
  cached = p;
}
