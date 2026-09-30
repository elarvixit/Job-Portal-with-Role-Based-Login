import Link from 'next/link';
import { STATUS_LABEL } from '@/lib/rules';
import { APPLICATION_STATUSES, type Application, type Job } from '@/lib/types';

/**
 * Applications per job, as horizontal bars (one series, one colour), most applied-to first.
 * Each bar is a link to that job's applicants; hover or focus shows the breakdown by status.
 */
export default function ApplicationsChart({ jobs, apps }: { jobs: Job[]; apps: Application[] }) {
  const rows = jobs
    .map((job) => {
      const mine = apps.filter((a) => a.jobId === job.id);
      const byStatus = APPLICATION_STATUSES.map((s) => [s, mine.filter((a) => a.status === s).length] as const).filter(([, n]) => n);
      return { job, total: mine.length, byStatus };
    })
    .sort((a, b) => b.total - a.total || a.job.title.localeCompare(b.job.title));
  const max = Math.max(1, ...rows.map((r) => r.total));
  // Whole-number ticks, each placed at its true position on the scale.
  const step = max <= 5 ? 1 : max <= 10 ? 2 : Math.ceil(max / 5);
  const ticks = Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step);

  if (!rows.length) return null;
  return (
    <section className="card" data-reveal aria-labelledby="per-job" style={{ marginTop: 20 }}>
      <div className="card-head">
        <h2 id="per-job">Applications per job</h2>
        <span className="muted" style={{ fontSize: 13 }}>
          Hover a bar for the breakdown · click to review applicants
        </span>
      </div>
      <div className="bars" role="list">
        {rows.map((r, i) => (
          <Link
            key={r.job.id}
            href={`/recruiter/jobs/${r.job.id}/applications`}
            className="bar-row"
            role="listitem"
            aria-label={`${r.job.title}: ${r.total} applications${r.byStatus.length ? ` (${r.byStatus.map(([s, n]) => `${n} ${STATUS_LABEL[s]}`).join(', ')})` : ''}`}
          >
            <span className="name">
              {r.job.title}
              <small>{r.job.status === 'closed' ? 'Closed' : r.job.location}</small>
            </span>
            <span className="bar-track">
              <span className="bar-fill" style={{ width: `${(r.total / max) * 100}%`, ['--d' as string]: i }} />
              <span className="bar-value" style={{ left: `calc(${(r.total / max) * 100}% + 8px)` }}>
                {r.total}
              </span>
              <span className="bar-tip" aria-hidden>
                <strong>{r.job.title}</strong>
                <br />
                {r.total ? r.byStatus.map(([s, n]) => `${STATUS_LABEL[s]} ${n}`).join(' · ') : 'No applications yet'}
              </span>
            </span>
          </Link>
        ))}
        <div className="bar-row axis-row" aria-hidden>
          <span />
          <span className="bars-axis">
            {ticks.map((t) => (
              <span key={t} style={{ left: `${(t / max) * 100}%` }}>
                {t}
              </span>
            ))}
          </span>
        </div>
      </div>
    </section>
  );
}
