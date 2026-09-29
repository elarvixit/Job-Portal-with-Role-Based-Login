/** Shown instead of the app until the Supabase environment variables are set. */
export default function SetupRequired() {
  const steps = [
    <>
      Create a free project at{' '}
      <a className="link" href="https://supabase.com/dashboard" target="_blank" rel="noopener">
        supabase.com/dashboard
      </a>
      .
    </>,
    <>
      In the project, open <strong>SQL Editor</strong>, paste the contents of <code>supabase/schema.sql</code> and
      click <strong>Run</strong>.
    </>,
    <>
      From <strong>Project Settings → API Keys</strong>, fill in <code>NEXT_PUBLIC_SUPABASE_URL</code>,{' '}
      <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code> in{' '}
      <code>.env.local</code> (locally) or in your Vercel project’s Environment Variables.
    </>,
    <>
      Run <code>npm run db:seed</code> to load the demo data, then restart the server.
    </>,
  ];

  return (
    <main className="error-page">
      <div className="card card-pad fade-up" style={{ maxWidth: 620, textAlign: 'left' }}>
        <div className="eyebrow" style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 12.5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Hireloom · Setup required
        </div>
        <h1 style={{ fontSize: 28, margin: '10px 0 8px' }}>Connect Supabase to start</h1>
        <p className="muted" style={{ margin: '0 0 22px', maxWidth: 'none' }}>
          The site is running, but it stores its data in Supabase and the connection details haven’t been set yet.
        </p>
        <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 12, color: 'var(--ink-2)' }}>
          {steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </div>
    </main>
  );
}
