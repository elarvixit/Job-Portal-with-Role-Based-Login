import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const RESUME_BUCKET = 'resumes';

let client: SupabaseClient | undefined;

/** Server-side Supabase client using the secret (service-role) key. Never import this in client code. */
export function supabaseAdmin(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see README).',
    );
  }
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
