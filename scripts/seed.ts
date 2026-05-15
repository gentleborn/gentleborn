/**
 * Seed script. Run with `npm run seed`.
 *
 * Day 1: writes synthetic providers (no PHI). Patient + visit seeding
 * via lib/phi.ts moves here in Day 2 once the live integration path is
 * exercised by tests.
 *
 * NEVER seed real PHI. This script is for development only.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SYNTHETIC_PROVIDERS = [
  {
    npi_type1: '1942229993',
    name: 'Test Provider, CPM',
    taxonomy: '175T00000X',
    address: { line1: '123 Main St', city: 'Richmond', state: 'VA', zip: '23219' },
  },
  {
    npi_type1: '1003872880',
    name: 'Synthetic Doula',
    taxonomy: '374J00000X',
    address: { line1: '456 Oak Ave', city: 'Charlottesville', state: 'VA', zip: '22902' },
  },
];

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Seeding ${SYNTHETIC_PROVIDERS.length} synthetic providers...`);
  for (const provider of SYNTHETIC_PROVIDERS) {
    const { error } = await supabase
      .from('providers')
      .upsert(provider, { onConflict: 'npi_type1' });
    if (error) {
      console.error(`Failed to seed ${provider.npi_type1}: ${error.message}`);
      process.exit(1);
    }
    console.log(`  ✓ ${provider.npi_type1}: ${provider.name}`);
  }

  // Verify.
  const { count, error } = await supabase
    .from('providers')
    .select('*', { count: 'exact', head: true });
  if (error) {
    console.error(`Verify failed: ${error.message}`);
    process.exit(1);
  }
  console.log(`\nDone. providers table has ${count} rows.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
