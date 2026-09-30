import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseServiceKey, supabaseUrl } from './env';

export { RESUME_BUCKET } from './tables';
export { configProblems, isSupabaseConfigured } from './env';

let client: SupabaseClient | undefined;

/** Server-side Supabase client using the secret (service-role) key. Never import this in client code. */
export function supabaseAdmin(): SupabaseClient {
  if (client) return client;
  const url = supabaseUrl();
  const key = supabaseServiceKey();
  if (!url || !key) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see README).',
    );
  }
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
