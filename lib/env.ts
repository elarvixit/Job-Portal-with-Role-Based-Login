// Environment settings, shared by server code and the (edge) middleware. Server-only values are never
// read in the browser. Alternative names are accepted so the variables created by Supabase's own
// Vercel integration work too.

const clean = (v: string | undefined) => (v ?? '').trim();

export function supabaseUrl(): string {
  return clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function supabaseAnonKey(): string {
  // Literal NEXT_PUBLIC_* references so Next.js can inline them at build time.
  return clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function supabaseServiceKey(): string {
  return clean(process.env.SUPABASE_SERVICE_ROLE_KEY) || clean(process.env.SUPABASE_SECRET_KEY);
}

/**
 * Key that signs login cookies. SESSION_SECRET is optional: without it the key is derived from the
 * Supabase secret key (changing that key then logs everyone out).
 */
export function sessionSecret(): string {
  const explicit = clean(process.env.SESSION_SECRET);
  if (explicit) return explicit;
  const service = supabaseServiceKey();
  return service ? `hireloom-session:${service}` : '';
}

/** Whether a Supabase key is the secret (server) kind or the public (browser) kind. Never returns the key. */
export function keyKind(key: string): 'secret' | 'public' | 'unknown' {
  if (key.startsWith('sb_secret_')) return 'secret';
  if (key.startsWith('sb_publishable_')) return 'public';
  const parts = key.split('.');
  if (parts.length === 3) {
    try {
      const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const role = (JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))) as { role?: string }).role;
      if (role === 'service_role') return 'secret';
      if (role === 'anon') return 'public';
    } catch {
      /* not a JWT */
    }
  }
  return 'unknown';
}

/** Human-readable configuration problems (names and hints only, never values). Empty when all is well. */
export function configProblems(): string[] {
  const problems: string[] = [];
  const url = supabaseUrl();
  const anon = supabaseAnonKey();
  const service = supabaseServiceKey();

  if (!url) problems.push('NEXT_PUBLIC_SUPABASE_URL is missing.');
  else if (!/^https:\/\/[^/\s]+$/.test(url.replace(/\/$/, ''))) {
    problems.push('NEXT_PUBLIC_SUPABASE_URL should look like https://abcdefgh.supabase.co (nothing after .co).');
  }

  if (!anon) problems.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.');
  else if (keyKind(anon) === 'secret') {
    problems.push(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY contains a SECRET key. Use the anon / publishable key here — and rotate the ' +
        'secret key in Supabase, because NEXT_PUBLIC values are sent to browsers.',
    );
  }

  if (!service) problems.push('SUPABASE_SERVICE_ROLE_KEY is missing.');
  else if (keyKind(service) === 'public') {
    problems.push('SUPABASE_SERVICE_ROLE_KEY contains the public anon key. Use the service_role / secret key here.');
  }

  return problems;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseAnonKey() && supabaseServiceKey());
}
