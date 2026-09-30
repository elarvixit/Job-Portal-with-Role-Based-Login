import 'server-only';
import { supabaseUrl } from './env';
import { supabaseAdmin } from './supabase';
import { RESUME_BUCKET, TABLES } from './tables';

// Checks that Supabase is reachable and has the tables and bucket from supabase/schema.sql, so a
// setup mistake shows a clear message instead of a generic "Application error".
// Success is remembered for the life of the server instance, so this costs a few requests per cold start.

let healthy = false;

function host(): string {
  try {
    return new URL(supabaseUrl()).host;
  } catch {
    return supabaseUrl();
  }
}

function explain(what: string, error: { message?: string; code?: string }): string {
  const msg = error.message ?? String(error);
  if (error.code === 'PGRST205' || error.code === '42P01' || /does not exist|could not find the table|schema cache/i.test(msg)) {
    return `${what} was not found in the Supabase project ${host()}. Run supabase/schema.sql in that project's SQL Editor.`;
  }
  if (/invalid api key|jwt|apikey|signature|unauthorized|invalid (compact )?jws/i.test(msg)) {
    return (
      `Supabase rejected SUPABASE_SERVICE_ROLE_KEY. Make sure it is the service_role / secret key from the same ` +
      `project as NEXT_PUBLIC_SUPABASE_URL (${host()}), copied in full.`
    );
  }
  if (/permission denied/i.test(msg)) {
    return `${what}: permission denied. Re-run supabase/schema.sql (it grants access to the service role), and check SUPABASE_SERVICE_ROLE_KEY is the secret key.`;
  }
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|getaddrinfo|network/i.test(msg)) {
    return `Could not reach Supabase at ${host()}. Check NEXT_PUBLIC_SUPABASE_URL is your project URL and the project isn't paused.`;
  }
  return `${what}: ${msg}`;
}

/** Problems found (empty when Supabase is ready). */
export async function supabaseHealth(): Promise<string[]> {
  if (healthy) return [];
  const problems: string[] = [];

  try {
    const db = supabaseAdmin();
    for (const table of Object.values(TABLES)) {
      // A GET (not HEAD) so Supabase includes the error details in the response body.
      const { error } = await db.from(table).select('id').limit(1);
      if (error) {
        const p = explain(`Table "${table}"`, error);
        problems.push(p);
        // A bad key or unreachable project affects every table; one message is enough.
        if (!p.startsWith('Table')) return problems;
      }
    }
    const { error: bucketError } = await db.storage.getBucket(RESUME_BUCKET);
    if (bucketError) problems.push(explain(`Storage bucket "${RESUME_BUCKET}"`, { message: /not found/i.test(bucketError.message) ? 'does not exist' : bucketError.message }));
  } catch (e) {
    problems.push(explain('Supabase', { message: e instanceof Error ? e.message : String(e) }));
  }

  if (!problems.length) healthy = true;
  return problems;
}
