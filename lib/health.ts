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
  // Only a missing *table* means schema.sql hasn't run; a missing column is reported as-is below.
  if (error.code === 'PGRST205' || error.code === '42P01' || /relation .* does not exist|could not find the table/i.test(msg)) {
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

export type Health = { stage: 'settings' | 'database'; problems: string[] };

/**
 * Problems found (empty when Supabase is ready). A wrong key or unreachable project is a
 * "settings" problem (fix in Vercel + redeploy); missing tables or bucket is a "database" problem.
 */
export async function supabaseHealth(): Promise<Health> {
  if (healthy) return { stage: 'database', problems: [] };
  const problems: string[] = [];
  const settings = (p: string) => ({ stage: 'settings' as const, problems: [p] });

  try {
    const db = supabaseAdmin();
    // All four checks at once, so a cold start waits for one round trip instead of four.
    // A GET (not HEAD) so Supabase includes the error details in the response body.
    const tables = Object.values(TABLES);
    const [bucket, ...tableResults] = await Promise.all([
      db.storage.getBucket(RESUME_BUCKET),
      // '*' rather than a named column: not every table has an id column (profiles are keyed by user_id).
      ...tables.map((t) => db.from(t).select('*').limit(1)),
    ]);
    for (const [i, { error }] of tableResults.entries()) {
      if (!error) continue;
      const p = explain(`Table "${tables[i]}"`, error);
      // A bad key or unreachable project affects every table; one message is enough.
      if (!p.startsWith('Table')) return settings(p);
      problems.push(p);
    }
    if (bucket.error) {
      const message = /not found/i.test(bucket.error.message) ? 'does not exist' : bucket.error.message;
      problems.push(explain(`Storage bucket "${RESUME_BUCKET}"`, { message }));
    }
  } catch (e) {
    return settings(explain('Supabase', { message: e instanceof Error ? e.message : String(e) }));
  }

  if (!problems.length) healthy = true;
  return { stage: 'database', problems };
}
