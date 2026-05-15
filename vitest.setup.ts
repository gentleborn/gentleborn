// Vitest setup. Runs before every test file.
// Loads .env.local so tests get the same env as `next dev`.
import { config } from 'dotenv';
import path from 'node:path';

config({ path: path.resolve(__dirname, '.env.local') });

// Test-only encryption key fallback. If a developer hasn't set
// GENTLEBORN_PHI_KEY in .env.local, use a deterministic dev-only key so
// unit tests still run. This key is NEVER used outside test runs.
if (!process.env.GENTLEBORN_PHI_KEY) {
  process.env.GENTLEBORN_PHI_KEY =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
}
