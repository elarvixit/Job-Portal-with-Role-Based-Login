/** Shown on Vercel until the Supabase settings are correct (local mode can't run there). */
export default function SetupRequired({
  problems,
  environment,
  seenNames,
}: {
  problems: string[];
  environment: string;
  seenNames: string[];
}) {
  const steps = [
    <>
      In Supabase, open <strong>SQL Editor</strong>, paste the contents of <code>supabase/schema.sql</code> and click{' '}
      <strong>Run</strong> (optionally also <code>supabase/seed.sql</code> for demo data).
    </>,
    <>
      In Vercel, open <strong>Settings → Environment Variables</strong> and fix the items listed above. Each variable
      must include the <strong>{environment}</strong> environment — choosing <strong>All Environments</strong> is
      simplest.
    </>,
    <>
      Open <strong>Deployments</strong>, click <strong>⋯</strong> on the latest deployment and choose{' '}
      <strong>Redeploy</strong>. Changes only take effect after a redeploy.
    </>,
  ];

  return (
    <main className="error-page">
      <div className="card card-pad fade-up" style={{ maxWidth: 660, textAlign: 'left' }}>
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
          The site is running, but this <strong>{environment}</strong> deployment has a problem with its settings.
        </p>

        <div className="alert alert-error" style={{ display: 'block', marginBottom: 14 }}>
          <strong>To fix:</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 20, display: 'grid', gap: 6 }}>
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>

        <div className="alert alert-info" style={{ display: 'block', marginBottom: 22, fontWeight: 400 }}>
          <strong>Supabase-related variable names this deployment can see:</strong>{' '}
          {seenNames.length ? (
            seenNames.map((n, i) => (
              <span key={n}>
                {i > 0 && ', '}
                <code>{n}</code>
              </span>
            ))
          ) : (
            <em>none</em>
          )}
          <div style={{ marginTop: 6, fontSize: 13 }}>
            A name you added in Vercel but don’t see here is saved with a typo, or not enabled for the{' '}
            <strong>{environment}</strong> environment.
          </div>
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
