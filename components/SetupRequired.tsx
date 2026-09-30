/** Shown on Vercel until every required environment variable is set (local mode can't run there). */
export default function SetupRequired({ missing }: { missing: string[] }) {
  const steps = [
    <>
      In Supabase, open <strong>SQL Editor</strong>, paste the contents of <code>supabase/schema.sql</code> and click{' '}
      <strong>Run</strong> (optionally also <code>supabase/seed.sql</code> for demo data).
    </>,
    <>
      In Vercel, open <strong>Settings → Environment Variables</strong> and add the missing variables listed above, with{' '}
      <strong>All Environments</strong> selected.
    </>,
    <>
      Open <strong>Deployments</strong>, click <strong>⋯</strong> on the latest deployment and choose{' '}
      <strong>Redeploy</strong>. New variables only take effect after a redeploy.
    </>,
  ];

  return (
    <main className="error-page">
      <div className="card card-pad fade-up" style={{ maxWidth: 640, textAlign: 'left' }}>
        <div
          style={{
            color: 'var(--accent)',
            fontWeight: 700,
            fontSize: 12.5,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Hireloom · Setup required
        </div>
        <h1 style={{ fontSize: 28, margin: '10px 0 8px' }}>Connect Supabase to start</h1>
        <p className="muted" style={{ margin: '0 0 18px', maxWidth: 'none' }}>
          The site is running, but this deployment is missing some settings.
        </p>

        <div className="alert alert-error" style={{ display: 'block', marginBottom: 22 }}>
          <strong>Missing in this deployment:</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 20, display: 'grid', gap: 4 }}>
            {missing.map((name) => (
              <li key={name}>
                <code>{name}</code>
              </li>
            ))}
          </ul>
        </div>

        <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 12, color: 'var(--ink-2)' }}>
          {steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </div>
    </main>
  );
}
