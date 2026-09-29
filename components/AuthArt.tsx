import { initials } from '@/lib/format';

export default function AuthArt({ heading, accent }: { heading: string; accent: string }) {
  return (
    <aside className="auth-art">
      <div>
        <div className="hero-eyebrow" style={{ marginBottom: 28 }}>
          <span className="pulse" /> Trusted by fast-growing teams
        </div>
        <h2>
          {heading} <span className="serif">{accent}</span>
        </h2>
      </div>
      <figure className="auth-quote" style={{ margin: 0 }}>
        <p>
          “We filled three senior roles in under a month. The applicant pipeline is the cleanest I have ever used — no
          spreadsheets, no chasing.”
        </p>
        <figcaption className="who">
          <span className="avatar lg">{initials('Maya Chen')}</span>
          <span>
            <strong>Maya Chen</strong>Head of Talent, Northwind Labs
          </span>
        </figcaption>
      </figure>
    </aside>
  );
}
