/**
 * Supabase service-role client. SERVER ONLY.
 *
 * Day 1-7 RLS posture: all tables enable RLS with default-deny. Only this
 * client (using SUPABASE_SERVICE_ROLE_KEY) bypasses RLS. Never expose to
 * the browser. Use only from Server Components, Server Actions, route
 * handlers, or scripts.
 *
 * Post-auth (TODO 6): admin routes will continue to use this client; new
 * provider-facing routes will use an authenticated user-context client.
 */
import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | undefined;

export function getServiceClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set.');
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set.');
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'public' },
  });
  return cached;
}
